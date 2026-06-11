import React from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  Mail,
  LogOut,
  X,
  Wallet,
  Briefcase,
  Activity,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { userRole, logout, currentUser } = useAuth();
  const location = useLocation();

  const adminMenus = [
    { name: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Employees", path: "/admin/employees", icon: <Users size={20} /> },
    { name: "Tasks", path: "/admin/tasks", icon: <ClipboardList size={20} /> },
    { name: "Login Monitor", path: "/admin/login-monitor", icon: <Activity size={20} /> },
    { name: "Reports", path: "/admin/performance", icon: <TrendingUp size={20} /> },
    { name: "Leave Requests", path: "/admin/leaves", icon: <Mail size={20} /> },
    { name: "Salary Management", path: "/admin/salary", icon: <Wallet size={20} /> },
  ];

  const employeeMenus = [
    { name: "Dashboard", path: "/employee/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Attendance Status", path: "/employee/attendance", icon: <CalendarCheck size={20} /> },
    { name: "My Tasks", path: "/employee/tasks", icon: <ClipboardList size={20} /> },
    { name: "Performance", path: "/employee/performance", icon: <TrendingUp size={20} /> },
    { name: "Salary Details", path: "/employee/salary", icon: <Wallet size={20} /> },
    { name: "Leave Request", path: "/employee/leaves", icon: <Mail size={20} /> },
  ];

  const menus = userRole === "admin" ? adminMenus : employeeMenus;

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? "show" : ""}`} onClick={onClose} />
      <div
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "var(--sidebar-w)",
          height: "100vh",
          background: "var(--sidebar-bg)",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          zIndex: 1000,
          boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            padding: "24px 20px",
            borderBottom: "1px solid var(--sidebar-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "#ffffff20",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Briefcase size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.3px" }}>
                WorkZen
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "1px" }}>
                {userRole === "admin" ? "Admin Portal" : "Employee Portal"}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Employee ID pill (if employee) */}
        {userRole === "employee" && currentUser?.empId && (
          <div style={{ padding: "12px 20px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              ID: <span style={{ color: "#ffffff", fontWeight: "600" }}>{currentUser.empId}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
          <p
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              padding: "8px 8px 12px",
            }}
          >
            Navigation
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
            {menus.map((menu) => {
              const isActive = location.pathname === menu.path;
              return (
                <li key={menu.path}>
                  <Link
                    to={menu.path}
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "11px 14px",
                      borderRadius: "10px",
                      background: isActive
                        ? "var(--sidebar-active)"
                        : "transparent",
                      color: isActive
                        ? "var(--sidebar-text-active)"
                        : "var(--sidebar-text)",
                      fontWeight: isActive ? "600" : "500",
                      fontSize: "14px",
                      transition: "all 0.18s ease",
                      textDecoration: "none",
                      boxShadow: isActive ? "0 4px 12px rgba(37,99,235,0.35)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "#ffffff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--sidebar-text)";
                      }
                    }}
                  >
                    <span style={{ opacity: isActive ? 1 : 0.7 }}>{menu.icon}</span>
                    <span>{menu.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer / Logout */}
        <div
          style={{
            padding: "16px 12px",
            borderTop: "1px solid var(--sidebar-border)",
          }}
        >
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "11px 14px",
              borderRadius: "10px",
              background: "transparent",
              border: "none",
              color: "rgba(255,120,120,0.85)",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,120,120,0.85)";
            }}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
