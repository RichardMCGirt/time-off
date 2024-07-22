document.addEventListener("DOMContentLoaded", async function() {
    console.log('DOM fully loaded and parsed');

    initializeTimeDropdowns();
    initializeKeyboardNavigation();

    const apiKey = 'pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c';
    const baseId = 'app9gw2qxhGCmtJvW';
    const tableId = 'tbljmLpqXScwhiWTt';

    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    const userEmailElement = document.getElementById('user-email');

    if (userEmailElement) {
        userEmailElement.textContent = userEmail;
        userEmailElement.classList.add('clickable');
    }

    document.getElementById('logout-button').addEventListener('click', function(event) {
        event.preventDefault();
        localStorage.removeItem('userEmail');
        window.location.href = 'index.html';
    });

    if (userEmailElement) {
        userEmailElement.addEventListener('click', function() {
            window.location.href = 'supervisor.html';
        });
    }

    const elements = {
        ptoHoursElement: document.getElementById('pto-hours'),
        holidayHoursInput: document.getElementById('Holiday-hours'),
        weekEndingInput: document.getElementById('week-ending'),
        timeEntryForm: document.getElementById('time-entry-form'),
        ptoTimeSpan: document.getElementById('pto-time'),
        personalTimeSpan: document.getElementById('personal-time'),
        holidayTimeSpan: document.getElementById('Holiday-hours'),
        totalTimeWorkedSpan: document.getElementById('total-time-worked'),
        totalTimeWithPtoSpan: document.getElementById('total-time-with-pto-value'),
        ptoValidationMessage: document.getElementById('pto-validation-message'),
        remainingPtoHoursElement: document.getElementById('remaining-pto-hours'),
        remainingPersonalHoursElement: document.getElementById('remaining-personal-hours'),
        logoutButton: document.getElementById('logout-button'),
        userEmailElement: document.getElementById('user-email'),
        ptoHoursDisplay: document.getElementById('pto-hours-display'),
        personalTimeDisplay: document.getElementById('personal-time-display'),
        resetButton: document.getElementById('reset-button'),
        submitButton: document.getElementById('submit-button'),
    };

    let availablePTOHours = 0;
    let availablePersonalHours = 0;

    elements.ptoHoursDisplay.textContent = 'Loading...';
    elements.personalTimeDisplay.textContent = 'Loading...';

    if (userEmail) {
        elements.userEmailElement.textContent = userEmail;
        console.log('User email set in the UI');
    } else {
        console.log('No user email found, redirecting to index.html');
        window.location.href = 'index.html';
    }

    elements.holidayHoursInput.addEventListener('input', handleHolidayHoursChange);
    elements.weekEndingInput.addEventListener('focus', () => elements.weekEndingInput.showPicker());
    elements.weekEndingInput.addEventListener('change', handleWeekEndingChange);
    elements.timeEntryForm.addEventListener('input', debounce(calculateTotalTimeWorked, 300));
    elements.logoutButton.addEventListener('click', handleLogout);
    elements.resetButton.addEventListener('click', resetForm);

    const timeInputs = document.querySelectorAll('select.time-dropdown');
    timeInputs.forEach(input => {
        input.addEventListener('focus', () => input.showPicker());
        input.addEventListener('keydown', handleArrowKeys);
    });

    await fetchPtoHours();
    await fetchPersonalTime();

    function handleHolidayHoursChange() {
        console.log('Handling Holiday hours change...');
        calculateTotalTimeWorked();
    }

    async function handleWeekEndingChange() {
        console.log('Handling week-ending date change...');
        const selectedDate = new Date(elements.weekEndingInput.value);
        adjustToWednesday(selectedDate);
        elements.weekEndingInput.value = selectedDate.toISOString().split('T')[0];
        console.log('Adjusted week-ending date:', selectedDate);

        const date7 = new Date(selectedDate);
        date7.setDate(selectedDate.getDate() + 6);
        elements.timeEntryForm.elements['date7'].value = date7.toISOString().split('T')[0];
        populateWeekDates(selectedDate);
    }

    function adjustToWednesday(date) {
        const dayOfWeek = date.getDay();
        const offset = (2 - dayOfWeek + 7) % 7;
        date.setDate(date.getDate() + offset);
    }

    function populateWeekDates(weekEndingDate) {
        const daysOfWeek = ['date1', 'date2', 'date3', 'date4', 'date5', 'date6', 'date7'];
        daysOfWeek.forEach((day, index) => {
            const currentDate = new Date(weekEndingDate);
            currentDate.setDate(currentDate.getDate() - (6 - index));
            const inputField = elements.timeEntryForm.elements[day];
            inputField.value = currentDate.toISOString().split('T')[0];
            console.log(`Set date for ${day}:`, currentDate);
            const checkboxId = `did-not-work-${index + 1}`;
            let checkbox = document.getElementById(checkboxId);
            if (!checkbox) {
                checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = checkboxId;
                checkbox.name = `did_not_work${index + 1}`;
                checkbox.addEventListener('change', (event) => toggleWorkInputs(index, event.target.checked));
                const cell = document.createElement('td');
                cell.appendChild(checkbox);
                inputField.parentElement.parentElement.appendChild(cell);
                console.log('Added checkbox for', day);
            }
        });
    }

    window.toggleWorkInputs = function(index, didNotWork) {
        console.log(`Toggling work inputs for index ${index}:`, didNotWork);
        const timeFields = ['start_time', 'lunch_start', 'lunch_end', 'end_time', 'Additional_Time_In', 'Additional_Time_Out'];
        timeFields.forEach(field => {
            const input = elements.timeEntryForm.elements[`${field}${index + 1}`];
            if (didNotWork && !input.dataset.originalValue) {
                input.dataset.originalValue = input.value;
            }
            input.disabled = didNotWork;
            input.value = didNotWork ? '--:--' : input.dataset.originalValue || '';
            if (!didNotWork) {
                delete input.dataset.originalValue;
            }
        });
        document.getElementById(`hours-worked-today${index + 1}`).textContent = didNotWork ? '0.00' : document.getElementById(`hours-worked-today${index + 1}`).textContent;
        if (!didNotWork) {
            calculateTotalTimeWorked();
        }
    };

    function calculateTotalTimeWorked() {
        console.log('Calculating total time worked...');
        let totalHoursWorked = 0;
        const daysOfWeek = ['date1', 'date2', 'date3', 'date4', 'date5', 'date6', 'date7'];
        daysOfWeek.forEach((day, index) => {
            const dateInput = elements.timeEntryForm.elements[day];
            const timeFields = ['start_time', 'lunch_start', 'lunch_end', 'end_time', 'Additional_Time_In', 'Additional_Time_Out'].map(field => elements.timeEntryForm.elements[`${field}${index + 1}`]);
            const hoursWorkedSpan = document.getElementById(`hours-worked-today${index + 1}`);
            const hoursWorked = calculateDailyHoursWorked(dateInput, ...timeFields);
            totalHoursWorked += hoursWorked;
            hoursWorkedSpan.textContent = hoursWorked.toFixed(2);
        });
        const ptoTime = parseFloat(elements.ptoTimeSpan.textContent) || 0;
        const personalTime = parseFloat(elements.personalTimeSpan.textContent) || 0;
        const holidayHours = parseFloat(elements.holidayTimeSpan.textContent) || 0;
        const totalHoursWithPto = totalHoursWorked + ptoTime + personalTime + holidayHours;
        elements.totalTimeWorkedSpan.textContent = totalHoursWorked.toFixed(2);
        elements.totalTimeWithPtoSpan.textContent = totalHoursWithPto.toFixed(2);
        console.log('Total hours worked:', totalHoursWorked);
        console.log('Total hours with PTO:', totalHoursWithPto);
        validatePtoHours(totalHoursWithPto);
        validatePersonalHours(totalHoursWithPto);
        updateTotalPtoAndHolidayHours();
    }

    function calculateDailyHoursWorked(dateInput, startTimeInput, lunchStartInput, lunchEndInput, endTimeInput, additionalTimeInInput, additionalTimeOutInput) {
        const startDate = new Date(dateInput.value);
        const times = [startTimeInput, lunchStartInput, lunchEndInput, endTimeInput, additionalTimeInInput, additionalTimeOutInput].map(input => parseTime(input.value));
        const [startTime, lunchStart, lunchEnd, endTime, additionalTimeIn, additionalTimeOut] = times;
        let hoursWorked = calculateHoursWorked(startDate, startTime, lunchStart, lunchEnd, endTime, additionalTimeIn, additionalTimeOut);
        return roundToClosestQuarterHour(hoursWorked);
    }

    function parseTime(timeString) {
        if (!timeString || timeString === "--:--") return null;
        const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
        return { hours, minutes };
    }

    function calculateHoursWorked(startDate, startTime, lunchStart, lunchEnd, endTime, additionalTimeIn, additionalTimeOut) {
        if (!startTime || !endTime) return 0;
        const startDateTime = new Date(startDate);
        startDateTime.setHours(startTime.hours, startTime.minutes);
        const endDateTime = new Date(startDate);
        endDateTime.setHours(endTime.hours, endTime.minutes);
        let totalHoursWorked = (endDateTime - startDateTime) / (1000 * 60 * 60);
        if (lunchStart && lunchEnd) {
            const lunchStartDateTime = new Date(startDate);
            lunchStartDateTime.setHours(lunchStart.hours, lunchStart.minutes);
            const lunchEndDateTime = new Date(startDate);
            lunchEndDateTime.setHours(lunchEnd.hours, lunchEnd.minutes);
            totalHoursWorked -= (lunchEndDateTime - lunchStartDateTime) / (1000 * 60 * 60);
        }
        if (additionalTimeIn && additionalTimeOut) {
            const additionalTimeInDateTime = new Date(startDate);
            additionalTimeInDateTime.setHours(additionalTimeIn.hours, additionalTimeIn.minutes);
            const additionalTimeOutDateTime = new Date(startDate);
            additionalTimeOutDateTime.setHours(additionalTimeOut.hours, additionalTimeOut.minutes);
            totalHoursWorked += (additionalTimeOutDateTime - additionalTimeInDateTime) / (1000 * 60 * 60);
        }
        return Math.max(0, totalHoursWorked);
    }

    function roundToClosestQuarterHour(hours) {
        return Math.round(hours * 4) / 4;
    }

    function validatePtoHours(totalHoursWithPto) {
        const remainingPTO = Math.max(0, availablePTOHours - parseFloat(elements.ptoTimeSpan.textContent || 0));
        const ptoUsed = totalHoursWithPto - parseFloat(elements.totalTimeWorkedSpan.textContent);
        console.log('PTO used:', ptoUsed);

        if (ptoUsed > availablePTOHours) {
            elements.ptoValidationMessage.textContent = 'PTO time used cannot exceed available PTO hours';
            elements.ptoValidationMessage.style.color = 'red';
            disablePtoInputs();
        } else if (totalHoursWithPto > 40 && parseFloat(elements.ptoTimeSpan.textContent) > 0) {
            elements.ptoValidationMessage.textContent = 'Total hours including PTO cannot exceed 40 hours';
            elements.ptoValidationMessage.style.color = 'red';
        } else {
            elements.ptoValidationMessage.textContent = '';
        }
    }

    function validatePersonalHours(totalHoursWithPto) {
        const remainingPersonal = Math.max(0, availablePersonalHours - parseFloat(elements.personalTimeSpan.textContent || 0));
        const personalUsed = totalHoursWithPto - parseFloat(elements.totalTimeWorkedSpan.textContent);
        console.log('Personal used:', personalUsed);

        if (personalUsed > availablePersonalHours) {
            elements.ptoValidationMessage.textContent = 'Personal time used cannot exceed available Personal hours';
            elements.ptoValidationMessage.style.color = 'red';
            disablePersonalInputs();
        } else if (totalHoursWithPto > 40 && parseFloat(elements.personalTimeSpan.textContent) > 0) {
            elements.ptoValidationMessage.textContent = 'Total hours including Personal time cannot exceed 40 hours';
            elements.ptoValidationMessage.style.color = 'red';
        } else {
            elements.ptoValidationMessage.textContent = '';
        }
    }

    function updateTotalPtoAndHolidayHours() {
        let totalPtoHours = 0;
        let totalHolidayHours = 0;
        let totalPersonalHours = 0;

        const ptoInputs = document.querySelectorAll('input[name^="PTO_hours"]');
        ptoInputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            totalPtoHours += value;
        });

        const holidayInputs = document.querySelectorAll('input[name^="Holiday_hours"]');
        holidayInputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            totalHolidayHours += value;
        });

        const personalInputs = document.querySelectorAll('input[name^="Personal_hours"]');
        personalInputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            totalPersonalHours += value;
        });

        console.log('Total PTO hours:', totalPtoHours);
        console.log('Total Holiday hours:', totalHolidayHours);
        console.log('Total Personal hours:', totalPersonalHours);

        elements.ptoTimeSpan.textContent = totalPtoHours.toFixed(2);
        elements.holidayTimeSpan.textContent = totalHolidayHours.toFixed(2);
        elements.personalTimeSpan.textContent = totalPersonalHours.toFixed(2);
        document.getElementById('total-personal-time-display').textContent = totalPersonalHours.toFixed(2);

        elements.remainingPtoHoursElement.textContent = Math.max(0, availablePTOHours - totalPtoHours).toFixed(2);
        elements.remainingPersonalHoursElement.textContent = Math.max(0, availablePersonalHours - totalPersonalHours).toFixed(2);
        const totalTimeWithPto = totalPtoHours + totalHolidayHours + totalPersonalHours + parseFloat(elements.totalTimeWorkedSpan.textContent);
        elements.totalTimeWithPtoSpan.textContent = totalTimeWithPto.toFixed(2);
    }

    function preventExceedingPtoInputs() {
        const ptoInputs = document.querySelectorAll('input[name^="PTO_hours"]');
        ptoInputs.forEach(input => {
            input.addEventListener('input', function() {
                const currentValue = parseFloat(input.value) || 0;
                if (currentValue > availablePTOHours) {
                    input.value = availablePTOHours;
                }
                if (currentValue > availablePTOHours || (availablePTOHours - currentValue) < 0) {
                    input.value = Math.max(availablePTOHours, currentValue);
                }
                updateTotalPtoAndHolidayHours();
            });
        });
    }

    async function fetchPtoHours() {
        console.log('Fetching PTO hours...');
        const apiKey = 'pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c';
        const baseId = 'app9gw2qxhGCmtJvW';
        const tableId = 'tbljmLpqXScwhiWTt';
    
        const userEmail = localStorage.getItem('userEmail');
        const endpoint = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=AND({Email}='${userEmail}')`;
    
        try {
            const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
            if (!response.ok) throw new Error(`Failed to fetch PTO hours: ${response.statusText}`);
    
            const data = await response.json();
            console.log('Fetched PTO hours:', data);
    
            if (data.records.length > 0) {
                const record = data.records[0].fields;
                availablePTOHours = record['PTO Hours'] || 0;
                elements.ptoHoursDisplay.textContent = availablePTOHours.toFixed(2);
                console.log('Available PTO hours:', availablePTOHours);
            } else {
                console.log('No PTO hours data found for user');
            }
        } catch (error) {
            console.error('Error fetching PTO hours:', error);
            alert('Failed to fetch PTO hours. Error: ' + error.message);
        }
    }
    
    // Make sure to define the fetchPersonalTime function as well
    async function fetchPersonalTime() {
        console.log('Fetching Personal hours...');
        const apiKey = 'pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c';
        const baseId = 'app9gw2qxhGCmtJvW';
        const tableId = 'tbljmLpqXScwhiWTt';
    
        const userEmail = localStorage.getItem('userEmail');
        const endpoint = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=AND({Email}='${userEmail}')`;
    
        try {
            const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
            if (!response.ok) throw new Error(`Failed to fetch Personal hours: ${response.statusText}`);
    
            const data = await response.json();
            console.log('Fetched Personal hours:', data);
    
            if (data.records.length > 0) {
                const record = data.records[0].fields;
                availablePersonalHours = record['Personaltime'] || 0;
                elements.personalTimeDisplay.textContent = availablePersonalHours.toFixed(2);
                console.log('Available Personal hours:', availablePersonalHours);
            } else {
                console.log('No Personal hours data found for user');
            }
        } catch (error) {
            console.error('Error fetching Personal hours:', error);
            alert('Failed to fetch Personal hours. Error: ' + error.message);
        }
    }
    

    function preventExceedingPersonalInputs() {
        const personalInputs = document.querySelectorAll('input[name^="Personal_hours"]');
        personalInputs.forEach(input => {
            input.addEventListener('input', function() {
                const currentValue = parseFloat(input.value) || 0;
                if (currentValue > availablePersonalHours) {
                    input.value = availablePersonalHours;
                }
                if (currentValue > availablePersonalHours || (availablePersonalHours - currentValue) < 0) {
                    input.value = Math.max(availablePersonalHours, currentValue);
                }
                updateTotalPtoAndHolidayHours();
            });
        });
    }

    await fetchPtoHours();
    await fetchPersonalTime();
    preventExceedingPtoInputs();
    preventExceedingPersonalInputs();

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    function scrollToElement(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    timeInputs.forEach(input => {
        input.addEventListener('focus', () => scrollToElement(input));
    });

    function handleLogout(event) {
        event.preventDefault();
        console.log('Logging out...');
        localStorage.removeItem('userEmail');
        sessionStorage.removeItem('user');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
    }

    async function updatePtoHours() {
        console.log('Updating PTO hours...');
        const usedPtoHoursValue = parseFloat(elements.ptoTimeSpan.textContent) || 0;
        const newPtoHoursValue = Math.max(0, availablePTOHours - usedPtoHoursValue);
        console.log('Used PTO hours value:', usedPtoHoursValue);
        console.log('New PTO hours value:', newPtoHoursValue);

        const endpoint = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=AND({Email}='${userEmail}')`;
        console.log('Endpoint for update:', endpoint);

        try {
            const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
            if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
            const data = await response.json();
            console.log('Fetched data for update:', data);

            if (data.records.length > 0) {
                const recordId = data.records[0].id;
                console.log('Record ID:', recordId);

                const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: { 'PTO Hours': newPtoHoursValue } })
                });

                const updateResponseData = await updateResponse.json();
                console.log('Update response data:', updateResponseData);

                if (!updateResponse.ok) throw new Error(`Failed to update PTO hours: ${updateResponse.statusText} - ${JSON.stringify(updateResponseData)}`);
                console.log('PTO hours updated successfully');
                alert('PTO hours updated successfully!');
            } else {
                throw new Error('No record found for user');
            }
        } catch (error) {
            console.error('Error updating PTO hours:', error);
            alert('Failed to update PTO hours. Error: ' + error.message);
        }
    }

    async function updatePersonalHours() {
        console.log('Updating Personal hours...');
        const usedPersonalHoursValue = parseFloat(elements.personalTimeSpan.textContent) || 0;
        const newPersonalHoursValue = Math.max(0, availablePersonalHours - usedPersonalHoursValue);
        console.log('Used Personal hours value:', usedPersonalHoursValue);
        console.log('New Personal hours value:', newPersonalHoursValue);

        const endpoint = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=AND({Email}='${userEmail}')`;
        console.log('Endpoint for update:', endpoint);

        try {
            const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
            if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
            const data = await response.json();
            console.log('Fetched data for update:', data);

            if (data.records.length > 0) {
                const recordId = data.records[0].id;
                console.log('Record ID:', recordId);

                const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: { 'Personaltime': newPersonalHoursValue } })
                });

                const updateResponseData = await updateResponse.json();
                console.log('Update response data:', updateResponseData);

                if (!updateResponse.ok) throw new Error(`Failed to update Personal hours: ${updateResponse.statusText} - ${JSON.stringify(updateResponseData)}`);
                console.log('Personal hours updated successfully');
                alert('Personal hours updated successfully!');
            } else {
                throw new Error('No record found for user');
            }
        } catch (error) {
            console.error('Error updating Personal hours:', error);
            alert('Failed to update Personal hours. Error: ' + error.message);
        }
    }

    function clearForm() {
        console.log('Clearing form...');
        elements.timeEntryForm.reset();
        elements.ptoTimeSpan.textContent = '0';
        elements.personalTimeSpan.textContent = '0';
        elements.holidayTimeSpan.textContent = '0';
        elements.totalTimeWorkedSpan.textContent = '0.00';
        elements.totalTimeWithPtoSpan.textContent = '0.00';
        elements.remainingPtoHoursElement.textContent = '0.00';
        elements.remainingPersonalHoursElement.textContent = '0.00';
    }

    function resetForm(event) {
        event.preventDefault();
        console.log('Resetting form...');
        clearForm();
    }

    elements.submitButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const totalTimeWithPto = parseFloat(elements.totalTimeWithPtoSpan.textContent);
        const ptoTimeUsed = parseFloat(elements.ptoTimeSpan.textContent) || 0;
        const personalTimeUsed = parseFloat(elements.personalTimeSpan.textContent) || 0;
        const holidayHoursUsed = parseFloat(elements.holidayTimeSpan.textContent) || 0;

        if (ptoTimeUsed === 0 && personalTimeUsed === 0 && holidayHoursUsed === 0) {
            alert('Nothing to change');
            return;
        }

        if (totalTimeWithPto > 40 && (ptoTimeUsed > 0 || personalTimeUsed > 0 || holidayHoursUsed > 0)) {
            alert('Total hours including PTO, Personal time, or Holiday time cannot exceed 40 hours.');
            return;
        }

        try {
            await updatePtoHours();
            await updatePersonalHours();
            alert('Updates successful! The page will now refresh.');
            location.reload();
        } catch (error) {
            alert('Failed to update data. ' + error.message);
        }
    });

    async function initializeForm() {
        console.log('Initializing form...');
        const today = new Date();
        adjustToWednesday(today);
        elements.weekEndingInput.value = today.toISOString().split('T')[0];
        handleWeekEndingChange();
    }

    initializeForm();
    initializeTimeDropdowns();
    initializeKeyboardNavigation();

    function handleArrowKeys(event) {
        const key = event.key;
        const currentInput = event.target;
        const inputs = Array.from(document.querySelectorAll('select.time-dropdown'));

        let index = inputs.indexOf(currentInput);

        if (key === 'ArrowRight') {
            index = (index + 1) % inputs.length;
        } else if (key === 'ArrowLeft') {
            index = (index - 1 + inputs.length) % inputs.length;
        } else if (key === 'ArrowDown') {
            index = (index + 6) % inputs.length;
        } else if (key === 'ArrowUp') {
            index = (index - 6 + inputs.length) % inputs.length;
        }

        inputs[index].focus();
    }

    function showPickerOnFocus() {
        const timeInputs = document.querySelectorAll('select.time-dropdown, input[type="number"]');
        timeInputs.forEach(input => {
            input.addEventListener('focus', () => {
                if (input.showPicker) input.showPicker();
            });
        });
    }

    showPickerOnFocus();

    // Add click event for email navigation
    document.getElementById('user-email').addEventListener('click', function() {
        window.location.href = 'supervisor.html';
    });

    elements.submitButton.addEventListener('click', async function(event) {
        event.preventDefault();
        const formData = new FormData(elements.timeEntryForm);

        const payload = {
            fields: {
                "Week Ending - Date": formData.get('week_ending'),
                "Date1 - Date": formData.get('date1'),
                "Start Time1": formData.get('start_time1'),
                "Lunch Start1": formData.get('lunch_start1'),
                "Lunch End1": formData.get('lunch_end1'),
                "End Time1": formData.get('end_time1'),
                "Additional Time In1": formData.get('Additional_Time_In1'),
                "Additional Time Out1": formData.get('Additional_Time_Out1'),
                "Hours Worked1": formData.get('hours_worked1'),
                "PTO Hours1": formData.get('PTO_hours1'),
                "Personal Hours1": formData.get('Personal_hours1'),
                "Holiday Hours1": formData.get('Holiday_hours1'),
                "Did Not Work1": formData.get('did_not_work1') ? true : false,
                "Date2 - Date": formData.get('date2'),
                "Start Time2": formData.get('start_time2'),
                "Lunch Start2": formData.get('lunch_start2'),
                "Lunch End2": formData.get('lunch_end2'),
                "End Time2": formData.get('end_time2'),
                "Additional Time In2": formData.get('Additional_Time_In2'),
                "Additional Time Out2": formData.get('Additional_Time_Out2'),
                "Hours Worked2": formData.get('hours_worked2'),
                "PTO Hours2": formData.get('PTO_hours2'),
                "Personal Hours2": formData.get('Personal_hours2'),
                "Holiday Hours2": formData.get('Holiday_hours2'),
                "Did Not Work2": formData.get('did_not_work2') ? true : false,
                "Date3 - Date": formData.get('date3'),
                "Start Time3": formData.get('start_time3'),
                "Lunch Start3": formData.get('lunch_start3'),
                "Lunch End3": formData.get('lunch_end3'),
                "End Time3": formData.get('end_time3'),
                "Additional Time In3": formData.get('Additional_Time_In3'),
                "Additional Time Out3": formData.get('Additional_Time_Out3'),
                "Hours Worked3": formData.get('hours_worked3'),
                "PTO Hours3": formData.get('PTO_hours3'),
                "Personal Hours3": formData.get('Personal_hours3'),
                "Holiday Hours3": formData.get('Holiday_hours3'),
                "Did Not Work3": formData.get('did_not_work3') ? true : false,
                "Date4 - Date": formData.get('date4'),
                "Start Time4": formData.get('start_time4'),
                "Lunch Start4": formData.get('lunch_start4'),
                "Lunch End4": formData.get('lunch_end4'),
                "End Time4": formData.get('end_time4'),
                "Additional Time In4": formData.get('Additional_Time_In4'),
                "Additional Time Out4": formData.get('Additional_Time_Out4'),
                "Hours Worked4": formData.get('hours_worked4'),
                "PTO Hours4": formData.get('PTO_hours4'),
                "Personal Hours4": formData.get('Personal_hours4'),
                "Holiday Hours4": formData.get('Holiday_hours4'),
                "Did Not Work4": formData.get('did_not_work4') ? true : false,
                "Date5 - Date": formData.get('date5'),
                "Start Time5": formData.get('start_time5'),
                "Lunch Start5": formData.get('lunch_start5'),
                "Lunch End5": formData.get('lunch_end5'),
                "End Time5": formData.get('end_time5'),
                "Additional Time In5": formData.get('Additional_Time_In5'),
                "Additional Time Out5": formData.get('Additional_Time_Out5'),
                "Hours Worked5": formData.get('hours_worked5'),
                "PTO Hours5": formData.get('PTO_hours5'),
                "Personal Hours5": formData.get('Personal_hours5'),
                "Holiday Hours5": formData.get('Holiday_hours5'),
                "Did Not Work5": formData.get('did_not_work5') ? true : false,
                "Date6 - Date": formData.get('date6'),
                "Start Time6": formData.get('start_time6'),
                "Lunch Start6": formData.get('lunch_start6'),
                "Lunch End6": formData.get('lunch_end6'),
                "End Time6": formData.get('end_time6'),
                "Additional Time In6": formData.get('Additional_Time_In6'),
                "Additional Time Out6": formData.get('Additional_Time_Out6'),
                "Hours Worked6": formData.get('hours_worked6'),
                "PTO Hours6": formData.get('PTO_hours6'),
                "Personal Hours6": formData.get('Personal_hours6'),
                "Holiday Hours6": formData.get('Holiday_hours6'),
                "Did Not Work6": formData.get('did_not_work6') ? true : false,
                "Date7 - Date": formData.get('date7'),
                "Start Time7": formData.get('start_time7'),
                "Lunch Start7": formData.get('lunch_start7'),
                "Lunch End7": formData.get('lunch_end7'),
                "End Time7": formData.get('end_time7'),
                "Additional Time In7": formData.get('Additional_Time_In7'),
                "Additional Time Out7": formData.get('Additional_Time_Out7'),
                "Hours Worked7": formData.get('hours_worked7'),
                "PTO Hours7": formData.get('PTO_hours7'),
                "Personal Hours7": formData.get('Personal_hours7'),
                "Holiday Hours7": formData.get('Holiday_hours7'),
                "Did Not Work7": formData.get('did_not_work7') ? true : false
            }
        };

        try {
            const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Failed to submit data: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Data submitted successfully:', data);
            alert('Data submitted successfully!');

        } catch (error) {
            console.error('Error submitting data:', error);
            alert('Failed to submit data. Error: ' + error.message);
        }
    });
});
