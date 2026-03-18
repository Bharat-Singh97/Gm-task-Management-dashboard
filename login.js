import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// --- DOM Elements ---
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

// Check if the login button exists before adding a listener
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = emailEl.value;
        const password = passwordEl.value;

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                // Login successful, redirect to the dashboard
                window.location.href = "dashboard.html";
            })
            .catch(error => {
                console.error("Login Error:", error);
                alert("Login failed: " + error.message);
            });
    });
} else {
    console.error("Login button with id 'loginBtn' not found!");
}