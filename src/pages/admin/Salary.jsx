import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  onSnapshot
} from "firebase/firestore";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  X
} from "lucide-react";

const SalaryManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    selectionType: "individual", // "individual" or "department"
    department: "",
    empId: "",
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    basicSalary: "",
    allowance: "0",
    deductions: "0",
    status: "Pending"
  });

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    // Real-time Employees
    const qEmps = query(collection(db, "employees"), orderBy("empId", "asc"));
    const unsubEmps = onSnapshot(qEmps, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Real-time Salaries
    const qSal = query(collection(db, "salaries"), orderBy("year", "desc"));
    const unsubSal = onSnapshot(qSal, (snap) => {
      setSalaries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubEmps();
      unsubSal();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (editingId) {
        const totalAmount = (Number(formData.basicSalary) || 0) + (Number(formData.allowance) || 0) - (Number(formData.deductions) || 0);
        await updateDoc(doc(db, "salaries", editingId), { ...formData, totalAmount, updatedAt: new Date().toISOString() });
        alert("Salary updated successfully!");
      } else {
        if (formData.selectionType === "department") {
          const deptEmps = employees.filter(e => e.department === formData.department && e.status !== "terminated");
          if (deptEmps.length === 0) throw new Error("No active employees found in this department.");

          const promises = deptEmps.map(emp => {
            const basic = Number(emp.basicSalary || formData.basicSalary || 0);
            const allow = Number(emp.allowance || formData.allowance || 0);
            const deduc = Number(emp.deductions || formData.deductions || 0);
            return addDoc(collection(db, "salaries"), {
              ...formData,
              empId: emp.empId,
              basicSalary: basic,
              allowance: allow,
              deductions: deduc,
              totalAmount: basic + allow - deduc,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          });
          await Promise.all(promises);
          alert(`Salary records created for ${deptEmps.length} employees!`);
        } else {
          const totalAmount = (Number(formData.basicSalary) || 0) + (Number(formData.allowance) || 0) - (Number(formData.deductions) || 0);
          await addDoc(collection(db, "salaries"), { ...formData, totalAmount, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
          alert("Salary added successfully!");
        }
      }

      closeModal();
    } catch (err) {
      alert("Error saving salary: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this salary record?")) {
      await deleteDoc(doc(db, "salaries", id));
    }
  };

  const openEdit = (salary) => {
    setFormData({
      empId: salary.empId,
      month: salary.month,
      year: salary.year,
      basicSalary: salary.basicSalary,
      allowance: salary.allowance,
      deductions: salary.deductions,
      status: salary.status
    });
    setEditingId(salary.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setEmpSearch("");
    setFormData({
      selectionType: "individual",
      department: "",
      empId: "",
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear().toString(),
      basicSalary: "",
      allowance: "0",
      deductions: "0",
      status: "Pending"
    });
  };

  const filteredSalaries = salaries.filter(s =>
    (s.empId || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Salary Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track and manage employee payouts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Add Payout
        </button>
      </div>

      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              placeholder="Search by Employee ID..."
              className="input-field"
              style={{ paddingLeft: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
              <th style={{ padding: '16px' }}>Employee</th>
              <th style={{ padding: '16px' }}>Period</th>
              <th style={{ padding: '16px' }}>Amount</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalaries.map((sal) => (
              <tr key={sal.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: '600' }}>{sal.empId}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px' }}>{sal.month} {sal.year}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{parseFloat(sal.totalAmount).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Basic: ₹{sal.basicSalary}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                    background: sal.status === 'Paid' ? 'var(--primary)20' : 'var(--accent)20',
                    color: sal.status === 'Paid' ? 'var(--primary)' : 'var(--accent)'
                  }}>
                    {sal.status === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {sal.status}
                  </span>
                </td>
                <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => openEdit(sal)}>
                    <Edit3 size={16} color="var(--primary)" />
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleDelete(sal.id)}>
                    <Trash2 size={16} color="var(--danger)" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredSalaries.length === 0 && !loading && (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No salary records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="glass-card animate-fade" style={{ width: '90%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
            <button onClick={closeModal} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px' }}>{editingId ? "Edit Salary" : "Add New Salary"}</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!editingId && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Payout Type</label>
                  <select
                    className="input-field"
                    value={formData.selectionType}
                    onChange={(e) => setFormData({ ...formData, selectionType: e.target.value, empId: "", department: "" })}
                  >
                    <option value="individual">Single Employee</option>
                    <option value="department">By Department (Bulk)</option>
                  </select>
                </div>
              )}

              {formData.selectionType === "department" ? (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Select Department</label>
                  <select
                    className="input-field" required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">-- Select Department --</option>
                    <option value="IT">IT Department</option>
                    <option value="HR">Human Resources</option>
                    <option value="Sales">Sales & Marketing</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Select Employee</label>
                  <input
                    type="text"
                    placeholder="Filter employee by ID/Name..."
                    className="input-field"
                    style={{ marginBottom: '8px', fontSize: '13px' }}
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                  />
                  <select
                    className="input-field" required={formData.selectionType === "individual"}
                    value={formData.empId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const emp = employees.find(ev => ev.empId === selectedId);
                      if (emp) {
                        setFormData({
                          ...formData,
                          empId: selectedId,
                          basicSalary: emp.basicSalary || "0",
                          allowance: emp.allowance || "0",
                          deductions: emp.deductions || "0"
                        });
                      } else {
                        setFormData({ ...formData, empId: selectedId });
                      }
                    }}
                    disabled={editingId}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees
                      .filter(emp => (emp.empId || "").toLowerCase().includes((empSearch || "").toLowerCase()) || (emp.empName || "").toLowerCase().includes((empSearch || "").toLowerCase()))
                      .map(emp => (
                        <option key={emp.id} value={emp.empId}>{emp.empName} ({emp.empId})</option>
                      ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Month</label>
                  <select className="input-field" value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })}>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Year</label>
                  <input type="number" className="input-field" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Basic Salary</label>
                  <input type="number" className="input-field" required value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Bonus/Allowance</label>
                  <input type="number" className="input-field" value={formData.allowance} onChange={(e) => setFormData({ ...formData, allowance: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Deductions</label>
                  <input type="number" className="input-field" value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Status</label>
                  <select className="input-field" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
                <button type="button" onClick={closeModal} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Save Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;
