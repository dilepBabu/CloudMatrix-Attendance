import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <style>{`
        /* =========================================================
           ADMIN LAYOUT
           Cloud Matrix Attendance System
           Responsive: Desktop / Laptop / Tablet / Mobile
           ========================================================= */

        .admin-layout {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;

          display: flex;
          position: relative;

          background: #f5f7fb;

          overflow-x: hidden;
        }

        .admin-layout *,
        .admin-layout *::before,
        .admin-layout *::after {
          box-sizing: border-box;
        }


        /* =========================================================
           DESKTOP SIDEBAR
           ========================================================= */

        .admin-sidebar {
          position: fixed;

          top: 0;
          left: 0;

          width: 255px;
          height: 100vh;

          display: flex;
          flex-direction: column;

          background: #ffffff;

          border-right: 1px solid #e5e7eb;

          z-index: 1000;

          overflow-x: hidden;
          overflow-y: auto;

          transition:
            transform 0.3s ease,
            width 0.3s ease;

          scrollbar-width: thin;
        }


        /* =========================================================
           SIDEBAR LOGO
           ========================================================= */

        .sidebar-logo {
          width: 100%;
          min-height: 82px;

          display: flex;
          flex-direction: column;
          justify-content: center;

          padding: 18px 20px;

          border-bottom: 1px solid #edf0f4;

          flex-shrink: 0;
        }

        .sidebar-logo h2 {
          margin: 0;

          color: #172033;

          font-size: 18px;
          line-height: 1.25;
          font-weight: 750;

          white-space: nowrap;
        }

        .sidebar-logo p {
          margin: 4px 0 0;

          color: #7b8495;

          font-size: 11px;
          line-height: 1.2;

          white-space: nowrap;
        }


        /* =========================================================
           ADMIN NAVIGATION
           ========================================================= */

        .admin-nav {
          width: 100%;

          display: flex;
          flex-direction: column;

          gap: 5px;

          padding: 18px 12px;

          flex: 1;
        }

        .admin-nav a {
          width: 100%;
          min-height: 46px;

          display: flex;
          align-items: center;

          padding: 10px 14px;

          border-radius: 10px;

          color: #5f6878;

          text-decoration: none;

          font-size: 14px;
          font-weight: 550;

          line-height: 1.3;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .admin-nav a:hover {
          background: #f1f7fc;

          color: #0066b3;

          transform: translateX(2px);
        }

        .admin-nav a.active {
          background: linear-gradient(
            90deg,
            rgba(0, 102, 179, 0.12),
            rgba(0, 169, 224, 0.08)
          );

          color: #0066b3;

          font-weight: 700;
        }


        /* =========================================================
           SIDEBAR USER
           ========================================================= */

        .sidebar-user {
          width: 100%;

          padding: 15px 14px 17px;

          border-top: 1px solid #edf0f4;

          flex-shrink: 0;
        }

        .sidebar-user p {
          width: 100%;

          margin: 0 0 12px;

          padding: 0 2px;

          color: #687385;

          font-size: 11px;
          line-height: 1.4;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }


        /* =========================================================
           LOGOUT
           ========================================================= */

        .admin-sidebar .logout-button {
          width: 100%;
          min-height: 39px;

          border: 1px solid #e5e7eb;

          border-radius: 9px;

          background: #ffffff;

          color: #dc2626;

          font-size: 13px;
          font-weight: 650;

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .admin-sidebar .logout-button:hover:not(:disabled) {
          background: #fef2f2;

          border-color: #fecaca;
        }

        .admin-sidebar .logout-button:disabled {
          opacity: 0.6;

          cursor: not-allowed;
        }


        /* =========================================================
           MAIN CONTENT
           ========================================================= */

        .admin-main {
          width: calc(100% - 255px);

          min-width: 0;
          min-height: 100vh;

          margin-left: 255px;

          overflow-x: hidden;
        }


        /* =========================================================
           MOBILE HEADER
           ========================================================= */

        .admin-mobile-header {
          display: none;
        }

        .admin-sidebar-overlay {
          display: none;
        }


        /* =========================================================
           LAPTOP
           ========================================================= */

        @media (max-width: 1200px) {

          .admin-sidebar {
            width: 235px;
          }

          .admin-main {
            width: calc(100% - 235px);

            margin-left: 235px;
          }

          .sidebar-logo {
            padding-left: 16px;
            padding-right: 16px;
          }

          .admin-nav {
            padding-left: 10px;
            padding-right: 10px;
          }

          .admin-nav a {
            padding-left: 12px;
            padding-right: 12px;
          }
        }


        /* =========================================================
           TABLET
           ========================================================= */

        @media (max-width: 900px) {

          .admin-layout {
            display: block;
          }


          /* ---------- Mobile Header ---------- */

          .admin-mobile-header {
            position: fixed;

            top: 0;
            left: 0;

            width: 100%;
            height: 70px;

            display: flex;
            align-items: center;

            padding: 0 18px;

            background: #ffffff;

            border-bottom: 1px solid #e5e7eb;

            box-shadow:
              0 2px 10px rgba(15, 23, 42, 0.05);

            z-index: 900;
          }


          /* ---------- Menu Button ---------- */

          .admin-menu-button {
            width: 42px;
            height: 42px;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 0;

            border: 1px solid #e5e7eb;

            border-radius: 9px;

            background: #ffffff;

            color: #1f2937;

            font-size: 22px;
            line-height: 1;

            cursor: pointer;

            flex-shrink: 0;
          }

          .admin-menu-button:hover {
            background: #f5f7fb;
          }


          /* ---------- Mobile Brand ---------- */

          .admin-mobile-brand {
            min-width: 0;

            flex: 1;

            display: flex;
            flex-direction: column;

            margin-left: 12px;
          }

          .admin-mobile-brand strong {
            color: #172033;

            font-size: 15px;
            line-height: 1.2;
          }

          .admin-mobile-brand span {
            margin-top: 2px;

            color: #7b8495;

            font-size: 10px;
            line-height: 1.2;
          }


          /* ---------- Mobile Avatar ---------- */

          .admin-mobile-avatar {
            width: 38px;
            height: 38px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 50%;

            background: #e8f4fb;

            color: #0066b3;

            font-size: 14px;
            font-weight: 750;

            flex-shrink: 0;
          }


          /* ---------- Sidebar ---------- */

          .admin-sidebar {
            width: min(285px, 86vw);
            height: 100vh;

            transform: translateX(-105%);

            box-shadow:
              8px 0 30px rgba(15, 23, 42, 0.12);

            z-index: 1000;
          }

          .admin-sidebar.admin-sidebar-open {
            transform: translateX(0);
          }


          /* ---------- Main ---------- */

          .admin-main {
            width: 100%;

            min-height: 100vh;

            margin-left: 0;

            padding-top: 70px;
          }


          /* ---------- Overlay ---------- */

          .admin-sidebar-overlay {
            position: fixed;

            inset: 0;

            display: block;

            width: 100%;
            height: 100%;

            margin: 0;
            padding: 0;

            border: none;

            background: rgba(15, 23, 42, 0.42);

            z-index: 950;

            cursor: pointer;
          }


          /* ---------- Close Button ---------- */

          .admin-sidebar-close {
            display: flex;
          }
        }


        /* =========================================================
           MOBILE
           ========================================================= */

        @media (max-width: 600px) {

          .admin-mobile-header {
            height: 64px;

            padding: 0 14px;
          }

          .admin-menu-button {
            width: 38px;
            height: 38px;

            font-size: 20px;
          }

          .admin-mobile-brand {
            margin-left: 10px;
          }

          .admin-mobile-brand strong {
            font-size: 14px;
          }

          .admin-mobile-brand span {
            font-size: 9px;
          }

          .admin-mobile-avatar {
            width: 36px;
            height: 36px;

            font-size: 13px;
          }

          .admin-main {
            padding-top: 64px;
          }

          .admin-sidebar {
            width: min(280px, 88vw);
          }

          .sidebar-logo {
            min-height: 74px;

            padding: 15px;
          }

          .sidebar-logo h2 {
            font-size: 16px;
          }

          .admin-nav {
            padding: 14px 10px;
          }

          .admin-nav a {
            min-height: 44px;

            font-size: 13px;
          }
        }


        /* =========================================================
           SMALL PHONES
           ========================================================= */

        @media (max-width: 400px) {

          .admin-mobile-header {
            height: 60px;

            padding: 0 11px;
          }

          .admin-menu-button {
            width: 36px;
            height: 36px;

            font-size: 19px;
          }

          .admin-mobile-brand {
            margin-left: 8px;
          }

          .admin-mobile-brand strong {
            font-size: 13px;
          }

          .admin-mobile-brand span {
            font-size: 8px;
          }

          .admin-mobile-avatar {
            width: 34px;
            height: 34px;
          }

          .admin-main {
            padding-top: 60px;
          }

          .admin-sidebar {
            width: 86vw;
          }

          .sidebar-logo {
            padding-left: 13px;
            padding-right: 13px;
          }
        }


        /* =========================================================
           VERY SMALL PHONES
           ========================================================= */

        @media (max-width: 330px) {

          .admin-mobile-header {
            padding-left: 9px;
            padding-right: 9px;
          }

          .admin-mobile-brand span {
            display: none;
          }

          .admin-mobile-brand strong {
            font-size: 12px;
          }

          .admin-mobile-avatar {
            width: 32px;
            height: 32px;
          }

          .admin-menu-button {
            width: 34px;
            height: 34px;
          }
        }


        /* =========================================================
           ACCESSIBILITY
           ========================================================= */

        @media (prefers-reduced-motion: reduce) {

          .admin-sidebar,
          .admin-nav a,
          .admin-sidebar .logout-button {
            transition: none;
          }
        }
      `}</style>


      <div className="admin-layout">

        {/* =====================================================
            MOBILE HEADER
            ===================================================== */}

        <header className="admin-mobile-header">

          <button
            type="button"
            className="admin-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin navigation"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>


          <div className="admin-mobile-brand">
            <strong>Cloud Matrix</strong>
            <span>Attendance System</span>
          </div>


          <div className="admin-mobile-avatar">
            {user?.email?.charAt(0)?.toUpperCase() || "A"}
          </div>

        </header>


        {/* =====================================================
            MOBILE OVERLAY
            ===================================================== */}

        {sidebarOpen && (
          <button
            type="button"
            className="admin-sidebar-overlay"
            onClick={closeSidebar}
            aria-label="Close admin navigation"
          />
        )}


        {/* =====================================================
            SIDEBAR
            ===================================================== */}

        <aside
          className={`admin-sidebar ${
            sidebarOpen ? "admin-sidebar-open" : ""
          }`}
        >

          {/* Sidebar Logo */}

          <div className="sidebar-logo">

            <h2>Cloud Matrix</h2>

            <p>Attendance System</p>

            <button
              type="button"
              className="admin-sidebar-close"
              onClick={closeSidebar}
              aria-label="Close navigation"
              style={{
                display: "none",
                position: "absolute",
                right: "12px",
                top: "20px",
                width: "34px",
                height: "34px",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: "8px",
                background: "#f3f4f6",
                color: "#374151",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

          </div>


          {/* =================================================
              NAVIGATION
              ================================================= */}

          <nav className="admin-nav">

            <Link
              to="/admin/dashboard"
              className={isActive("/admin/dashboard") ? "active" : ""}
              onClick={closeSidebar}
            >
              Dashboard
            </Link>

            <Link
              to="/admin/employees"
              className={isActive("/admin/employees") ? "active" : ""}
              onClick={closeSidebar}
            >
              Employees
            </Link>

            <Link
              to="/admin/attendance"
              className={isActive("/admin/attendance") ? "active" : ""}
              onClick={closeSidebar}
            >
              Attendance
            </Link>

            <Link
              to="/admin/leave"
              className={isActive("/admin/leave") ? "active" : ""}
              onClick={closeSidebar}
            >
              Leave
            </Link>

            <Link
              to="/admin/remote-requests"
              className={
                isActive("/admin/remote-requests") ? "active" : ""
              }
              onClick={closeSidebar}
            >
              Remote Requests
            </Link>

            <Link
              to="/admin/overtime"
              className={isActive("/admin/overtime") ? "active" : ""}
              onClick={closeSidebar}
            >
              Overtime
            </Link>

            <Link
              to="/admin/holidays"
              className={isActive("/admin/holidays") ? "active" : ""}
              onClick={closeSidebar}
            >
              Holidays
            </Link>

            <Link
              to="/admin/settings"
              className={isActive("/admin/settings") ? "active" : ""}
              onClick={closeSidebar}
            >
              Settings
            </Link>

          </nav>


          {/* =================================================
              SIDEBAR USER
              ================================================= */}

          <div className="sidebar-user">

            <p>
              {user?.email || "Admin"}
            </p>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>

          </div>

        </aside>


        {/* =====================================================
            MAIN CONTENT
            ===================================================== */}

        <main className="admin-main">
          <Outlet />
        </main>

      </div>
    </>
  );
};

export default AdminLayout;