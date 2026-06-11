import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Wallet, CheckCircle, Clock, Calendar } from "lucide-react";

const EmployeeSalary = () => {
  const { currentUser } = useAuth();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (!currentUser?.empId) return;

    const q = query(
      collection(db, "salaries"),
      where("empId", "==", currentUser.empId),
      where("year", "==", filterYear),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setSalaries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, filterYear]);

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Salary History</h1>
          <p style={{ color: 'var(--text-muted)' }}>View your yearly earnings and payout status</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} color="var(--primary)" />
          <input 
            type="number" 
            className="input-field" 
            style={{ width: '120px' }} 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)} 
          />
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
              <th style={{ padding: '16px' }}>Month</th>
              <th style={{ padding: '16px' }}>Basic</th>
              <th style={{ padding: '16px' }}>Allowance</th>
              <th style={{ padding: '16px' }}>Deductions</th>
              <th style={{ padding: '16px' }}>Total Payout</th>
              <th style={{ padding: '16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((sal) => (
              <tr key={sal.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px', fontWeight: 'bold' }}>{sal.month}</td>
                <td style={{ padding: '16px' }}>₹{sal.basicSalary}</td>
                <td style={{ padding: '16px', color: 'var(--primary)' }}>+₹{sal.allowance}</td>
                <td style={{ padding: '16px', color: 'var(--danger)' }}>-₹{sal.deductions}</td>
                <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '18px', color: 'var(--primary)' }}>
                  ₹{parseFloat(sal.totalAmount).toLocaleString()}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default EmployeeSalary;