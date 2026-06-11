import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJ3gcXm3x7eLM6DIhkIgIhqh4Tv-Jgr_U",
  authDomain: "emp-monit.firebaseapp.com",
  projectId: "emp-monit",
  storageBucket: "emp-monit.firebasestorage.app",
  messagingSenderId: "1003231394353",
  appId: "1:1003231394353:web:b7a14e7ec5312ac1fb7310",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listEmployees() {
  const querySnapshot = await getDocs(collection(db, "employees"));
  const employees = [];
  querySnapshot.forEach((doc) => {
    employees.push({ id: doc.id, ...doc.data() });
    console.log(`ID: ${doc.id}, EmpId: ${doc.data().empId}, Name: ${doc.data().empName}, Status: ${doc.data().status}`);
  });
  return employees;
}

listEmployees();
