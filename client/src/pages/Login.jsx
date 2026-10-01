import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await login(email, password);

      if (!response.success) {
        setError(response.message || "Login failed");
        return;
      }

      const loggedInUser = response.user;

      if (loggedInUser.mustChangePassword) {
        navigate("/change-password");
        return;
      }

      if (loggedInUser.role === "admin") {
        navigate("/admin/dashboard");
        return;
      }

      if (loggedInUser.role === "employee") {
        navigate("/employee/dashboard");
        return;
      }

      setError("Unknown user role.");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-glow login-glow-one"></div>
        <div className="login-glow login-glow-two"></div>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">CM</div>

          <div>
            <h1>CloudMatrix</h1>
            <span>Attendance Management</span>
          </div>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Email address</label>

            <div className="login-input-wrapper">
              <span className="input-icon">✉</span>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>

            <div className="login-input-wrapper">
              <span className="input-icon">●</span>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner"></span>
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <span>→</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>Secure employee access</span>
          <span>•</span>
          <span>CloudMatrix Technologies</span>
        </div>
      </div>
    </div>
  );
};

export default Login;