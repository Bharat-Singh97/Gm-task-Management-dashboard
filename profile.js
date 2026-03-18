import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { auth } from './firebase.js';

// DOM Elements
const profileNameEl = document.getElementById("profileName");
const profileEmailEl = document.getElementById("profileEmail");
const profilePhoneEl = document.getElementById("profilePhone");
const profileDivisionEl = document.getElementById("profileDivision");
const updateProfileBtn = document.getElementById("updateProfileBtn");
const feedbackMessageEl = document.getElementById("feedbackMessage");

let currentUser = null;

// User ke login state ko check karna
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User logged in hai
    currentUser = user;
    loadUserProfile(user.uid);
  } else {
    // User logged in nahi hai, login page par bhej do
    console.log("No user is logged in. Redirecting to login page.");
    window.location.href = "login.html";
  }
});

// Firestore se user ka profile data load karna
async function loadUserProfile(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    // Form ke fields ko data se bhar do
    profileNameEl.value = userData.name || "";
    profileEmailEl.value = currentUser.email; // Auth se email lo
    profilePhoneEl.value = userData.phone || "";
    profileDivisionEl.value = userData.division || "";
  } else {
    // Agar user ka data Firestore me nahi hai (shayad naya user)
    console.log("No profile data found in Firestore for this user.");
    profileEmailEl.value = currentUser.email;
  }
}

// "Update Profile" button ka event listener
updateProfileBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("You are not logged in!");
    return;
  }

  // Form se nayi details lo
  const updatedData = {
    name: profileNameEl.value,
    phone: profilePhoneEl.value,
    division: profileDivisionEl.value,
    // Role yahan se update nahi hoga, woh sirf admin karega
  };

  try {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, updatedData, { merge: true });
    
    // Success message dikhao
    feedbackMessageEl.textContent = "Profile updated successfully!";
    setTimeout(() => {
      feedbackMessageEl.textContent = "";
    }, 3000); // 3 second baad message gayab ho jayega

  } catch (error) {
    console.error("Error updating profile:", error);
    feedbackMessageEl.style.color = "red";
    feedbackMessageEl.textContent = "Failed to update profile. Check console.";
  }
});