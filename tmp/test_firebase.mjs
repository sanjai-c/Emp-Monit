import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
  querySnapshot.forEach((doc) => {
    console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
  });
}

listEmployees();
