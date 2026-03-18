// signup.js
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { auth } from './firebase.js';

const db = getFirestore();

const signupBtn = document.getElementById("signupBtn");

signupBtn.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const phone = document.getElementById("phone").value.trim();
  // Humne role ka input hata diya hai

  if (!name || !email || !password) {
    alert("Please fill name, email, and password.");
    return;
  }

  try {
    // 1. Firebase Auth me user create karo
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Firestore 'users' collection me naye user ki details save karo
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      phone: phone,
      role: "Pending Approval", // Yahan default role set ho gaya
      division: "Not Assigned", // Default division
      createdAt: new Date()
    });

    alert("Sign up successful! Your account is pending admin approval.");
    window.location.href = "login.html";

  } catch (error) {
    console.error("Error signing up:", error);
    alert(error.message);
  }
});