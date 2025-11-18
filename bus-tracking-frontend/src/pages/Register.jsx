import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Get the FastAPI backend URL - default to port 8000
  const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || "http://127.0.0.1:8000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/register`, {
        name,
        email,
        phone: phone || undefined, // phone is optional
        password,
      });

      // On successful registration, redirect to login
      navigate("/login", { state: { message: "Registration successful! Please login." } });
    } catch (err) {
      console.error("Registration error:", err);
      
      if (err.response?.status === 400) {
        setError(err.response.data.detail || "Registration failed. Email may already be registered.");
      } else if (err.response?.status === 500) {
        setError(err.response.data.detail || "Server error. Please try again later.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === "ECONNREFUSED" || err.message?.includes("Network Error")) {
        setError("Cannot connect to server. Please make sure the backend is running on port 8000.");
      } else if (err.message) {
        setError(`Registration failed: ${err.message}`);
      } else {
        setError("Registration failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: "0 20px" }}>
      <div className="card">
        <div className="card-header" style={{ fontSize: 24, fontWeight: 700 }}>
          Register
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            {error && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "var(--danger)",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your name"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone (optional)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter your password (min 6 characters)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "rgba(79,124,255,0.15)",
                color: "#dbe5ff",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: 14,
              color: "var(--muted)",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "#dbe5ff",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

