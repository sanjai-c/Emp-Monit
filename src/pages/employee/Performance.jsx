import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot } from "firebase/firestore";
import { Star, TrendingUp, Award, MessageSquare, Calendar } from "lucide-react";

const EmployeePerformance = () => {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [attendanceScore, setAttendanceScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.empId) return;

    const q = query(
      collection(db, "performance"),
      where("empId", "==", currentUser.empId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedPerf = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally by createdAt desc
      fetchedPerf.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReviews(fetchedPerf);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching performance reviews:", err);
      setLoading(false);
    });

    // Attendance-based performance calculation
    const qAtt = query(collection(db, "attendance"), where("empId", "==", currentUser.empId));
    const unsubAtt = onSnapshot(qAtt, (snap) => {
      if (snap.empty) return;
      const total = snap.size;
      const present = snap.docs.filter(d => d.data().status === "Present").length;
      const score = (present / total) * 5;
      setAttendanceScore(score.toFixed(1));
    });

    return () => {
      unsubscribe();
      unsubAtt();
    };
  }, [currentUser]);

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
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>My Performance</h1>
        <p style={{ color: 'var(--text-muted)' }}>Feedback and ratings from management</p>
      </div>

      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', borderLeft: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Attendance Consistency</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Score automatically generated based on your presence history</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent)' }}>{attendanceScore}/5.0</div>
            <RatingStars rating={Math.round(attendanceScore)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {reviews.map((rev) => (
          <div key={rev.id} className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--primary)20', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px' }}>{rev.month} {rev.year} Review</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {new Date(rev.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <RatingStars rating={rev.rating} />
            </div>
            
            <div className="glass-card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid var(--border-color)', borderLeft: '3px solid var(--primary)' }}>
              <p style={{ fontSize: '14px', lineHeight: '1.6', fontStyle: 'italic' }}>
                <MessageSquare size={14} style={{ marginRight: '8px', opacity: 0.5 }} />
                "{rev.feedback}"
              </p>
            </div>
          </div>
        ))}
        {reviews.length === 0 && !loading && <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>No reviews found. Keep up the good work!</div>}
      </div>
    </div>
  );
};

export default EmployeePerformance;
