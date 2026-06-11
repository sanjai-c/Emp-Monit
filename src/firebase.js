import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJ3gcXm3x7eLM6DIhkIgIhqh4Tv-Jgr_U",
  authDomain: "emp-monit.firebaseapp.com",
  projectId: "emp-monit",
  storageBucket: "emp-monit.firebasestorage.app",
  messagingSenderId: "1003231394353",
  appId: "1:1003231394353:web:b7a14e7ec5312ac1fb7310",
  measurementId: "G-0TVDE9787G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
