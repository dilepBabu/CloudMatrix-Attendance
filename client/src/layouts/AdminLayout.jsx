import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLayout = () => {
  const { user, logout } = useAuth();
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
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <h2>Cloud Matrix</h2>
          <p>Attendance System</p>
        </div>

        <nav className="admin-nav">
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/employees">Employees</Link>
          <Link to="/admin/attendance">Attendance</Link>
          <Link to="/admin/leave">Leave</Link>
          <Link to="/admin/remote-requests">
            Remote Requests
          </Link>
          <Link to="/admin/overtime">Overtime</Link>
          <Link to="/admin/holidays">Holidays</Link>
          <Link to="/admin/settings">Settings</Link>
        </nav>

        <div className="sidebar-user">
          <p>{user?.email}</p>

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

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;