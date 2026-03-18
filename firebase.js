// ⚠️ Add your Firebase config before running this project

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// 🔧 Firebase configuration
 const firebaseConfig = {
    apiKey: "AIzaSyBcm4xy2Z_8kkBWuMztVmyQxP-ybs8rYnw",
    authDomain: "gm-dashboard-87a53.firebaseapp.com",
    projectId: "gm-dashboard-87a53",
    storageBucket: "gm-dashboard-87a53.firebasestorage.app",
    messagingSenderId: "287694629961",
    appId: "1:287694629961:web:086bc95822ef2d590a2398",
    measurementId: "G-SRDQ5BTBFJ"
  };


// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);  // 🔥 Firestore added

// 🔁 Export auth and db
export { auth, db };

