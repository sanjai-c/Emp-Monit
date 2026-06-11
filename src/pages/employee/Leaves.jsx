import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot } from "firebase/firestore";
import { 
  Plus, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Calendar,
  X 
} from "lucide-react";

const LEAVE_LIMITS = {
  "Sick Leave": 5,
  "Casual Leave (CL)": 1,
  "Personal Leave": 2,
  "Emergency": 2
};

const EmployeeLeaves = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    leaveType: "Sick Leave",
    startDate: "",
    endDate: "",
    reason: ""
  });

  useEffect(() => {
    if (!currentUser?.empId) return;

    const q = query(
      collection(db, "leaveRequests"),
      where("empId", "==", currentUser.empId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedLeaves = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally by createdAt desc
      fetchedLeaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(fetchedLeaves);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching leave requests:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getUsedDaysForType = (type) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return requests
      .filter(req => {
        if (req.leaveType !== type) return false;
        if (req.status === "Rejected") return false;
        const reqDate = new Date(req.createdAt || req.startDate);
        return reqDate.getMonth() === currentMonth && reqDate.getFullYear() === currentYear;
      })
      .reduce((total, req) => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return total + diffDays;
      }, 0);
  };

  const getLimitForType = (type) => LEAVE_LIMITS[type] || 0;
  
  const currentTypeLimit = getLimitForType(formData.leaveType);
  const usedThisMonth = getUsedDaysForType(formData.leaveType);
  const remainingDays = Math.max(0, currentTypeLimit - usedThisMonth);

  const handleDateChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    
    if (field === "startDate" && newFormData.endDate && new Date(newFormData.endDate) < new Date(value)) {
      newFormData.endDate = value;
    }

    // Validation: Check if range exceeds remaining days
    if (newFormData.startDate && newFormData.endDate) {
      const start = new Date(newFormData.startDate);
      const end = new Date(newFormData.endDate);
      const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > remainingDays) {
        alert(`You only have ${remainingDays} days of ${formData.leaveType} remaining this month.`);
        // Auto-adjust endDate if it exceeds limit
        const adjustedEnd = new Date(start);
        adjustedEnd.setDate(start.getDate() + (remainingDays - 1));
        newFormData.endDate = adjustedEnd.toISOString().split("T")[0];
      }
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "leaveRequests"), {
        ...formData,
        empId: currentUser.empId,
        status: "Pending",
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ leaveType: "Sick Leave", startDate: "", endDate: "", reason: "" });
      alert("Leave request submitted successfully!");
    } catch (err) {
      alert("Error submitting request: " + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved": return { icon: <CheckCircle size={14} />, color: "var(--primary)", bg: "var(--primary)20" };
      case "Rejected": return { icon: <XCircle size={14} />, color: "var(--danger)", bg: "var(--danger)20" };
      default: return { icon: <Clock size={14} />, color: "var(--accent)", bg: "var(--accent)20" };
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Leave Requests</h1>
          <p style={{ color: 'var(--text-muted)' }}>Apply for leave and track your status</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ width: 'auto' }}
        >
          <Plus size={20} />
          Apply New
        </button>
      </div>

      <div className="glass-card">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
              <th style={{ padding: '16px' }}>Type</th>
              <th style={{ padding: '16px' }}>Duration</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Admin Response</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const badge = getStatusBadge(req.status);
              return (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600' }}>{req.leaveType}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {req.id.slice(0, 8)}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px' }}>{req.startDate} to {req.endDate}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      background: badge.bg, color: badge.color
                    }}>
                      {badge.icon} {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{req.adminMessage || "No message yet"}</p>
                  </td>
                </tr>
              )
            })}
            {requests.length === 0 && !loading && (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="glass-card animate-fade" style={{ width: '90%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px' }}>New Leave Request</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Leave Type</label>
                <select 
                  className="input-field" 
                  value={formData.leaveType}
                  onChange={(e) => setFormData({...formData, leaveType: e.target.value, startDate: "", endDate: ""})}
                >
                  {Object.keys(LEAVE_LIMITS).map(type => {
                    const remaining = Math.max(0, LEAVE_LIMITS[type] - getUsedDaysForType(type));
                    if (remaining <= 0) return null;
                    return <option key={type} value={type}>{type} ({remaining} days left)</option>;
                  })}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Max duration for this type: {remainingDays} days
                </p>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Start Date</label>
                  <input 
                    type="date" className="input-field" required
                    value={formData.startDate}
                    onChange={(e) => handleDateChange("startDate", e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>End Date</label>
                  <input 
                    type="date" className="input-field" required
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => handleDateChange("endDate", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Reason</label>
                <textarea 
                  className="input-field" rows="3" required
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Explain your reason for leave..."
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <Send size={18} />
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaves;
