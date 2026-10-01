import { useAuth } from "../../context/AuthContext";
import "./MyProfile.css";

const MyProfile = () => {
  const { user, employee } = useAuth();

  const initials =
    employee?.name
      ?.split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "E";

  const formatValue = (value) => {
    return value || "--";
  };

  const formatMethod = (value) => {
    if (!value) return "--";

    return value
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatStatus = (value) => {
    if (!value) return "--";

    return value
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="my-profile-page">
      {/* Page Header */}
      <div className="my-profile-header">
        <div>
          <p className="profile-eyebrow">EMPLOYEE PORTAL</p>

          <h1>My Profile</h1>

          <p className="profile-header-description">
            View your personal, employment and account information.
          </p>
        </div>
      </div>

      {/* Profile Hero */}
      <section className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-main-avatar">
            {initials}
          </div>

          <div className="profile-hero-info">
            <div className="profile-name-row">
              <h2>{formatValue(employee?.name)}</h2>

              <span className="profile-active-badge">
                <span></span>
                {formatStatus(employee?.employmentStatus)}
              </span>
            </div>

            <p className="profile-designation">
              {formatValue(employee?.designation)}
            </p>

            <div className="profile-meta">
              <span>
                <strong>ID</strong>
                {formatValue(employee?.employeeId)}
              </span>

              <span className="profile-meta-divider"></span>

              <span>
                <strong>Department</strong>
                {formatValue(employee?.department)}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-readonly">
          <span className="readonly-icon">✓</span>

          <div>
            <strong>Profile Information</strong>
            <p>Read only</p>
          </div>
        </div>
      </section>

      {/* Main Profile Grid */}
      <div className="my-profile-grid">
        {/* Personal Information */}
        <section className="profile-card">
          <div className="profile-card-header">
            <div className="profile-section-icon personal-icon">
              <span>👤</span>
            </div>

            <div>
              <h2>Personal Information</h2>
              <p>Basic information associated with your profile</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="profile-detail">
              <span>FULL NAME</span>
              <strong>{formatValue(employee?.name)}</strong>
            </div>

            <div className="profile-detail">
              <span>EMPLOYEE ID</span>
              <strong className="profile-id">
                {formatValue(employee?.employeeId)}
              </strong>
            </div>

            <div className="profile-detail">
              <span>EMAIL ADDRESS</span>
              <strong className="profile-email">
                {formatValue(user?.email)}
              </strong>
            </div>

            <div className="profile-detail">
              <span>PHONE NUMBER</span>
              <strong>{formatValue(employee?.phone)}</strong>
            </div>
          </div>
        </section>

        {/* Employment Details */}
        <section className="profile-card">
          <div className="profile-card-header">
            <div className="profile-section-icon employment-icon">
              <span>💼</span>
            </div>

            <div>
              <h2>Employment Details</h2>
              <p>Your current position and work information</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="profile-detail">
              <span>DEPARTMENT</span>
              <strong>{formatValue(employee?.department)}</strong>
            </div>

            <div className="profile-detail">
              <span>DESIGNATION</span>
              <strong>{formatValue(employee?.designation)}</strong>
            </div>

            <div className="profile-detail">
              <span>ATTENDANCE METHOD</span>
              <strong>{formatMethod(employee?.attendanceMethod)}</strong>
            </div>

            <div className="profile-detail">
              <span>EMPLOYMENT STATUS</span>

              <strong className="status-value">
                <span className="status-indicator"></span>
                {formatStatus(employee?.employmentStatus)}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* Account Information */}
      <section className="profile-card profile-account-card">
        <div className="profile-card-header">
          <div className="profile-section-icon account-icon">
            <span>🔐</span>
          </div>

          <div>
            <h2>Account Information</h2>
            <p>Information related to your attendance system account</p>
          </div>
        </div>

        <div className="profile-account-grid">
          <div className="account-item">
            <div className="account-item-icon">✉</div>

            <div>
              <span>LOGIN EMAIL</span>
              <strong>{formatValue(user?.email)}</strong>
            </div>
          </div>

          <div className="account-item">
            <div className="account-item-icon">◉</div>

            <div>
              <span>ACCOUNT ROLE</span>
              <strong>{formatStatus(user?.role || "EMPLOYEE")}</strong>
            </div>
          </div>

          <div className="account-item">
            <div className="account-item-icon">✓</div>

            <div>
              <span>ACCOUNT STATUS</span>

              <strong className="account-active">
                <span className="status-indicator"></span>
                Active
              </strong>
            </div>
          </div>

          <div className="account-item">
            <div className="account-item-icon">🔒</div>

            <div>
              <span>PASSWORD</span>
              <strong>••••••••</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Information */}
      <div className="profile-info-note">
        <div className="profile-info-note-icon">i</div>

        <div>
          <strong>Need to update your information?</strong>
          <p>
            Please contact your administrator if any of your employee
            information needs to be changed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;