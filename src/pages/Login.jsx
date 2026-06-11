import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Lock, Mail, Eye, EyeOff, Briefcase } from "lucide-react";

const Login = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { loginAdmin, loginEmployee } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isAdmin) {
        await loginAdmin(email, password);
        navigate("/admin/dashboard");
      } else {
        await loginEmployee(empId, password);
        navigate("/employee/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Card */}
      <div
        className="animate-fade"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(30, 58, 138, 0.12), 0 4px 16px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Top brand bar */}
        <div
          style={{
            background: "var(--sidebar-bg)",
            padding: "32px 40px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "16px",
              marginBottom: "14px",
            }}
          >
            <Briefcase size={26} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
            WorkZen
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
            HR &amp; Performance Management
          </p>
        </div>

        {/* Form area */}
        <div style={{ padding: "32px 40px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-main)", marginBottom: "6px" }}>
            Welcome back
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
            Sign in to your {isAdmin ? "admin" : "employee"} account
          </p>

          {/* Role Toggle */}
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "10px",
              marginBottom: "24px",
              gap: "4px",
            }}
          >
            <button
              onClick={() => setIsAdmin(false)}
              style={{
                flex: 1,
                padding: "9px",
                border: "none",
                borderRadius: "7px",
                background: !isAdmin ? "#ffffff" : "transparent",
                color: !isAdmin ? "var(--primary)" : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                transition: "all 0.2s",
                boxShadow: !isAdmin ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Employee
            </button>
            <button
              onClick={() => setIsAdmin(true)}
              style={{
                flex: 1,
                padding: "9px",
                border: "none",
                borderRadius: "7px",
                background: isAdmin ? "#ffffff" : "transparent",
                color: isAdmin ? "var(--primary)" : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                transition: "all 0.2s",
                boxShadow: isAdmin ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Admin
            </button>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "12px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email / EmpId */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                {isAdmin ? "Admin ID" : "Employee ID"}
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    display: "flex",
                  }}
                >
                  {isAdmin ? <Mail size={17} /> : <User size={17} />}
                </span>
                <input
                  type={isAdmin ? "email" : "text"}
                  placeholder={isAdmin ? "Admin Id " : "Emp Id"}
                  className="input-field"
                  value={isAdmin ? email : empId}
                  onChange={(e) => isAdmin ? setEmail(e.target.value) : setEmpId(e.target.value)}
                  style={{ paddingLeft: "42px" }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    display: "flex",
                  }}
                >
                  <Lock size={17} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: "42px", paddingRight: "44px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", height: "46px", borderRadius: "10px", fontSize: "14px", marginTop: "4px" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "20px" }}>
            {isAdmin ? "Admin login requires Gmail & Password" : "Enter your Employee ID and Password to sign in"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
