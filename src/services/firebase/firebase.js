import firebase from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAjmR0RgjofxbCE2yXW8GvsNZlsC63sg2Y",
    authDomain: "sempai-60709.firebaseapp.com",
    projectId: "sempai-60709",
    storageBucket: "sempai-60709.firebasestorage.app",
    messagingSenderId: "609786725289",
    appId: "1:609786725289:web:17fddfbe8cdbf25c07fab8",
    measurementId: "G-PJKQGWZZ9D"
  };

  if(!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
  }

  // Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);