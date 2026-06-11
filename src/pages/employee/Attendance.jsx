import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  MapPin,
  LogIn,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Navigation,
  WifiOff,
} from "lucide-react";

// ─── Company Location (IQRA ONLINE ARABIC ACADEMY) ───────────────────────────
const COMPANY_LAT = 12.9898271;
const COMPANY_LNG = 80.2096522;
const ALLOWED_RADIUS_M = 50; // metres
const MIN_PRESENT_HOURS = 8;
// ──────────────────────────────────────────────────────────────────────────────

/** Haversine distance in metres between two lat/lng pairs */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calcDuration = (loginTime, logoutTime) => {
  if (!loginTime || !logoutTime) return null;
  const diff = new Date(logoutTime) - new Date(loginTime);
  if (diff < 0) return null;
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${hrs}h ${mins}m ${secs}s`;
};

// ─── GPS Status Badge ─────────────────────────────────────────────────────────
const GpsBadge = ({ state }) => {
  const cfg = {
    idle: { color: "var(--text-muted)", bg: "#f1f5f9", icon: <Navigation size={14} />, text: "Waiting for GPS" },
    fetching: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <Navigation size={14} style={{ animation: "spin 1s linear infinite" }} />, text: "Requesting GPS..." },
    inside: { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle size={14} />, text: "Inside company zone ✓" },
    outside: { color: "var(--danger)", bg: "rgba(239,68,68,0.1)", icon: <XCircle size={14} />, text: "Outside company zone ✗" },
    denied: { color: "var(--danger)", bg: "rgba(239,68,68,0.1)", icon: <WifiOff size={14} />, text: "Location access denied" },
  };
  const c = cfg[state] || cfg.idle;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        borderRadius: "20px",
        background: c.bg,
        color: c.color,
        fontSize: "13px",
        fontWeight: "600",
      }}
    >
      {c.icon}
      {c.text}
    </div>
  );
};

// ─── Live Clock ───────────────────────────────────────────────────────────────
const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Split into time vs AM/PM for styling
  const parts = timeStr.split(" ");
  const hms = parts[0];
  const ampm = parts[1] || "";

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "52px",
          fontWeight: "800",
          letterSpacing: "-2px",
          color: "var(--primary)",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {hms}
        <span style={{ fontSize: "24px", opacity: 0.8, marginLeft: "8px", fontWeight: "700" }}>{ampm}</span>
      </div>
      <div
        style={{
          marginTop: "8px",
          fontSize: "15px",
          color: "var(--text-muted)",
          fontWeight: "500",
        }}
      >
        {now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const EmployeeGPSAttendance = () => {
  const { currentUser } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingRec, setLoadingRec] = useState(true);
  const [gpsState, setGpsState] = useState("idle");
  const [gpsMsg, setGpsMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const iframeRef = useRef(null);

  const todayStr = new Date().toLocaleDateString("en-CA");
  const docId = `${currentUser?.empId}_${todayStr}`;

  // ── Realtime today's record ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.empId) return;
    setLoadingRec(true);
    const unsubToday = onSnapshot(
      doc(db, "gpsAttendance", docId),
      (snap) => {
        setTodayRecord(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoadingRec(false);
      },
      (err) => {
        console.error(err);
        setLoadingRec(false);
      }
    );
    return () => unsubToday();
  }, [currentUser, docId]);

  // ── History (past records) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.empId) return;
    const q = query(
      collection(db, "gpsAttendance"),
      where("empId", "==", currentUser.empId),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setHistory(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.date !== todayStr)
          .slice(0, 30)
      );
    });
    return () => unsub();
  }, [currentUser, todayStr]);

  // ── Auto-Mark Attendance (Weekends as Leave, Missing Weekdays as Absent) ──
  useEffect(() => {
    if (!currentUser?.empId || loadingRec) return;
  
    const syncAttendanceStatus = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const todayDate = now.getDate();
  
      // Iterate through all days in current month UP TO YESTERDAY
      // We don't mark TODAY as absent yet to give the user time to check in
      for (let d = 1; d < todayDate; d++) {
        const date = new Date(year, month, d);
        const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
        const dateStr = date.toLocaleDateString("en-CA");
        const attId = `${currentUser.empId}_${dateStr}`;
        
        // Check if record already exists in history or today (though today is excluded by d < todayDate)
        const existsInHistory = history.some(r => r.date === dateStr);
        const isTodayRecord = todayRecord && todayRecord.date === dateStr;
  
        if (!existsInHistory && !isTodayRecord) {
          const status = (dayOfWeek === 0 || dayOfWeek === 6) ? "Leave" : "Absent";
          try {
            await setDoc(doc(db, "gpsAttendance", attId), {
              empId: currentUser.empId,
              empName: currentUser.empName || "",
              date: dateStr,
              status: status,
              loginTime: null,
              logoutTime: null,
              loginLat: null,
              loginLng: null,
              logoutLat: null,
              logoutLng: null,
              syncSource: "AutoSync"
            }, { merge: true });
          } catch (err) {
            console.error(`Auto-marking ${status} failed:`, err);
          }
        }
      }
    };
  
    syncAttendanceStatus();
  }, [currentUser, history, todayRecord, loadingRec]);

  // ── GPS helper ─────────────────────────────────────────────────────────────
  const getGPS = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });

  // ── Check In ──────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setGpsMsg("");
    setGpsState("fetching");
    setActionLoading(true);
    try {
      const { lat, lng } = await getGPS();
      const dist = haversineDistance(lat, lng, COMPANY_LAT, COMPANY_LNG);

      if (dist > ALLOWED_RADIUS_M) {
        setGpsState("outside");
        setGpsMsg(
          `You are ${Math.round(dist)} m away from the company. Must be within ${ALLOWED_RADIUS_M} m.`
        );
        return;
      }

      setGpsState("inside");
      const loginTime = new Date().toISOString();
      await setDoc(doc(db, "gpsAttendance", docId), {
        empId: currentUser.empId,
        empName: currentUser.empName || "",
        date: todayStr,
        loginTime: loginTime,
        loginLat: lat,
        loginLng: lng,
        logoutTime: null,
        logoutLat: null,
        logoutLng: null,
        status: "In Progress",
      });
      setGpsMsg(`Check-in successful! Checked in at ${new Date(loginTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}. You were ${Math.round(dist)} m from the company.`);
    } catch (err) {
      if (err.code === 1) {
        setGpsState("denied");
        setGpsMsg("Location access was denied. Please allow location access and try again.");
      } else {
        setGpsState("idle");
        setGpsMsg("Error getting location: " + err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ── Check Out ─────────────────────────────────────────────────────────────
  const handleCheckOut = async () => {
    setGpsMsg("");
    setGpsState("fetching");
    setActionLoading(true);
    try {
      const { lat, lng } = await getGPS();
      const dist = haversineDistance(lat, lng, COMPANY_LAT, COMPANY_LNG);

      if (dist > ALLOWED_RADIUS_M) {
        setGpsState("outside");
        setGpsMsg(
          `You are ${Math.round(dist)} m away. Must be within ${ALLOWED_RADIUS_M} m to check out.`
        );
        return;
      }

      setGpsState("inside");
      const logoutTime = new Date().toISOString();
      const durationMs = new Date(logoutTime) - new Date(todayRecord.loginTime);
      const isPresent = durationMs >= MIN_PRESENT_HOURS * 60 * 60 * 1000;

      await updateDoc(doc(db, "gpsAttendance", docId), {
        logoutTime,
        logoutLat: lat,
        logoutLng: lng,
        status: isPresent ? "Present" : "Absent",
      });
      setGpsMsg(isPresent 
        ? `Check-out successful! Status: PRESENT. You worked 8+ hours.` 
        : `Check-out successful! Status: ABSENT. Working duration was less than 8 hours.`);
    } catch (err) {
      if (err.code === 1) {
        setGpsState("denied");
        setGpsMsg("Location access was denied. Please allow location access and try again.");
      } else {
        setGpsState("idle");
        setGpsMsg("Error getting location: " + err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const canCheckIn = !todayRecord;
  const canCheckOut = !!todayRecord && !todayRecord.logoutTime;
  const alreadyDone = !!todayRecord && !!todayRecord.logoutTime;

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${
    COMPANY_LNG - 0.003
  }%2C${COMPANY_LAT - 0.003}%2C${COMPANY_LNG + 0.003}%2C${
    COMPANY_LAT + 0.003
  }&layer=mapnik&marker=${COMPANY_LAT}%2C${COMPANY_LNG}`;

  const getStatusColor = (status) => {
    switch (status) {
      case "Present": return "#10b981";
      case "Absent": return "var(--danger)";
      case "In Progress": return "#f59e0b";
      default: return "var(--text-muted)";
    }
  };

  return (
    <div className="animate-fade">
      {/* Page Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold" }}>Attendance</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Check in & out with GPS verification (Min 8 hours for Present status)
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          marginBottom: "28px",
        }}
        className="attendance-grid"
      >
        {/* ── Left: Clock + Actions ─────────────────────────────────────── */}
        <div className="glass-card" style={{ padding: "32px" }}>
          {/* Live Clock */}
          <LiveClock />

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "var(--border-color)",
              margin: "28px 0",
            }}
          />

          {/* Status for today */}
          {loadingRec ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>
              Loading today's record…
            </div>
          ) : alreadyDone ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                background: `${getStatusColor(todayRecord.status)}08`,
                borderRadius: "12px",
                border: `1px solid ${getStatusColor(todayRecord.status)}25`,
                marginBottom: "20px",
              }}
            >
              {todayRecord.status === "Present" ? (
                <CheckCircle size={36} color="#10b981" style={{ margin: "0 auto 12px", display: "block" }} />
              ) : (
                <XCircle size={36} color="var(--danger)" style={{ margin: "0 auto 12px", display: "block" }} />
              )}
              <div style={{ fontWeight: "700", fontSize: "16px", color: getStatusColor(todayRecord.status) }}>
                Attendance: {todayRecord.status.toUpperCase()}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
                In: {fmtDateTime(todayRecord.loginTime)}<br />
                Out: {fmtDateTime(todayRecord.logoutTime)}<br />
                Duration: {calcDuration(todayRecord.loginTime, todayRecord.logoutTime)}
              </div>
            </div>
          ) : todayRecord ? (
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                background: "rgba(245,158,11,0.06)",
                borderRadius: "12px",
                border: "1px solid rgba(245,158,11,0.25)",
                marginBottom: "20px",
              }}
            >
              <Clock size={28} color="#f59e0b" style={{ margin: "0 auto 8px", display: "block" }} />
              <div style={{ fontWeight: "700", fontSize: "14px", color: "#f59e0b" }}>
                Session In Progress
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Checked in at {fmtDateTime(todayRecord.loginTime)}
              </div>
            </div>
          ) : null}

          {/* GPS State Badge */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <GpsBadge state={gpsState} />
          </div>

          {/* GPS Message */}
          {gpsMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background:
                  gpsState === "inside"
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(239,68,68,0.08)",
                border: `1px solid ${gpsState === "inside" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                color:
                  gpsState === "inside" ? "#10b981" : "var(--danger)",
                fontSize: "13px",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              <AlertCircle size={14} style={{ display: "inline", marginRight: "6px" }} />
              {gpsMsg}
            </div>
          )}

          {/* Action Buttons */}
          {!alreadyDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Check In */}
              <button
                onClick={handleCheckIn}
                disabled={!canCheckIn || actionLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "16px 24px",
                  borderRadius: "14px",
                  border: "none",
                  cursor: canCheckIn && !actionLoading ? "pointer" : "not-allowed",
                  background: canCheckIn
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "#e2e8f0",
                  color: canCheckIn ? "#fff" : "var(--text-muted)",
                  fontWeight: "700",
                  fontSize: "16px",
                  boxShadow: canCheckIn
                    ? "0 8px 24px rgba(16,185,129,0.35)"
                    : "none",
                  transition: "all 0.2s ease",
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                <LogIn size={20} />
                {actionLoading && gpsState === "fetching" && canCheckIn
                  ? "Getting Location…"
                  : todayRecord
                  ? `Checked In at ${new Date(todayRecord.loginTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`
                  : "Check In"}
              </button>

              {/* Check Out */}
              <button
                onClick={handleCheckOut}
                disabled={!canCheckOut || actionLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "16px 24px",
                  borderRadius: "14px",
                  border: "none",
                  cursor: canCheckOut && !actionLoading ? "pointer" : "not-allowed",
                  background: canCheckOut
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : "#e2e8f0",
                  color: canCheckOut ? "#fff" : "var(--text-muted)",
                  fontWeight: "700",
                  fontSize: "16px",
                  boxShadow: canCheckOut
                    ? "0 8px 24px rgba(239,68,68,0.35)"
                    : "none",
                  transition: "all 0.2s ease",
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                <LogOut size={20} />
                {actionLoading && gpsState === "fetching" && canCheckOut
                  ? "Getting Location…"
                  : !todayRecord
                  ? "Check In First"
                  : "Check Out"}
              </button>
            </div>
          )}

          {/* Location info note */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--text-muted)",
              justifyContent: "center",
            }}
          >
            <MapPin size={13} />
            Must be within {ALLOWED_RADIUS_M} m of company and work 8h for Present status.
          </div>
        </div>

        {/* ── Right: Map ───────────────────────────────────────────────────── */}
        <div
          className="glass-card"
          style={{ padding: "24px", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(37,99,235,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "15px" }}>
                Company Location
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {COMPANY_LAT.toFixed(4)}°N, {COMPANY_LNG.toFixed(4)}°E
              </div>
            </div>
          </div>

          {/* Map embed */}
          <div
            style={{
              flex: 1,
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid var(--border-color)",
              minHeight: "280px",
              position: "relative",
            }}
          >
            {!mapLoaded && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f1f5f9",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                  gap: "8px",
                }}
              >
                <Navigation size={16} />
                Loading map…
              </div>
            )}
            <iframe
              ref={iframeRef}
              title="Company Location Map"
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: "none", display: "block", minHeight: "280px" }}
              onLoad={() => setMapLoaded(true)}
              allowFullScreen
            />
          </div>

          {/* Radius ring note */}
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              background: "rgba(37,99,235,0.06)",
              borderRadius: "10px",
              fontSize: "12px",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Navigation size={13} />
            Must be within {ALLOWED_RADIUS_M} metres of the pin to check in/out.
          </div>
        </div>
      </div>

      {/* ── Attendance History ─────────────────────────────────────────────── */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Calendar size={18} color="var(--primary)" />
          <h2 style={{ fontSize: "16px", fontWeight: "700" }}>
            Attendance History (Ordered by Date)
          </h2>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              minWidth: "620px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Date", "Check In", "Check Out", "Duration", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 20px",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {/* Today's record always at top */}
              {todayRecord && (
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    background: "rgba(37,99,235,0.03)",
                  }}
                >
                  <td style={{ padding: "14px 20px", fontWeight: "600" }}>
                    {fmtDate(todayRecord.date)}
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        background: "rgba(37,99,235,0.1)",
                        color: "var(--primary)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: "700",
                      }}
                    >
                      Today
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                    {fmtDateTime(todayRecord.loginTime)}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                    {todayRecord.logoutTime ? fmtDateTime(todayRecord.logoutTime) : (
                      <span style={{ color: "#f59e0b", fontWeight: "600" }}>In Progress</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--text-muted)" }}>
                    {calcDuration(todayRecord.loginTime, todayRecord.logoutTime) || "Calculating…"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: `${getStatusColor(todayRecord.status)}15`,
                        color: getStatusColor(todayRecord.status),
                      }}
                    >
                      {todayRecord.status}
                    </span>
                  </td>
                </tr>
              )}

              {history.length > 0 ? (
                history.map((rec) => (
                  <tr
                    key={rec.id}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td style={{ padding: "14px 20px", fontWeight: "600" }}>
                      {fmtDate(rec.date)}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                      {fmtDateTime(rec.loginTime)}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                      {rec.logoutTime ? fmtDateTime(rec.logoutTime) : "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--text-muted)" }}>
                      {calcDuration(rec.loginTime, rec.logoutTime) || "—"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: `${getStatusColor(rec.status)}15`,
                          color: getStatusColor(rec.status),
                        }}
                      >
                        {rec.status || "Present"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                !todayRecord && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "60px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      <Calendar
                        size={36}
                        style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }}
                      />
                      No attendance records yet
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsive grid style */}
      <style>{`
        @media (max-width: 768px) {
          .attendance-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeGPSAttendance;