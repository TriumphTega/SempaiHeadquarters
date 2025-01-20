// src/services/firebase/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // Import getStorage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjmR0RgjofxbCE2yXW8GvsNZlsC63sg2Y",
  authDomain: "sempai-60709.firebaseapp.com",
  projectId: "sempai-60709",
  storageBucket: "sempai-60709.firebasestorage.app",
  messagingSenderId: "609786725289",
  appId: "1:609786725289:web:17fddfbe8cdbf25c07fab8",
  measurementId: "G-PJKQGWZZ9D",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Export the auth instance, firestore instance, and storage instance
export const auth = getAuth(firebaseApp);  // Auth instance
export const db = getFirestore(firebaseApp);  // Firestore instance
export const storage = getStorage(firebaseApp);  // Storage instance

export { auth, db, storage };
