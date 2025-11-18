import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;
  const { login } = useAuth();

  // Get the FastAPI backend URL - default to port 8000
  const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || "http://127.0.0.1:8000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email,
        password,
      });

      // Store JWT token using AuthContext
      if (response.data.access_token) {
        login(response.data.access_token);
        // Redirect to dashboard or home page
        const redirectTo = location.state?.from || "/dashboard";
        navigate(redirectTo);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: "0 20px" }}>
      <div className="card">
        <div className="card-header" style={{ fontSize: 24, fontWeight: 700 }}>
          Login
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            {successMessage && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#c7f9d4",
                  fontSize: 14,
                }}
              >
                {successMessage}
              </div>
            )}
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
                Email
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
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
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
              {loading ? "Logging in..." : "Login"}
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
            Don't have an account?{" "}
            <Link
              to="/register"
              style={{
                color: "#dbe5ff",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

