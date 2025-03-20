import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyB1AoF486JVLwMHIGGMNbxneXMJBXgQbUQ",
  authDomain: "oup-quiz-app.firebaseapp.com",
  projectId: "oup-quiz-app",
  storageBucket: "oup-quiz-app.firebasestorage.app",
  messagingSenderId: "16236345204",
  appId: "1:16236345204:web:c6627544a6b98a24d01e21"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);