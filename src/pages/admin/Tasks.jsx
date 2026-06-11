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
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  User, 
  Filter, 
  X, 
  Briefcase,
  Search
} from "lucide-react";

const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "", // empId
    dueDate: "",
    priority: "Normal",
    status: "Pending"
  });

  useEffect(() => {
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qEmps = query(collection(db, "employees"));
    const unsubEmps = onSnapshot(qEmps, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTasks();
      unsubEmps();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "tasks", editingId), formData);
      } else {
        await addDoc(collection(db, "tasks"), {
          ...formData,
          createdAt: new Date().toISOString(),
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ title: "", description: "", assignedTo: "", dueDate: "", priority: "Normal", status: "Pending" });
      fetchData();
    } catch (err) {
      alert("Error saving task: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this task?")) {
      await deleteDoc(doc(db, "tasks", id));
      fetchData();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed": return <CheckCircle2 size={16} color="var(--primary)" />;
      case "In Progress": return <Clock size={16} color="var(--accent)" />;
      default: return <AlertCircle size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Task Assignments</h1>
          <p style={{ color: 'var(--text-muted)' }}>Delegate and track progress</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '260px' }}>
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
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowModal(true); }}>
            <Plus size={20} />
            Assign Task
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {tasks
          .filter(task => task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((task) => (
          <div key={task.id} className="glass-card" style={{ padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <span style={{ 
                background: task.priority === 'High' ? 'var(--danger)20' : 'var(--primary)20',
                color: task.priority === 'High' ? 'var(--danger)' : 'var(--primary)',
                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase'
              }}>
                {task.priority}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setEditingId(task.id); setFormData(task); setShowModal(true); }} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(task.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{task.title}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>{task.description}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <User size={14} color="var(--primary)" />
                <span style={{ color: 'var(--text-muted)' }}>Assigned to:</span>
                <span style={{ fontWeight: '600' }}>{employees.find(e => e.empId === task.assignedTo)?.empName || task.assignedTo}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <Clock size={14} color="var(--accent)" />
                <span style={{ color: 'var(--text-muted)' }}>Due Date:</span>
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                {getStatusIcon(task.status)}
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ fontWeight: '600' }}>{task.status}</span>
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && !loading && (
          <div className="glass-card" style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center' }}>
            <Briefcase size={48} color="var(--glass-border)" style={{ marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-muted)' }}>No tasks assigned yet. Get started by clicking 'Assign Task'.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="glass-card animate-fade" style={{ width: '90%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px' }}>{editingId ? "Edit Task" : "Assign New Task"}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Task Title</label>
                <input 
                  type="text" className="input-field" required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Monthly Performance Report"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Assigned Employee</label>
                <select 
                  className="input-field" required
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.empId}>{emp.empName} ({emp.empId})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Due Date</label>
                  <input 
                    type="date" className="input-field" required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Priority</label>
                  <select 
                    className="input-field" 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {editingId && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Status</label>
                  <select 
                    className="input-field" 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Description</label>
                <textarea 
                  className="input-field" rows="3" required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editingId ? "Update Task" : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;
