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
  Star, 
  TrendingUp, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X,
  Award,
  MessageSquare
} from "lucide-react";

const PerformanceReview = () => {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    empId: "",
    rating: 5,
    feedback: "",
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    const qReviews = query(collection(db, "performance"), orderBy("createdAt", "desc"));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qEmps = query(collection(db, "employees"));
    const unsubEmps = onSnapshot(qEmps, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubReviews();
      unsubEmps();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "performance", editingId), formData);
      } else {
        await addDoc(collection(db, "performance"), {
          ...formData,
          createdAt: new Date().toISOString(),
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ empId: "", rating: 5, feedback: "", month: "April", year: "2026" });
      fetchData();
    } catch (err) {
      alert("Error saving review: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this performance review?")) {
      await deleteDoc(doc(db, "performance", id));
      fetchData();
    }
  };

  const RatingStars = ({ rating }) => (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          size={16} 
          fill={star <= rating ? "var(--accent)" : "none"}
          color={star <= rating ? "var(--accent)" : "var(--text-muted)"}
        />
      ))}
    </div>
  );

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Performance Reviews</h1>
          <p style={{ color: 'var(--text-muted)' }}>Evaluate and encourage workforce growth</p>
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
            New Review
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
              <th style={{ padding: '16px' }}>Employee</th>
              <th style={{ padding: '16px' }}>Period</th>
              <th style={{ padding: '16px' }}>Rating</th>
              <th style={{ padding: '16px' }}>Feedback Preview</th>
              <th style={{ padding: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews
              .filter(rev => rev.empId.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((rev) => {
              const emp = employees.find(e => e.empId === rev.empId);
              return (
                <tr key={rev.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600' }}>{emp?.empName || "Employee"}</div>
                    <div style={{ fontSize: '12px', color: 'var(--primary)' }}>{rev.empId}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px' }}>{rev.month} {rev.year}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <RatingStars rating={rev.rating} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rev.feedback}
                    </p>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => { setEditingId(rev.id); setFormData(rev); setShowModal(true); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(rev.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {reviews.length === 0 && !loading && (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No performance reviews available.</td></tr>
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
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px' }}>{editingId ? "Edit Review" : "Create Performance Review"}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Employee</label>
                <select 
                  className="input-field" required
                  value={formData.empId}
                  onChange={(e) => setFormData({...formData, empId: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.empId}>{emp.empName} ({emp.empId})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Month</label>
                  <select className="input-field" value={formData.month} onChange={(e) => setFormData({...formData, month: e.target.value})}>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Year</label>
                  <input type="text" className="input-field" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} maxLength="4" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Rating Score (1-5)</label>
                <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s} type="button"
                      onClick={() => setFormData({...formData, rating: s})}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Star size={32} fill={s <= formData.rating ? "var(--accent)" : "none"} color={s <= formData.rating ? "var(--accent)" : "var(--text-muted)"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Feedback & Comments</label>
                <textarea 
                  className="input-field" rows="4" required
                  value={formData.feedback}
                  onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                  placeholder="Summarize the employee's performance, strengths, and areas for improvement..."
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editingId ? "Update Review" : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceReview;
