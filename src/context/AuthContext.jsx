import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'employee'
  const [loading, setLoading] = useState(true);

  // Admin Login (Firebase Auth)
  const loginAdmin = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Employee Login (Firestore Lookup)
  const loginEmployee = async (empId, password) => {
    const q = query(
      collection(db, "employees"),
      where("empId", "==", empId),
      where("password", "==", password)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      
      if (userData.status === "terminated") {
        throw new Error("Your account has been terminated. Please contact administration.");
      }

      const user = { ...userData, id: querySnapshot.docs[0].id };

      // --- Write login log to Firestore ---
      try {
        const logRef = await addDoc(collection(db, "loginLogs"), {
          empId: user.empId,
          empName: user.empName || "",
          loginTime: new Date().toISOString(),
          logoutTime: null,
          createdAt: new Date().toISOString(),
        });
        // Store the log doc ID so we can update it on logout
        localStorage.setItem("epms_login_log_id", logRef.id);
      } catch (logErr) {
        console.error("Failed to write login log:", logErr);
      }
      // ------------------------------------

      setCurrentUser(user);
      setUserRole("employee");
      localStorage.setItem("epms_user", JSON.stringify({ ...user, role: "employee" }));
      return user;
    } else {
      throw new Error("Invalid Employee ID or Password");
    }
  };

  const logout = async () => {
    // --- Stamp logout time on the login log ---
    if (userRole === "employee") {
      const logId = localStorage.getItem("epms_login_log_id");
      if (logId) {
        try {
          await updateDoc(doc(db, "loginLogs", logId), {
            logoutTime: new Date().toISOString(),
          });
        } catch (logErr) {
          console.error("Failed to update logout time:", logErr);
        }
        localStorage.removeItem("epms_login_log_id");
      }
    }
    // -----------------------------------------

    if (userRole === "admin") {
      await signOut(auth);
    }
    setCurrentUser(null);
    setUserRole(null);
    localStorage.removeItem("epms_user");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const localUser = JSON.parse(localStorage.getItem("epms_user"));
      
      if (user) {
        setCurrentUser(user);
        setUserRole("admin");
      } else if (localUser && localUser.role === "employee") {
        setCurrentUser(localUser);
        setUserRole("employee");
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loginAdmin,
    loginEmployee,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
