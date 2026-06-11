import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import EmployeeManagement from "./pages/admin/EmployeeDetails";
import TaskManagement from "./pages/admin/Tasks";
import PerformanceReview from "./pages/admin/Performance";
import LeaveRequests from "./pages/admin/LeaveRequests";
import SalaryManagement from "./pages/admin/Salary";
import LoginMonitor from "./pages/admin/LoginMonitor";

// Employee Pages
import EmployeeDashboard from "./pages/employee/Dashboard";
import EmployeeAttendance from "./pages/employee/Attendance";
import EmployeeTasks from "./pages/employee/Tasks";
import EmployeePerformance from "./pages/employee/Performance";
import EmployeeSalary from "./pages/employee/Salary";
import EmployeeLeaves from "./pages/employee/Leaves";

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  const { currentUser, userRole, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Loading WorkZen...</p>
      </div>
    </div>
  );
  
  if (!currentUser) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} />;

  return (
    <div className="layout-container">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="main-content">
        <div className="mobile-topbar" style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <span className="mobile-topbar-title" style={{ color: 'var(--text-main)', fontWeight: '700' }}>
            {userRole === "admin" ? "WorkZen Admin" : "WorkZen Employee"}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute role="admin">
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="employees" element={<EmployeeManagement />} />
                <Route path="login-monitor" element={<LoginMonitor />} />
                <Route path="tasks" element={<TaskManagement />} />
                <Route path="performance" element={<PerformanceReview />} />
                <Route path="leaves" element={<LeaveRequests />} />
                <Route path="salary" element={<SalaryManagement />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Employee Routes */}
          <Route path="/employee/*" element={
            <ProtectedRoute role="employee">
              <Routes>
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="attendance" element={<EmployeeAttendance />} />
                <Route path="tasks" element={<EmployeeTasks />} />
                <Route path="performance" element={<EmployeePerformance />} />
                <Route path="salary" element={<EmployeeSalary />} />
                <Route path="leaves" element={<EmployeeLeaves />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
