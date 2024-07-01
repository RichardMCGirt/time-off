document.addEventListener("DOMContentLoaded", function () {
    const baseId = 'appMq9W12jZyCJeXe';
    const tableId = 'tbl2b7fgvkU4GL4jI';
    const apiKey = 'patlpJTj4IzTPxTT3.3de1a5fb5b5881b393d5616821ff762125f1962d1849879d0719eb3b8d580bde';
    const ptoHoursElement = document.getElementById('pto-hours');
    const weekEndingInput = document.getElementById('week-ending');
    const timeEntryForm = document.getElementById('time-entry-form');
    const ptoTimeInput = document.getElementById('pto-time');
    const totalTimeWorkedSpan = document.getElementById('total-time-worked');
    const totalTimeWithPtoSpan = document.getElementById('total-time-with-pto-value');
    const ptoValidationMessage = document.getElementById('pto-validation-message');
    const timeEntryBody = document.getElementById('time-entry-body');

    // Event listeners
    weekEndingInput.addEventListener('change', handleWeekEndingChange);
    timeEntryForm.addEventListener('input', calculateTotalTimeWorked);
    ptoTimeInput.addEventListener('input', calculateTotalTimeWorked);

    function handleWeekEndingChange() {
        const selectedDate = new Date(weekEndingInput.value);
        let dayOfWeek = selectedDate.getDay(); // 0 (Sunday) to 6 (Saturday)
    
        // Adjust the date to the nearest Wednesday
        while (dayOfWeek !== 3) { // 3 corresponds to Wednesday
            if (dayOfWeek < 3) {
                selectedDate.setDate(selectedDate.getDate() + (3 - dayOfWeek)); // Move forward to Wednesday
            } else {
                selectedDate.setDate(selectedDate.getDate() + (7 - dayOfWeek + 3)); // Move forward to next Wednesday
            }
            dayOfWeek = selectedDate.getDay(); // Update day of week after adjustment
        }
    
        weekEndingInput.value = selectedDate.toISOString().split('T')[0]; // Update input value
    
        // Ensure date7 is set to the next Wednesday after the selected week ending date
        const date7 = new Date(selectedDate);
        date7.setDate(selectedDate.getDate() + 6); // Move forward to date7 (Wednesday of the next week)
    
        // Update date7 input in the form
        timeEntryForm.elements['date7'].value = date7.toISOString().split('T')[0];
    
        populateWeekDates(); // Update other week dates in the form
        fetchPtoHours(); // Fetch PTO hours for the selected week ending date
    }
    
    
    // Populate week dates based on selected week ending date
    function populateWeekDates() {
        const weekEndingDate = new Date(weekEndingInput.value);
        const daysOfWeek = ['date1', 'date2', 'date3', 'date4', 'date5', 'date6', 'date7'];

        daysOfWeek.forEach((day, index) => {
            const currentDate = new Date(weekEndingDate);
            currentDate.setDate(weekEndingDate.getDate() - (6 - index));
            const formattedDate = currentDate.toISOString().split('T')[0];
            timeEntryForm.elements[day].value = formattedDate;
        });
    }

    // Fetch remaining PTO hours from API
    async function fetchPtoHours() {
        const weekEnding = weekEndingInput.value;
        if (!weekEnding) return;

        const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={WeekEnding}="${weekEnding}"`;

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch PTO hours');
            }

            const data = await response.json();
            const ptoHours = data.records.length > 0 ? data.records[0].fields['PTO Time'] || 0 : 0;
            ptoHoursElement.textContent = `${ptoHours} hours`;

            // Update remaining PTO hours input field
            ptoTimeInput.value = ptoHours;
        } catch (error) {
            console.error('Error fetching PTO hours:', error);
            ptoHoursElement.textContent = '0 hours';
            ptoTimeInput.value = 0;
        }
    }

    // Calculate hours worked for a specific row
    function calculateHoursWorked(row) {
        const startTime = timeEntryForm.elements[`start_time${row}`].value;
        const endTime = timeEntryForm.elements[`end_time${row}`].value;
        const lunchStart = timeEntryForm.elements[`lunch_start${row}`].value;
        const lunchEnd = timeEntryForm.elements[`lunch_end${row}`].value;

        let hoursWorked = 0;

        if (startTime && endTime) {
            const start = new Date(`1970-01-01T${startTime}Z`);
            const end = new Date(`1970-01-01T${endTime}Z`);
            let workedHours = (end - start) / (1000 * 60 * 60); // Difference in hours

            if (lunchStart && lunchEnd) {
                const lunchStartObj = new Date(`1970-01-01T${lunchStart}Z`);
                const lunchEndObj = new Date(`1970-01-01T${lunchEnd}Z`);
                const lunchHours = (lunchEndObj - lunchStartObj) / (1000 * 60 * 60); // Lunch break hours
                workedHours -= lunchHours; // Subtract lunch break hours
            }

            // Ensure worked hours are not negative
            hoursWorked = Math.max(workedHours, 0).toFixed(2); // Round to 2 decimal places
        }

        return hoursWorked;
    }

    // Calculate total time worked and update UI
    function calculateTotalTimeWorked() {
        let totalWorkedHours = 0;

        for (let i = 1; i <= 7; i++) {
            const hoursWorked = parseFloat(calculateHoursWorked(i)) || 0;
            document.getElementById(`hours-worked-today${i}`).textContent = hoursWorked.toFixed(2);
            totalWorkedHours += hoursWorked;
        }

        document.getElementById('total-time-worked').textContent = totalWorkedHours.toFixed(2);
        calculateTotalTimeWithPto(totalWorkedHours);
    }

    // Calculate total time with PTO and update UI
    function calculateTotalTimeWithPto(totalWorkedHours) {
        const ptoHours = parseFloat(ptoTimeInput.value) || 0;
        const totalTimeWithPto = totalWorkedHours + ptoHours;
        totalTimeWithPtoSpan.textContent = totalTimeWithPto.toFixed(2);
    }

    // Add a new row for time entry
    function addRow() {
        const tbody = document.getElementById('time-entry-body');
        const rowCount = tbody.rows.length + 1; // Calculate the next index for new row
        
        if (rowCount <= 7) { // Limit to adding up to 7 rows
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="date" name="date${rowCount}" onchange="calculateHoursWorked(${rowCount}); calculateTotalTimeWorked()"></td>
                <td><input type="time" name="start_time${rowCount}" step="1800" onchange="calculateHoursWorked(${rowCount}); calculateTotalTimeWorked()"></td>
                <td><input type="time" name="lunch_start${rowCount}" step="1800" onchange="calculateHoursWorked(${rowCount}); calculateTotalTimeWorked()"></td>
                <td><input type="time" name="lunch_end${rowCount}" step="1800" onchange="calculateHoursWorked(${rowCount}); calculateTotalTimeWorked()"></td>
                <td><input type="time" name="end_time${rowCount}" step="1800" onchange="calculateHoursWorked(${rowCount}); calculateTotalTimeWorked()"></td>
                <td id="hours-worked-today${rowCount}">0.00</td>
                <td><button type="button" onclick="deleteRow(this)">Delete</button></td>
            `;
            tbody.appendChild(newRow);
        }
    }

    // Delete a row from time entry
    function deleteRow(button) {
        const row = button.closest('tr');
        row.remove();
        calculateTotalTimeWorked();
    }

    // Submit remaining PTO hours to Airtable
    async function submitRemainingPtoHours() {
        const remainingPtoHours = parseFloat(ptoTimeInput.value) - parseFloat(totalTimeWithPtoSpan.textContent);
        
        const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    records: [
                        {
                            id: data.records[0].id,
                            fields: {
                                'PTO Time': remainingPtoHours
                            }
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update PTO hours');
            }

            console.log('PTO hours updated successfully:', remainingPtoHours);
            alert('Remaining PTO hours submitted successfully!');
        } catch (error) {
            console.error('Error updating PTO hours:', error);
            alert('Failed to update remaining PTO hours');
        }
    }

    // Submit timesheet data to Airtable
    async function submitTimesheet() {
        const formData = new FormData(timeEntryForm);
        const records = [];

        for (let i = 1; i <= 7; i++) {
            const date = formData.get(`date${i}`);
            const startTime = formData.get(`start_time${i}`);
            const lunchStart = formData.get(`lunch_start${i}`);
            const lunchEnd = formData.get(`lunch_end${i}`);
            const endTime = formData.get(`end_time${i}`);
            const hoursWorked = calculateHoursWorked(i);

            // Only include records where work is logged (startTime and endTime are present)
            if (date && startTime && endTime) {
                records.push({
                    fields: {
                        Date: date,
                        StartTime: startTime,
                        LunchStart: lunchStart,
                        LunchEnd: lunchEnd,
                        EndTime: endTime,
                        HoursWorked: parseFloat(hoursWorked)
                    }
                });
            }
        }

        const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ records })
            });

            if (!response.ok) {
                throw new Error('Failed to submit timesheet');
            }

            alert('Timesheet submitted successfully!');
            timeEntryForm.reset(); // Reset the form after successful submission
            timeEntryBody.innerHTML = ''; // Clear all rows from the table
            fetchPtoHours(); // Update remaining PTO hours

            // Submit remaining PTO hours after timesheet submission
            submitRemainingPtoHours();
        } catch (error) {
            console.error('Error submitting timesheet:', error);
            alert('Failed to submit timesheet. Please try again later.');
        }
    }

    // Initial setup
    function init() {
        handleWeekEndingChange(); // Fetch PTO hours for initial week ending date
    }

    init(); // Initialize the application
});
