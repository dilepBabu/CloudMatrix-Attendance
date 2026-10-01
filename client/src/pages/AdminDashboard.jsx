import { useEffect, useState } from "react";
import api from "../services/api";

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/dashboard/summary");

      if (response.data.success) {
        setDashboard(response.data);
      } else {
        setError(
          response.data.message || "Failed to load dashboard"
        );
      }
    } catch (error) {
      console.error("Dashboard error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="dashboard-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-error">
        <div className="error-icon">!</div>
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>

        <button
          className="dashboard-retry-button"
          onClick={() => fetchDashboard()}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboard?.summary) {
    return (
      <div className="admin-dashboard-error">
        <h2>No dashboard data available</h2>
        <button
          className="dashboard-retry-button"
          onClick={() => fetchDashboard()}
        >
          Refresh
        </button>
      </div>
    );
  }

  const summary = dashboard.summary;

  const attendancePercentage = Number(
    summary.attendancePercentage || 0
  );

  const departmentStats = dashboard.departmentStats || [];

  const dayStatus = summary.holiday
    ? "Holiday"
    : summary.weekend
    ? "Weekend"
    : "Working Day";

  const dayStatusClass = summary.holiday
    ? "holiday"
    : summary.weekend
    ? "weekend"
    : "working";

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-dashboard-header">
        <div>
          <div className="dashboard-eyebrow">
            CLOUDMATRIX • ADMIN PORTAL
          </div>

          <h1>Good day, Admin 👋</h1>

          <p>
            Here's your attendance overview for{" "}
            <strong>{dashboard.date}</strong>
          </p>
        </div>

        <button
          className="dashboard-refresh-button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
        >
          <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>
            ↻
          </span>

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Day Status */}
      <div className={`dashboard-day-banner ${dayStatusClass}`}>
        <div className="day-banner-icon">
          {summary.holiday
            ? "🎉"
            : summary.weekend
            ? "☕"
            : "📅"}
        </div>

        <div>
          <span>Today's status</span>
          <strong>{dayStatus}</strong>
        </div>

        <div className="day-banner-date">
          {dashboard.date}
        </div>
      </div>

      {/* Main Stats */}
      <div className="admin-summary-grid">
        <div className="admin-summary-card employees">
          <div className="summary-card-top">
            <div className="summary-icon">👥</div>
            <span className="summary-label">Employees</span>
          </div>

          <strong>{summary.totalEmployees}</strong>

          <p>Total active employees</p>
        </div>

        <div className="admin-summary-card present">
          <div className="summary-card-top">
            <div className="summary-icon">✓</div>
            <span className="summary-label">Present</span>
          </div>

          <strong>{summary.present}</strong>

          <p>Employees checked in</p>
        </div>

        <div className="admin-summary-card leave">
          <div className="summary-card-top">
            <div className="summary-icon">▣</div>
            <span className="summary-label">On Leave</span>
          </div>

          <strong>{summary.onLeave}</strong>

          <p>Employees on approved leave</p>
        </div>

        <div className="admin-summary-card absent">
          <div className="summary-card-top">
            <div className="summary-icon">!</div>
            <span className="summary-label">Not Checked In</span>
          </div>

          <strong>{summary.notCheckedIn}</strong>

          <p>Yet to check in</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="admin-secondary-grid">
        <div className="secondary-stat-card">
          <span>Half Day</span>
          <strong>{summary.halfDay}</strong>
        </div>

        <div className="secondary-stat-card">
          <span>Missed Checkout</span>
          <strong>{summary.missedCheckout}</strong>
        </div>

        <div className="secondary-stat-card">
          <span>Attendance</span>
          <strong>{attendancePercentage}%</strong>
        </div>

        <div className="secondary-stat-card">
          <span>Day Status</span>
          <strong className={`status-text ${dayStatusClass}`}>
            {dayStatus}
          </strong>
        </div>
      </div>

      {/* Attendance Overview */}
      <section className="dashboard-panel attendance-overview">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">TODAY</span>
            <h2>Attendance Overview</h2>
            <p>Current employee attendance status</p>
          </div>
        </div>

        <div className="attendance-overview-content">
          <div className="attendance-circle-wrapper">
            <div
              className="attendance-circle"
              style={{
                "--attendance": `${attendancePercentage}%`,
              }}
            >
              <div className="attendance-circle-inner">
                <strong>{attendancePercentage}%</strong>
                <span>Attendance</span>
              </div>
            </div>
          </div>

          <div className="attendance-breakdown">
            <div className="breakdown-row">
              <div>
                <span className="breakdown-dot present"></span>
                Present
              </div>
              <strong>{summary.present}</strong>
            </div>

            <div className="breakdown-row">
              <div>
                <span className="breakdown-dot absent"></span>
                Not Checked In
              </div>
              <strong>{summary.notCheckedIn}</strong>
            </div>

            <div className="breakdown-row">
              <div>
                <span className="breakdown-dot leave"></span>
                On Leave
              </div>
              <strong>{summary.onLeave}</strong>
            </div>

            <div className="breakdown-row">
              <div>
                <span className="breakdown-dot half"></span>
                Half Day
              </div>
              <strong>{summary.halfDay}</strong>
            </div>

            <div className="breakdown-row">
              <div>
                <span className="breakdown-dot missed"></span>
                Missed Checkout
              </div>
              <strong>{summary.missedCheckout}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Department Statistics */}
      <section className="dashboard-panel department-panel">
        <div className="panel-header">
          <div>
            <span className="panel-eyebrow">DEPARTMENTS</span>
            <h2>Department Statistics</h2>
            <p>Attendance breakdown by department</p>
          </div>

          <span className="department-count">
            {departmentStats.length}{" "}
            {departmentStats.length === 1
              ? "Department"
              : "Departments"}
          </span>
        </div>

        {departmentStats.length === 0 ? (
          <div className="dashboard-empty">
            <div>📊</div>
            <p>No department statistics available.</p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Leave</th>
                  <th>Half Day</th>
                  <th>Attendance</th>
                </tr>
              </thead>

              <tbody>
                {departmentStats.map((department) => (
                  <tr key={department.department}>
                    <td>
                      <div className="department-name">
                        <div className="department-avatar">
                          {department.department
                            ?.charAt(0)
                            ?.toUpperCase() || "D"}
                        </div>

                        <strong>
                          {department.department}
                        </strong>
                      </div>
                    </td>

                    <td>{department.totalEmployees}</td>

                    <td>
                      <span className="table-number present">
                        {department.present}
                      </span>
                    </td>

                    <td>
                      <span className="table-number absent">
                        {department.absent}
                      </span>
                    </td>

                    <td>
                      <span className="table-number leave">
                        {department.onLeave}
                      </span>
                    </td>

                    <td>
                      <span className="table-number half">
                        {department.halfDay}
                      </span>
                    </td>

                    <td>
                      <div className="department-attendance">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(
                                Number(
                                  department.attendancePercentage || 0
                                ),
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>

                        <span>
                          {department.attendancePercentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;