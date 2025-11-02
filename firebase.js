// firebase.js
// Firebase modular v12.5.0 initialization

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDy_GTVZvwCZp8eLYvd_TUPI-uo_Jp5MpY",
  authDomain: "laamsocial-98cce.firebaseapp.com",
  projectId: "laamsocial-98cce",
  storageBucket: "laamsocial-98cce.appspot.com",
  messagingSenderId: "649707204234",
  appId: "1:649707204234:web:2f22441b4dbbacc5674773"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("Firebase initialized successfully!");
