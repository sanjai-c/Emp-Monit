import React, { useEffect, useState, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  Activity,
  Search,
  Trash2,
  Edit3,
  X,
  Save,
  LogIn,
  LogOut,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  Calendar,
} from "lucide-react";

const LoginMonitor = () => {
  // Global States
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live"); // "live" or "individual"

  // Live View Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Individual Report States
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");

  // Edit State
  const [editingLog, setEditingLog] = useState(null);
  const [editData, setEditData] = useState({ loginTime: "", logoutTime: "", status: "" });

  // 1. Snapshot for All Logs (Live Feed)
  // We fetch everything once and filter in-memory to avoid Firestore indexing issues
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "gpsAttendance"), orderBy("loginTime", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Fetch Employee List for Dropdown
  useEffect(() => {
    const q = query(collection(db, "employees"), orderBy("empId", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Employee Fetch Error:", err);
    });
    return () => unsub();
  }, []);

  // 3. Derived State for Individual Reports
  // This is reactive and will update immediately when logs or selectedEmpId or date filters change
  const individualLogs = useMemo(() => {
    if (!selectedEmpId) return [];
    let filtered = logs.filter(l => l.empId === selectedEmpId);
    
    if (reportFromDate) {
      filtered = filtered.filter(l => l.date >= reportFromDate);
    }
    if (reportToDate) {
      filtered = filtered.filter(l => l.date <= reportToDate);
    }
    
    return filtered;
  }, [logs, selectedEmpId, reportFromDate, reportToDate]);

  // Utility: Get Employee Name
  const getEmpName = (log) => {
    if (log.empName) return log.empName;
    const emp = employees.find((e) => e.empId === log.empId);
    return emp?.empName || "—";
  };

  // Utility: Format Time to 12h
  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Utility: Calculate Duration
  const calcDuration = (loginTime, logoutTime) => {
    if (!loginTime || !logoutTime) return "—";
    const diff = new Date(logoutTime) - new Date(loginTime);
    if (diff < 0) return "—";
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  // Actions: Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this log permanently?")) return;
    try {
      await deleteDoc(doc(db, "gpsAttendance", id));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Actions: Edit
  const openEdit = (log) => {
    setEditingLog(log);
    setEditData({
      loginTime: log.loginTime ? new Date(log.loginTime).toISOString().slice(0, 16) : "",
      logoutTime: log.logoutTime ? new Date(log.logoutTime).toISOString().slice(0, 16) : "",
      status: log.status || "Present",
    });
  };

  const handleUpdate = async () => {
    if (!editingLog) return;
    try {
      const loginTime = new Date(editData.loginTime).toISOString();
      const logoutTime = editData.logoutTime ? new Date(editData.logoutTime).toISOString() : null;
      
      // If manual status was changed, use it, otherwise use the auto-calculation
      let finalStatus = editData.status;
      if (!finalStatus && logoutTime) {
        const diff = new Date(logoutTime) - new Date(loginTime);
        finalStatus = diff >= 8 * 60 * 60 * 1000 ? "Present" : "Absent";
      }

      await updateDoc(doc(db, "gpsAttendance", editingLog.id), {
        loginTime,
        logoutTime,
        status: finalStatus,
        updatedAt: new Date().toISOString(),
      });
      setEditingLog(null);
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  // Actions: Download CSV
  const downloadCSV = () => {
    if (individualLogs.length === 0) return;
    const headers = ["Employee ID", "Employee Name", "Date", "Login Time", "Logout Time", "Duration", "Status"];
    const rows = individualLogs.map((l) => [
      l.empId,
      getEmpName(l),
      l.date,
      fmtDateTime(l.loginTime),
      fmtDateTime(l.logoutTime),
      calcDuration(l.loginTime, l.logoutTime),
      l.status || "—",
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Report_${selectedEmpId}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic for Live Tab
  const liveFiltered = logs.filter((log) => {
    const matchSearch = !searchTerm ||
      (log.empId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.empName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = !filterDate || (log.date === filterDate);
    return matchSearch && matchDate;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case "Present": return { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle size={14} /> };
      case "Absent": return { color: "var(--danger)", bg: "rgba(239,68,68,0.1)", icon: <XCircle size={14} /> };
      case "In Progress": return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <Clock size={14} /> };
      default: return { color: "var(--text-muted)", bg: "#f1f5f9", icon: <Activity size={14} /> };
    }
  };

  return (
    <div className="animate-fade">
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "bold" }}>Monitoring & Reports</h1>
          <p style={{ color: "var(--text-muted)" }}>GPS-verified attendance tracking and individual reports</p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }} className="glass-card p-2">
        <button
          onClick={() => setActiveTab("live")}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: activeTab === "live" ? "var(--primary)" : "transparent",
            color: activeTab === "live" ? "white" : "var(--text-muted)",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s",
          }}
        >
          <Activity size={18} /> Daily Live Feed
        </button>
        <button
          onClick={() => setActiveTab("individual")}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: activeTab === "individual" ? "var(--primary)" : "transparent",
            color: activeTab === "individual" ? "white" : "var(--text-muted)",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s",
          }}
        >
          <FileText size={18} /> Individual Reports
        </button>
      </div>

      {/* ── LIVE VIEW TAB ── */}
      {activeTab === "live" && (
        <div className="animate-fade">
          {/* Filters */}
          <div className="glass-card p-5 mb-6" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 2, minWidth: "220px" }}>
              <label style={{ display: "block", fontSize: "13px", marginBottom: "8px", fontWeight: "600" }}>Search Employee</label>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Emp ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "13px", marginBottom: "8px", fontWeight: "600" }}>Specific Date</label>
              <input type="date" className="input-field" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            {filterDate && (
              <button className="btn btn-ghost" onClick={() => setFilterDate("")} style={{ color: "var(--danger)" }}>
                <X size={16} /> Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border-color)" }}>
                    {["Emp ID", "Name", "Check In", "Check Out", "Duration", "Status", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "16px", fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading feed...</td></tr>
                  ) : liveFiltered.length > 0 ? (
                    liveFiltered.map((log) => {
                      const style = getStatusStyle(log.status);
                      return (
                        <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "16px" }}><span className="badge-primary">{log.empId}</span></td>
                          <td style={{ padding: "16px", fontWeight: "600" }}>{getEmpName(log)}</td>
                          <td style={{ padding: "16px", fontSize: "13px" }}>{fmtDateTime(log.loginTime)}</td>
                          <td style={{ padding: "16px", fontSize: "13px" }}>
                            {log.logoutTime ? fmtDateTime(log.logoutTime) : <span style={{ color: "#f59e0b" }}>Active</span>}
                          </td>
                          <td style={{ padding: "16px", fontSize: "13px" }}>{calcDuration(log.loginTime, log.logoutTime)}</td>
                          <td style={{ padding: "16px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", background: style.bg, color: style.color, fontSize: "11px", fontWeight: "700" }}>
                              {style.icon} {log.status || "Present"}
                            </div>
                          </td>
                          <td style={{ padding: "16px" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => openEdit(log)} className="action-btn text-primary"><Edit3 size={15} /></button>
                              <button onClick={() => handleDelete(log.id)} className="action-btn text-danger"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="7" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL REPORT TAB ── */}
      {activeTab === "individual" && (
        <div className="animate-fade">
          <div className="glass-card p-6 mb-6">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", fontWeight: "700", textTransform: "uppercase", opacity: 0.6 }}>Employee</label>
                <select
                  className="input-field"
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.empId} value={e.empId}>
                      {e.empId} - {e.empName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", fontWeight: "700", textTransform: "uppercase", opacity: 0.6 }}>From Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={reportFromDate} 
                  onChange={(e) => setReportFromDate(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", fontWeight: "700", textTransform: "uppercase", opacity: 0.6 }}>To Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={reportToDate} 
                  onChange={(e) => setReportToDate(e.target.value)} 
                />
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                {(reportFromDate || reportToDate) && (
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => { setReportFromDate(""); setReportToDate(""); }}
                    style={{ color: "var(--danger)", padding: "0 12px" }}
                    title="Clear Date Filters"
                  >
                    <X size={18} />
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  disabled={individualLogs.length === 0}
                  onClick={downloadCSV}
                  style={{ flex: 1, whiteSpace: "nowrap" }}
                >
                  <Download size={18} /> Download CSV
                </button>
              </div>
            </div>

            {selectedEmpId && (
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px dashed var(--border-color)", display: "flex", gap: "32px", flexWrap: "wrap" }}>
                {[
                  { label: "Days in Range", val: individualLogs.length, icon: <Calendar size={18} />, color: "var(--primary)" },
                  { label: "Present (8h+)", val: individualLogs.filter(l => l.status === "Present").length, icon: <CheckCircle size={18} />, color: "#10b981" },
                  { label: "Incomplete", val: individualLogs.filter(l => l.status === "Absent").length, icon: <XCircle size={18} />, color: "var(--danger)" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: "800" }}>{s.val}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border-color)" }}>
                    {["Date", "Check In (12h)", "Check Out (12h)", "Duration", "Status"].map((h) => (
                      <th key={h} style={{ padding: "16px", fontSize: "12px", fontWeight: "700", opacity: 0.6, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center" }}>Loading history...</td></tr>
                  ) : !selectedEmpId ? (
                    <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Select an employee ID above to view history</td></tr>
                  ) : individualLogs.length > 0 ? (
                    individualLogs.map((l) => {
                      const style = getStatusStyle(l.status);
                      return (
                        <tr key={l.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "16px", fontWeight: "700" }}>{l.date}</td>
                          <td style={{ padding: "16px", fontSize: "13px" }}>{fmtDateTime(l.loginTime)}</td>
                          <td style={{ padding: "16px", fontSize: "13px" }}>{l.logoutTime ? fmtDateTime(l.logoutTime) : "—"}</td>
                          <td style={{ padding: "16px", fontSize: "13px" }}>{calcDuration(l.loginTime, l.logoutTime)}</td>
                          <td style={{ padding: "16px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "12px", background: style.bg, color: style.color, fontSize: "11px", fontWeight: "700" }}>
                              {style.icon} {l.status || "Present"}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>No records found for the selected criteria</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card p-8 w-full max-w-md animate-fade">
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Modify Attendance</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>Recalculates status based on 8h rule.</p>
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1 opacity-60 uppercase">Login</label>
              <input type="datetime-local" className="input-field" value={editData.loginTime} onChange={e => setEditData({...editData, loginTime: e.target.value})} />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold mb-1 opacity-60 uppercase">Logout</label>
              <input type="datetime-local" className="input-field" value={editData.logoutTime} onChange={e => setEditData({...editData, logoutTime: e.target.value})} />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold mb-1 opacity-60 uppercase">Manual Status Override</label>
              <select className="input-field" value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="CL">Casual Leave (CL)</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency">Emergency</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Leave">Leave (Weekend)</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn btn-ghost flex-1" onClick={() => setEditingLog(null)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleUpdate}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .badge-primary { background: rgba(37,99,235,0.1); color: var(--primary); padding: 3px 8px; borderRadius: 6px; fontSize: 13px; fontWeight: 700; }
        .action-btn { background: #f8fafc; border: none; padding: 7px; borderRadius: 8px; cursor: pointer; transition: 0.2s; }
        .action-btn:hover { background: #f1f5f9; transform: translateY(-1px); }
        .text-primary { color: var(--primary); }
        .text-danger { color: var(--danger); }
        .p-2 { padding: 8px; }
        .p-5 { padding: 20px; }
        .p-6 { padding: 24px; }
        .p-8 { padding: 32px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .pl-10 { padding-left: 40px; }
        .flex-1 { flex: 1; }
        .w-full { width: 100%; }
        .max-w-md { max-width: 448px; }
        .uppercase { text-transform: uppercase; }
        .font-bold { fontWeight: 700; }
        .text-xs { fontSize: 12px; }
      `}</style>
    </div>
  );
};

export default LoginMonitor;
