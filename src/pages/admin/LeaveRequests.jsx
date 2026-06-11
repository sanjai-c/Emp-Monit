import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Calendar,
  X,
  FileText,
  Search,
  Edit3
} from "lucide-react";

const LeaveRequests = () => {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isAdminMessageModal, setIsAdminMessageModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const qLeave = collection(db, "leaveRequests");
    const unsubLeave = onSnapshot(qLeave, (snap) => {
      const fetchedRequests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(fetchedRequests);
      setLoading(false);
    });

    const qEmps = query(collection(db, "employees"));
    const unsubEmps = onSnapshot(qEmps, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubLeave();
      unsubEmps();
    };
  }, []);

  const handleAction = async (status) => {
    if (!selectedRequest) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, "leaveRequests", selectedRequest.id), {
        status,
        adminMessage,
        ...editData,
        updatedAt: new Date().toISOString()
      });

      // If Approved, sync with attendance
      if (status === "Approved") {
        const start = new Date(editData.startDate);
        const end = new Date(editData.endDate);
        const emp = employees.find(e => e.empId === selectedRequest.empId);
        
        let curr = new Date(start);
        while (curr <= end) {
          const dateStr = curr.toISOString().split("T")[0]; // YYYY-MM-DD
          const attDocId = `${selectedRequest.empId}_${dateStr}`;
          
          await setDoc(doc(db, "gpsAttendance", attDocId), {
            empId: selectedRequest.empId,
            empName: emp?.empName || "",
            date: dateStr,
            status: editData.leaveType,
            loginTime: null,
            logoutTime: null,
            loginLat: null,
            loginLng: null,
            logoutLat: null,
            logoutLng: null,
            syncSource: "LeaveRequest"
          }, { merge: true });
          
          curr.setDate(curr.getDate() + 1);
        }
      }

      setSelectedRequest(null);
      setAdminMessage("");
      alert(`Request ${status} successfully!`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = (req) => {
    setSelectedRequest(req);
    setEditData({
      leaveType: req.leaveType,
      startDate: req.startDate,
      endDate: req.endDate,
      reason: req.reason
    });
    setIsEditing(true);
  };

  const handleUpdateLeave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updateDoc(doc(db, "leaveRequests", selectedRequest.id), {
        ...editData,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
      setSelectedRequest(null);
      alert("Leave request updated successfully!");
    } catch (err) {
      alert("Error updating leave: " + err.message);
    } finally {
      setLoading(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Leave Applications</h1>
          <p style={{ color: 'var(--text-muted)' }}>Review and manage employee leave requests</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search Employee ID..."
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input-field"
            style={{ width: '180px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Casual Leave">Casual Leave (CL)</option>
            <option value="Personal Leave">Personal Leave</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
              <th style={{ padding: '16px' }}>Employee</th>
              <th style={{ padding: '16px' }}>Type / Range</th>
              <th style={{ padding: '16px' }}>Reason</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests
              .filter(req => {
                const matchesSearch = req.empId?.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesType = typeFilter === "" || req.leaveType === typeFilter;
                return matchesSearch && matchesType;
              })
              .map((req) => {
                const emp = employees.find(e => e.empId === req.empId);
                const badge = getStatusBadge(req.status);
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600' }}>{emp?.empName || "Employee"}</div>
                      <div style={{ fontSize: '12px', color: 'var(--primary)' }}>{req.empId}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>{req.leaveType}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.startDate} to {req.endDate}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <p style={{ fontSize: '13px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</p>
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
                      {req.status === "Pending" ? (
                        <button
                          onClick={() => handleEditOpen(req)}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditOpen(req)}
                          className="action-btn text-primary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            {requests.length === 0 && !loading && (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="glass-card animate-fade" style={{ width: '90%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setSelectedRequest(null)} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '16px' }}>Review Leave Request</h2>

            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-color)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>Leave Type</label>
                <select
                  className="input-field"
                  value={editData.leaveType}
                  onChange={(e) => setEditData({ ...editData, leaveType: e.target.value })}
                >
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>Start Date</label>
                  <input
                    type="date" className="input-field" required
                    value={editData.startDate}
                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>End Date</label>
                  <input
                    type="date" className="input-field" required
                    value={editData.endDate}
                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>Reason</label>
                <textarea
                  className="input-field" rows="3" required
                  value={editData.reason}
                  onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Admin Message (Optional)</label>
              <textarea
                className="input-field" rows="2"
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder="Add a reason for approval or rejection..."
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => handleAction("Rejected")} className="btn" style={{ flex: 1, background: 'var(--danger)20', color: 'var(--danger)', border: '1px solid var(--danger)40', justifyContent: 'center' }}>
                Reject
              </button>
              <button onClick={() => handleAction("Approved")} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
