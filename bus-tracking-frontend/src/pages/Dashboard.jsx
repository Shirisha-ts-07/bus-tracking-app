import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

function Dashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link
              to="/"
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "rgba(239, 68, 68, 0.15)",
                color: "var(--danger)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>Welcome to your Dashboard</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              You are successfully authenticated!
            </p>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">Authentication Status</div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Status:</span>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>Authenticated</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Token:</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
                    {token ? `${token.substring(0, 20)}...` : "No token"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">Quick Actions</div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 12 }}>
                <Link
                  to="/"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(79,124,255,0.15)",
                    color: "#dbe5ff",
                    textDecoration: "none",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  View Bus Tracker
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

