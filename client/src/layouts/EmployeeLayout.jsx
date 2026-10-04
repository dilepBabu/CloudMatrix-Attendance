import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EmployeeLayout = () => {
  const { user, employee, logout } = useAuth();

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
           EMPLOYEE LAYOUT
           Responsive: Desktop / Laptop / Tablet / Mobile
           ========================================================= */

        .employee-layout {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          display: flex;
          position: relative;
          overflow-x: hidden;
          background: #f5f7fb;
        }

        .employee-layout *,
        .employee-layout *::before,
        .employee-layout *::after {
          box-sizing: border-box;
        }


        /* =========================================================
           SIDEBAR
           ========================================================= */

        .employee-sidebar {
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

          overflow-y: auto;
          overflow-x: hidden;

          transition:
            transform 0.3s ease,
            width 0.3s ease;
        }


        /* =========================================================
           SIDEBAR HEADER
           ========================================================= */

        .employee-sidebar-logo {
          width: 100%;
          min-height: 82px;

          display: flex;
          align-items: center;

          gap: 12px;
          padding: 18px 18px;

          border-bottom: 1px solid #edf0f4;
          flex-shrink: 0;
        }

        .employee-brand-mark {
          width: 44px;
          height: 44px;

          flex: 0 0 44px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: linear-gradient(
            135deg,
            #0066b3,
            #00a9e0
          );

          color: #ffffff;

          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.5px;

          box-shadow: 0 5px 14px rgba(0, 102, 179, 0.2);
        }

        .employee-brand-text {
          min-width: 0;
          flex: 1;
        }

        .employee-brand-text h2 {
          margin: 0;

          color: #172033;

          font-size: 17px;
          line-height: 1.2;
          font-weight: 750;

          white-space: nowrap;
        }

        .employee-brand-text p {
          margin: 4px 0 0;

          color: #7b8495;

          font-size: 11px;
          line-height: 1.2;

          white-space: nowrap;
        }

        .employee-sidebar-close {
          display: none;

          width: 34px;
          height: 34px;

          border: none;
          border-radius: 8px;

          background: #f3f4f6;
          color: #374151;

          font-size: 24px;
          line-height: 1;

          cursor: pointer;

          align-items: center;
          justify-content: center;

          flex-shrink: 0;
        }

        .employee-sidebar-close:hover {
          background: #e5e7eb;
        }


        /* =========================================================
           NAVIGATION
           ========================================================= */

        .employee-nav {
          width: 100%;

          display: flex;
          flex-direction: column;

          gap: 5px;

          padding: 18px 12px;

          flex: 1;
        }

        .employee-nav a {
          width: 100%;
          min-height: 46px;

          display: flex;
          align-items: center;

          gap: 12px;

          padding: 10px 13px;

          border-radius: 10px;

          color: #5f6878;

          text-decoration: none;

          font-size: 14px;
          font-weight: 550;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .employee-nav a:hover {
          background: #f1f7fc;
          color: #0066b3;
        }

        .employee-nav a.active {
          background: linear-gradient(
            90deg,
            rgba(0, 102, 179, 0.12),
            rgba(0, 169, 224, 0.08)
          );

          color: #0066b3;

          font-weight: 700;
        }

        .nav-icon {
          width: 23px;
          min-width: 23px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 17px;
          line-height: 1;

          color: currentColor;
        }


        /* =========================================================
           SIDEBAR USER
           ========================================================= */

        .employee-sidebar-user {
          width: 100%;

          padding: 14px 14px 16px;

          border-top: 1px solid #edf0f4;

          display: grid;

          grid-template-columns: 40px minmax(0, 1fr);

          column-gap: 10px;
          row-gap: 12px;

          flex-shrink: 0;
        }

        .employee-sidebar-avatar {
          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e8f4fb;
          color: #0066b3;

          font-size: 15px;
          font-weight: 750;

          flex-shrink: 0;
        }

        .employee-user-info {
          min-width: 0;

          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .employee-user-info strong {
          display: block;

          color: #1f2937;

          font-size: 13px;
          line-height: 1.3;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .employee-user-info span {
          display: block;

          margin-top: 3px;

          color: #8a93a3;

          font-size: 10px;
          line-height: 1.3;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-button {
          grid-column: 1 / -1;

          width: 100%;
          min-height: 38px;

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

        .logout-button:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .logout-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }


        /* =========================================================
           MAIN CONTENT
           ========================================================= */

        .employee-main {
          width: calc(100% - 255px);

          min-width: 0;
          min-height: 100vh;

          margin-left: 255px;

          overflow-x: hidden;
        }


        /* =========================================================
           MOBILE HEADER
           ========================================================= */

        .employee-mobile-header {
          display: none;
        }

        .employee-sidebar-overlay {
          display: none;
        }


        /* =========================================================
           LAPTOP
           ========================================================= */

        @media (max-width: 1200px) {

          .employee-sidebar {
            width: 235px;
          }

          .employee-main {
            width: calc(100% - 235px);
            margin-left: 235px;
          }

          .employee-sidebar-logo {
            padding-left: 15px;
            padding-right: 15px;
          }

          .employee-nav {
            padding-left: 10px;
            padding-right: 10px;
          }

          .employee-nav a {
            padding-left: 11px;
            padding-right: 11px;
          }
        }


        /* =========================================================
           TABLET / SMALL LAPTOP
           ========================================================= */

        @media (max-width: 900px) {

          .employee-layout {
            display: block;
          }

          /* Mobile top bar */

          .employee-mobile-header {
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

            z-index: 900;

            box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          }

          .employee-menu-button {
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

          .employee-menu-button:hover {
            background: #f5f7fb;
          }

          .employee-mobile-brand {
            min-width: 0;
            flex: 1;

            display: flex;
            flex-direction: column;

            margin-left: 12px;
          }

          .employee-mobile-brand strong {
            color: #172033;

            font-size: 15px;
            line-height: 1.2;
          }

          .employee-mobile-brand span {
            margin-top: 2px;

            color: #7b8495;

            font-size: 10px;
            line-height: 1.2;
          }

          .employee-mobile-avatar {
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


          /* Sidebar */

          .employee-sidebar {
            width: min(285px, 86vw);
            height: 100vh;

            transform: translateX(-105%);

            box-shadow: 8px 0 30px rgba(15, 23, 42, 0.12);

            z-index: 1000;
          }

          .employee-sidebar.employee-sidebar-open {
            transform: translateX(0);
          }

          .employee-sidebar-close {
            display: flex;
          }


          /* Main */

          .employee-main {
            width: 100%;
            min-height: 100vh;

            margin-left: 0;

            padding-top: 70px;
          }


          /* Overlay */

          .employee-sidebar-overlay {
            position: fixed;
            inset: 0;

            display: block;

            width: 100%;
            height: 100%;

            padding: 0;
            margin: 0;

            border: none;

            background: rgba(15, 23, 42, 0.42);

            z-index: 950;

            cursor: pointer;
          }
        }


        /* =========================================================
           MOBILE
           ========================================================= */

        @media (max-width: 600px) {

          .employee-mobile-header {
            height: 64px;
            padding: 0 14px;
          }

          .employee-menu-button {
            width: 38px;
            height: 38px;

            font-size: 20px;
          }

          .employee-mobile-brand {
            margin-left: 10px;
          }

          .employee-mobile-brand strong {
            font-size: 14px;
          }

          .employee-mobile-brand span {
            font-size: 9px;
          }

          .employee-mobile-avatar {
            width: 36px;
            height: 36px;

            font-size: 13px;
          }

          .employee-main {
            padding-top: 64px;
          }

          .employee-sidebar {
            width: min(280px, 88vw);
          }

          .employee-sidebar-logo {
            min-height: 74px;
            padding: 15px;
          }

          .employee-brand-mark {
            width: 40px;
            height: 40px;

            flex-basis: 40px;

            border-radius: 10px;
          }

          .employee-brand-text h2 {
            font-size: 16px;
          }

          .employee-nav {
            padding: 14px 10px;
          }

          .employee-nav a {
            min-height: 44px;

            font-size: 13px;
          }
        }


        /* =========================================================
           SMALL PHONES
           ========================================================= */

        @media (max-width: 400px) {

          .employee-mobile-header {
            height: 60px;
            padding: 0 11px;
          }

          .employee-menu-button {
            width: 36px;
            height: 36px;

            font-size: 19px;
          }

          .employee-mobile-brand {
            margin-left: 8px;
          }

          .employee-mobile-brand strong {
            font-size: 13px;
          }

          .employee-mobile-brand span {
            font-size: 8px;
          }

          .employee-mobile-avatar {
            width: 34px;
            height: 34px;
          }

          .employee-main {
            padding-top: 60px;
          }

          .employee-sidebar {
            width: 86vw;
          }
        }


        /* =========================================================
           VERY SMALL PHONES
           ========================================================= */

        @media (max-width: 330px) {

          .employee-mobile-header {
            padding-left: 9px;
            padding-right: 9px;
          }

          .employee-mobile-brand span {
            display: none;
          }

          .employee-mobile-brand strong {
            font-size: 12px;
          }

          .employee-mobile-avatar {
            width: 32px;
            height: 32px;
          }

          .employee-menu-button {
            width: 34px;
            height: 34px;
          }
        }


        /* =========================================================
           ACCESSIBILITY
           ========================================================= */

        @media (prefers-reduced-motion: reduce) {

          .employee-sidebar,
          .employee-nav a,
          .logout-button {
            transition: none;
          }
        }
      `}</style>

      <div className="employee-layout">

        {/* ================= MOBILE HEADER ================= */}
        <header className="employee-mobile-header">

          <button
            type="button"
            className="employee-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>

          <div className="employee-mobile-brand">
            <strong>Cloud Matrix</strong>
            <span>Attendance System</span>
          </div>

          <div className="employee-mobile-avatar">
            {employee?.name?.charAt(0)?.toUpperCase() || "E"}
          </div>

        </header>


        {/* ================= MOBILE OVERLAY ================= */}
        {sidebarOpen && (
          <button
            type="button"
            className="employee-sidebar-overlay"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          />
        )}


        {/* ================= SIDEBAR ================= */}
        <aside
          className={`employee-sidebar ${
            sidebarOpen ? "employee-sidebar-open" : ""
          }`}
        >

          {/* Sidebar Header */}
          <div className="employee-sidebar-logo">

            <div className="employee-brand-mark">
              CM
            </div>

            <div className="employee-brand-text">
              <h2>Cloud Matrix</h2>
              <p>Attendance System</p>
            </div>

            <button
              type="button"
              className="employee-sidebar-close"
              onClick={closeSidebar}
              aria-label="Close navigation"
            >
              ×
            </button>

          </div>


          {/* ================= NAVIGATION ================= */}
          <nav className="employee-nav">

            <Link
              to="/employee/dashboard"
              className={isActive("/employee/dashboard") ? "active" : ""}
              onClick={closeSidebar}
            >
              <span className="nav-icon">▣</span>
              <span>Dashboard</span>
            </Link>

            <Link
              to="/employee/attendance"
              className={isActive("/employee/attendance") ? "active" : ""}
              onClick={closeSidebar}
            >
              <span className="nav-icon">◷</span>
              <span>My Attendance</span>
            </Link>

            <Link
              to="/employee/leave"
              className={isActive("/employee/leave") ? "active" : ""}
              onClick={closeSidebar}
            >
              <span className="nav-icon">▤</span>
              <span>Leave</span>
            </Link>

            <Link
              to="/employee/remote-request"
              className={
                isActive("/employee/remote-request") ? "active" : ""
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">⌂</span>
              <span>Remote Request</span>
            </Link>

            <Link
              to="/employee/overtime"
              className={isActive("/employee/overtime") ? "active" : ""}
              onClick={closeSidebar}
            >
              <span className="nav-icon">◉</span>
              <span>Overtime</span>
            </Link>

            <Link
              to="/employee/work-report"
              className={
                isActive("/employee/work-report") ? "active" : ""
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">▧</span>
              <span>Work Report</span>
            </Link>

            <Link
              to="/employee/profile"
              className={isActive("/employee/profile") ? "active" : ""}
              onClick={closeSidebar}
            >
              <span className="nav-icon">◎</span>
              <span>My Profile</span>
            </Link>

          </nav>


          {/* ================= USER SECTION ================= */}
          <div className="employee-sidebar-user">

            <div className="employee-sidebar-avatar">
              {employee?.name?.charAt(0)?.toUpperCase() || "E"}
            </div>

            <div className="employee-user-info">

              <strong>
                {employee?.name || "Employee"}
              </strong>

              <span>
                {user?.email || ""}
              </span>

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


        {/* ================= MAIN CONTENT ================= */}
        <main className="employee-main">
          <Outlet />
        </main>

      </div>
    </>
  );
};

export default EmployeeLayout;