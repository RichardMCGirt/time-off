const apiKey = 'pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c';
const baseId = 'app9gw2qxhGCmtJvW';
const tableId = 'tbljmLpqXScwhiWTt/';

// DOM elements

const jokeText = document.getElementById('joke-text'); // Element to display the joke

document.getElementById('loginButton').addEventListener('click', login);

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed");
    fetchJoke(); // Fetch joke on page load
});

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log("Login attempt with email:", email);

    if (!email || !password) {
        alert('Please fill in both email and password fields.');
        return;
    }

    try {
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={email}='${email}'`, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log("Fetched user data from Airtable:", data);
        const user = data.records.find(record => record.fields.email === email && record.fields.password === password);

        if (user) {
            console.log("User authenticated:", user);
            sessionStorage.setItem('user', JSON.stringify(user.fields));
            localStorage.setItem('userEmail', email);

            const backgroundMusic = document.getElementById('backgroundMusic');
            backgroundMusic.play();
            sessionStorage.setItem('isMusicPlaying', 'true');

           

            window.location.href = 'timesheet.html';
        } else {
            alert('Invalid email or password');
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed: ' + error.message);
    }
}


async function fetchJoke() {
    console.log('Fetching a random joke...');
    
    try {
        const response = await fetch('https://official-joke-api.appspot.com/jokes/random');
        if (!response.ok) {
            throw new Error(`Failed to fetch joke: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Fetched joke data:', data);

        jokeText.textContent = `${data.setup} - ${data.punchline}`;
    } catch (error) {
        console.error('Error fetching joke:', error);
    }
}