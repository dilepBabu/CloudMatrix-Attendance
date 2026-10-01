import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ChangePassword.css";

const ChangePassword = () => {
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

      if (!response.success) {
        setError(response.message || "Password change failed.");
        return;
      }

      setMessage(
        "Password changed successfully. Redirecting to login..."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // End the old authenticated session.
      await logout();

      // Give the user a moment to see the success message.
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="change-password-bg">
        <div className="change-password-glow change-password-glow-one"></div>
        <div className="change-password-glow change-password-glow-two"></div>
      </div>

      <div className="change-password-card">
        <div className="change-password-brand">
          <div className="change-password-logo">CM</div>

          <div>
            <h1>CloudMatrix</h1>
            <span>Attendance Management</span>
          </div>
        </div>

        <div className="change-password-icon">
          🔐
        </div>

        <div className="change-password-heading">
          <h2>Create your new password</h2>

          <p>
            For security, you need to change your temporary password
            before continuing.
          </p>
        </div>

        <div className="security-notice">
          <span>i</span>
          <p>
            Choose a password that you can remember but others cannot
            easily guess.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="change-password-form"
        >
          <div className="change-password-field">
            <label htmlFor="currentPassword">
              Current password
            </label>

            <div className="change-password-input-wrapper">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                placeholder="Enter temporary password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowCurrent((value) => !value)}
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="change-password-field">
            <label htmlFor="newPassword">New password</label>

            <div className="change-password-input-wrapper">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowNew((value) => !value)}
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>

            <small>Minimum 6 characters</small>
          </div>

          <div className="change-password-field">
            <label htmlFor="confirmPassword">
              Confirm new password
            </label>

            <div className="change-password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="change-password-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="change-password-success">
              <span>✓</span>
              <p>{message}</p>
            </div>
          )}

          <button
            type="submit"
            className="change-password-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="change-password-spinner"></span>
                Updating password...
              </>
            ) : (
              <>
                Update password
                <span>→</span>
              </>
            )}
          </button>
        </form>

        <div className="change-password-footer">
          Your security is important to us
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;