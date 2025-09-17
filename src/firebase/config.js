// src/firebase/config.js
import { initializeApp } from "firebase/app";

//auth
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAeVerSmJRjLygT0We9K84HCjRkgOZXXCY",
  authDomain: "mtto-ac.firebaseapp.com",
  projectId: "mtto-ac",
  storageBucket: "mtto-ac.firebasestorage.app",
  messagingSenderId: "425964387334",
  appId: "1:425964387334:web:412be3d6c358056ac31787"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);