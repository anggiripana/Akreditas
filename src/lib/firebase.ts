import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBkx2ic24DEMcZ3auQJMZIyDS93dy511dc",
  authDomain: "diesel-cat-xn50x.firebaseapp.com",
  projectId: "diesel-cat-xn50x",
  storageBucket: "diesel-cat-xn50x.firebasestorage.app",
  messagingSenderId: "915372052099",
  appId: "1:915372052099:web:7321b3fd15be9c96af55b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = initializeFirestore(app, {}, "ai-studio-abedce85-a315-445c-8175-c28855dc85a9");
