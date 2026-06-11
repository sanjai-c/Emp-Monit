import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  runTransaction,
  onSnapshot
} from "firebase/firestore";
import { UserPlus, Edit2, Trash2, X, Search, Building, Phone, MapPin, ShieldOff, ShieldCheck } from "lucide-react";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [nextEmpId, setNextEmpId] = useState("");

  const [formData, setFormData] = useState({
    empName: "",
    mobileNumber: "",
    department: "",
    address: "",
    basicSalary: "25000",
    allowance: "5000",
    deductions: "1000",
    password: ""
  });

  useEffect(() => {
    const q = query(collection(db, "employees"), orderBy("empId", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(emps);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching employees:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!editingId && formData.empName && nextEmpId) {
      const namePart = formData.empName.replace(/\s+/g, '').substring(0, 4);
      const idPart = nextEmpId.slice(-3);
      setFormData(prev => ({ ...prev, password: namePart + idPart }));
    }
  }, [formData.empName, nextEmpId, editingId]);

  const peekNextEmpId = async () => {
    const configRef = doc(db, "config", "employee_count");
    try {
      const configDoc = await getDoc(configRef);
      let nextId = 1;
      if (configDoc.exists()) {
        nextId = configDoc.data().lastId + 1;
      }
      return `EMP${nextId.toString().padStart(3, '0')}`;
    } catch (e) {
      return `EMP${(employees.length + 1).toString().padStart(3, '0')}`;
    }
  };

  const generateNextEmpId = async () => {
    const configRef = doc(db, "config", "employee_count");
    try {
      return await runTransaction(db, async (transaction) => {
        const configDoc = await transaction.get(configRef);
        let nextId = 1;
        if (configDoc.exists()) {
          nextId = configDoc.data().lastId + 1;
        }
        transaction.set(configRef, { lastId: nextId }, { merge: true });
        return `EMP${nextId.toString().padStart(3, '0')}`;
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
      // Fallback: check length of current employees
      return `EMP${(employees.length + 1).toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "employees", editingId), formData);
      } else {
        const empId = await generateNextEmpId();
        await addDoc(collection(db, "employees"), {
          ...formData,
          empId,
          role: "employee",
          status: "active",
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ empName: "", mobileNumber: "", department: "", address: "", basicSalary: "25000", allowance: "5000", deductions: "1000", password: "" });
    } catch (err) {
      alert("Error saving employee: " + err.message);
    }
  };

  const handleEdit = (emp) => {
    setEditingId(emp.id);
    setFormData({
      empName: emp.empName,
      mobileNumber: emp.mobileNumber,
      department: emp.department,
      address: emp.address,
      basicSalary: emp.basicSalary || "0",
      allowance: emp.allowance || "0",
      deductions: emp.deductions || "0"
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "terminated" ? "active" : "terminated";
    const confirmMsg = newStatus === "terminated"
      ? "Are you sure you want to terminate this employee? They will no longer be able to login."
      : "Are you sure you want to reactivate this employee?";

    if (window.confirm(confirmMsg)) {
      try {
        await updateDoc(doc(db, "employees", id), { status: newStatus });
      } catch (err) {
        alert("Error updating status: " + err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      await deleteDoc(doc(db, "employees", id));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.empName || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      (emp.empId || "").toLowerCase().includes((searchTerm || "").toLowerCase());
    const matchesDept = deptFilter === "" || emp.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Employee Directory</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your workforce records</p>
        </div>
        <button className="btn btn-primary" onClick={async () => {
          setEditingId(null);
          const predId = await peekNextEmpId();
          setNextEmpId(predId);
          setFormData({ empName: "", mobileNumber: "", department: "", address: "", basicSalary: "25000", allowance: "5000", deductions: "1000", password: "" });
          setShowModal(true);
        }}>
          <UserPlus size={20} />
          Add Employee
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by name or ID..."
            className="input-field"
            style={{ paddingLeft: '48px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input-field"
          style={{ width: '200px' }}
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="IT">IT Department</option>
          <option value="HR">Human Resources</option>
          <option value="Sales">Sales & Marketing</option>
          <option value="Finance">Finance</option>
        </select>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
              <th style={{ padding: '16px' }}>ID</th>
              <th style={{ padding: '16px' }}>Name</th>
              <th style={{ padding: '16px' }}>Department</th>
              <th style={{ padding: '16px' }}>Joined Date</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px', fontWeight: '600', color: 'var(--primary)' }}>{emp.empId}</td>
                <td style={{ padding: '16px' }}>{emp.empName}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ background: '#eff6ff', color: 'var(--primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', border: '1px solid #bfdbfe' }}>
                    {emp.department}
                  </span>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                  {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    background: emp.status === 'terminated' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: emp.status === 'terminated' ? 'var(--danger)' : '#22c55e',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: `1px solid ${emp.status === 'terminated' ? 'var(--danger)' : '#22c55e'}`
                  }}>
                    {(emp.status || 'active').toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => handleToggleStatus(emp.id, emp.status || 'active')}
                      title={emp.status === 'terminated' ? "Activate" : "Terminate"}
                      style={{ color: emp.status === 'terminated' ? '#22c55e' : 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {emp.status === 'terminated' ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                    </button>
                    <button onClick={() => handleEdit(emp)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(emp.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}>Loading employees...</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="glass-card animate-fade" style={{ width: '90%', maxWidth: '500px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px' }}>{editingId ? "Edit Employee" : "Add New Employee"}</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Full Name</label>
                <input
                  type="text" className="input-field" required
                  value={formData.empName}
                  onChange={(e) => setFormData({ ...formData, empName: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Mobile Number</label>
                <input
                  type="text" className="input-field" required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Department</label>
                <select
                  className="input-field" required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  <option value="" disabled>Select Department</option>
                  <option value="IT">IT Department</option>
                  <option value="HR">Human Resources</option>
                  <option value="Sales">Sales & Marketing</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Address</label>
                <textarea
                  className="input-field" required rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Basic Salary</label>
                  <input
                    type="number" className="input-field" required
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Allowance</label>
                  <input
                    type="number" className="input-field" required
                    value={formData.allowance}
                    onChange={(e) => setFormData({ ...formData, allowance: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Deductions</label>
                <input
                  type="number" className="input-field" required
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                />
              </div>

              {!editingId && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--primary)' }}>Auto-Generated Password</label>
                  <input
                    type="text" className="input-field" disabled
                    value={formData.password}
                    style={{ background: '#f1f5f9', cursor: 'not-allowed', color: 'var(--primary)', fontWeight: 'bold', border: '1.5px solid var(--border-color)' }}
                    placeholder="Enter name to generate..."
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Pattern: First 4 letters of name + last 3 digits of ID ({nextEmpId})
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editingId ? "Update" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
