import React, { useEffect, useState } from "react";
import { Users, UserCheck, UserPlus, Clock } from "lucide-react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "../../firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const data = [
    { name: 'Present', value: stats.presentToday, color: '#10b981' },
    { name: 'Absent', value: stats.absentToday, color: '#ef4444' },
    { name: 'Leave', value: stats.onLeaveToday, color: '#f59e0b' },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const empSnap = await getDocs(collection(db, "employees"));
        const total = empSnap.size;

        const today = new Date().toISOString().split('T')[0];
        const attSnap = await getDocs(query(collection(db, "attendance"), where("date", "==", today)));
        
        let present = 0, absent = 0, leave = 0;
        attSnap.forEach(doc => {
          const status = doc.data().status;
          if (status === 'Present') present++;
          else if (status === 'Absent') absent++;
          else leave++;
        });

        setStats({
          totalEmployees: total,
          presentToday: present,
          absentToday: total - present - leave, // Simplified for now
          onLeaveToday: leave
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-card" style={{ padding: '24px', flex: 1, minWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>{title}</p>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{value}</h2>
        </div>
        <div style={{ background: `${color}20`, padding: '12px', borderRadius: '12px', color: color }}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time statistics of your workforce</p>
        </div>
        <button 
          onClick={() => navigate('/admin/employees')}
          className="btn btn-primary"
        >
          <UserPlus size={20} />
          Add Employee
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <StatCard title="Total Employees" value={stats.totalEmployees} icon={Users} color="#6366f1" />
        <StatCard title="Present Today" value={stats.presentToday} icon={UserCheck} color="#10b981" />
        <StatCard title="On Leave" value={stats.onLeaveToday} icon={Clock} color="#f59e0b" />
        <StatCard title="Absentees" value={stats.absentToday} icon={Users} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Today's Attendance Status</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  itemStyle={{ color: '#1e293b' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={() => navigate('/admin/attendance')} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Mark Attendance</button>
            <button onClick={() => navigate('/admin/tasks')} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Assign New Task</button>
            <button onClick={() => navigate('/admin/leaves')} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Review Leave Requests</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
