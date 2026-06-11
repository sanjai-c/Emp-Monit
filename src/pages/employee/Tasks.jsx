import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs, updateDoc, doc, orderBy, onSnapshot } from "firebase/firestore";
import { Briefcase, CheckCircle2, Clock, PlayCircle, AlertCircle } from "lucide-react";

const EmployeeTasks = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.empId) return;

    const q = query(
      collection(db, "tasks"),
      where("assignedTo", "==", currentUser.empId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally to avoid Firebase Index requirement
      fetchedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTasks(fetchedTasks);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tasks:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const updateStatus = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
    } catch (err) {
      alert("Error updating task status: " + err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": return "var(--primary)";
      case "In Progress": return "var(--accent)";
      default: return "var(--text-muted)";
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>My Assignments</h1>
        <p style={{ color: 'var(--text-muted)' }}>Tasks and projects assigned to you</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {tasks.map((task) => (
          <div key={task.id} className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
               <span style={{ 
                background: task.priority === 'High' ? 'var(--danger)20' : 'var(--primary)20',
                color: task.priority === 'High' ? 'var(--danger)' : 'var(--primary)',
                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700'
               }}>
                {task.priority}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: getStatusColor(task.status) }}>
                {task.status === "Completed" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {task.status}
              </div>
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{task.title}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>{task.description}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
               <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                 Due: {new Date(task.dueDate).toLocaleDateString()}
               </div>
               <div style={{ display: 'flex', gap: '8px' }}>
                  {task.status === "Pending" && (
                    <button onClick={() => updateStatus(task.id, "In Progress")} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      <PlayCircle size={14} /> Start
                    </button>
                  )}
                  {task.status === "In Progress" && (
                    <button onClick={() => updateStatus(task.id, "Completed")} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      <CheckCircle2 size={14} /> Complete
                    </button>
                  )}
               </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && !loading && <div style={{ color: 'var(--text-muted)' }}>No tasks found.</div>}
      </div>
    </div>
  );
};

export default EmployeeTasks;
