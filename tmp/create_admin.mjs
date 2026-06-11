import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCJ3gcXm3x7eLM6DIhkIgIhqh4Tv-Jgr_U",
  authDomain: "emp-monit.firebaseapp.com",
  projectId: "emp-monit",
  storageBucket: "emp-monit.firebasestorage.app",
  messagingSenderId: "1003231394353",
  appId: "1:1003231394353:web:b7a14e7ec5312ac1fb7310",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createAdmin() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, "testadmin@gmail.com", "admin123");
    console.log("Admin user created successfully:", userCredential.user.email);
  } catch (error) {
    console.error("Error creating admin user:", error.message);
  }
}

createAdmin();
