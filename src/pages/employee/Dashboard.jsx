import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs, updateDoc, doc, orderBy, onSnapshot } from "firebase/firestore";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Briefcase,
  Star,
  Wallet
} from "lucide-react";

const EmployeeDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    attendanceStatus: "No Record",
    pendingTasks: 0,
    latestRating: 0,
    leaveStatus: "No Request",
    absentDays: 0,
    presentDays: 0,
    availableCL: 1,
    leaveBalances: {
      "Sick Leave": 5,
      "Casual Leave (CL)": 1,
      "Personal Leave": 2,
      "Emergency": 2
    },
    basicSalary: 0,
    netSalary: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [taskChartData, setTaskStats] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.empId) return;

    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // Salary Detail Initialization
    const basic = Number(currentUser.basicSalary || 0);
    const allow = Number(currentUser.allowance || 0);
    const deduc = Number(currentUser.deductions || 0);
    setStats(prev => ({ ...prev, basicSalary: basic, netSalary: (basic + allow - deduc) }));

    // Attendance Sync
    const qAtt = query(
      collection(db, "gpsAttendance"),
      where("empId", "==", currentUser.empId),
      where("date", "==", today)
    );
    const unsubAtt = onSnapshot(qAtt, (snap) => {
      const attStatus = snap.empty ? "Not Marked" : snap.docs[0].data().status;
      setStats(prev => ({ ...prev, attendanceStatus: attStatus }));
    });

    // Tasks Sync
    const qTasks = query(
      collection(db, "tasks"),
      where("assignedTo", "==", currentUser.empId)
    );
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const allTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pendingTasksList = allTasks.filter(t => t.status !== "Completed");
      const completedCount = allTasks.length - pendingTasksList.length;

      setStats(prev => ({ ...prev, pendingTasks: pendingTasksList.length, totalTasks: allTasks.length }));
      setRecentTasks(pendingTasksList.slice(0, 3));
      
      setTaskStats([
        { name: 'Completed', value: completedCount, color: '#10b981' },
        { name: 'Pending', value: pendingTasksList.length, color: '#6366f1' }
      ]);

      const priorities = ["High", "Normal", "Low"].map(p => ({
        name: p,
        count: allTasks.filter(t => t.priority === p).length
      }));
      setPriorityData(priorities);
      setLoading(false);
    });

    // Performance Sync
    const qPerf = query(
      collection(db, "performance"),
      where("empId", "==", currentUser.empId)
    );
    const unsubPerf = onSnapshot(qPerf, (snap) => {
      if (!snap.empty) {
        const perfData = snap.docs.map(doc => doc.data());
        perfData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setStats(prev => ({ ...prev, latestRating: perfData[0].rating }));
      }
    });

    // Monthly Statistics (CL and Absents)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const qStats = query(
      collection(db, "gpsAttendance"),
      where("empId", "==", currentUser.empId),
      where("date", ">=", startOfMonth)
    );
    const unsubStats = onSnapshot(qStats, (snap) => {
      let absents = 0;
      let present = 0;
      snap.docs.forEach(doc => {
        const status = doc.data().status;
        if (status === "Present") present++;
        if (status === "Absent") absents++;
      });
      setStats(prev => ({ ...prev, absentDays: absents, presentDays: present }));
    });

    // Leave Availability Sync
    const qLeaves = query(
      collection(db, "leaveRequests"),
      where("empId", "==", currentUser.empId)
    );
    const unsubLeaves = onSnapshot(qLeaves, (snap) => {
      const now = new Date();
      const balances = {
        "Sick Leave": 5,
        "Casual Leave (CL)": 1,
        "Personal Leave": 2,
        "Emergency": 2
      };
      
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === "Approved" || data.status === "Pending") {
          const reqDate = new Date(data.createdAt || data.startDate);
          if (reqDate.getMonth() === now.getMonth() && reqDate.getFullYear() === now.getFullYear()) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
            if (balances[data.leaveType] !== undefined) {
              balances[data.leaveType] = Math.max(0, balances[data.leaveType] - diffDays);
            }
          }
        }
      });
      setStats(prev => ({ ...prev, leaveBalances: balances }));
    });

    return () => {
      unsubAtt();
      unsubTasks();
      unsubPerf();
      unsubStats();
      unsubLeaves();
    };
  }, [currentUser]);

  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="glass-card" style={{ padding: '24px', flex: 1, minWidth: '240px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ background: `${color}20`, padding: '12px', borderRadius: '12px', color: color }}>
          <Icon size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{title}</p>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</h2>
          {subtext && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{subtext}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Welcome, {currentUser?.empName}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Here's your performance overview for today</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <StatCard title="Today's Attendance" value={stats.attendanceStatus} icon={Calendar} color="#10b981" />
        <StatCard title="Days Present" value={stats.presentDays} icon={CheckCircle} color="#10b981" subtext="Current Month" />
        <StatCard title="Pending Tasks" value={stats.pendingTasks} icon={Briefcase} color="#6366f1" />
        <StatCard title="Performance Rating" value={`${stats.latestRating}/5`} icon={Star} color="#f59e0b" subtext="Latest Review" />
        <StatCard title="Absent Days" value={stats.absentDays} icon={AlertCircle} color="var(--danger)" subtext="Current Month" />
        
        <div className="glass-card" style={{ padding: '20px', flex: '1.5', minWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ background: `var(--primary)15`, padding: '8px', borderRadius: '10px', color: 'var(--primary)' }}>
              <Calendar size={20} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Monthly Leave Balances</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {Object.entries(stats.leaveBalances).map(([type, bal]) => (
              <div key={type} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>{type}</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: bal > 0 ? 'var(--primary)' : 'var(--danger)' }}>{bal} Days Left</div>
              </div>
            ))}
          </div>
        </div>

        <StatCard title="Basic Salary" value={`₹${stats.basicSalary.toLocaleString()}`} icon={Wallet} color="var(--primary)" subtext={`Net: ₹${stats.netSalary.toLocaleString()}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} color="var(--primary)" /> Active Tasks
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTasks.map(task => (
              <div key={task.id} style={{
                padding: '16px', background: '#f8fafc', borderRadius: '12px',
                borderLeft: `4px solid ${task.priority === 'High' ? 'var(--danger)' : 'var(--primary)'}`,
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${task.priority === 'High' ? 'var(--danger)' : 'var(--primary)'}`
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{task.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Due: {task.dueDate}</div>
              </div>
            ))}
            {recentTasks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No pending tasks! Good job.</p>}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Task Completion</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskChartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {taskChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Tasks by Priority</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip cursor={{fill: 'rgba(37,99,235,0.05)'}} contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={index} fill={entry.name === 'High' ? 'var(--danger)' : 'var(--primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
