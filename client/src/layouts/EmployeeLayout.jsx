import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EmployeeLayout = () => {
  const { user, employee, logout } = useAuth();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <div className="employee-layout">
      <aside className="employee-sidebar">
        <div className="employee-sidebar-logo">
          <h2>Cloud Matrix</h2>
          <p>Attendance System</p>
        </div>

        <nav className="employee-nav">
          <Link to="/employee/dashboard">Dashboard</Link>
          <Link to="/employee/attendance">My Attendance</Link>
          <Link to="/employee/leave">Leave</Link>
          <Link to="/employee/remote-request">Remote Request</Link>
          <Link to="/employee/overtime">Overtime</Link>
          <Link to="/employee/work-report">Work Report</Link>
          <Link to="/employee/profile">My Profile</Link>
        </nav>

        <div className="employee-sidebar-user">
          <div className="employee-avatar">
            {employee?.name?.charAt(0)?.toUpperCase() || "E"}
          </div>

          <div className="employee-user-info">
            <strong>{employee?.name || "Employee"}</strong>
            <span>{user?.email}</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <main className="employee-main">
        <Outlet />
      </main>
    </div>
  );
};

export default EmployeeLayout;