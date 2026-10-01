import { useEffect, useState } from "react";
import api from "../services/api";
import "./EmployeeDashboard.css";

const EmployeeDashboard = () => {
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingMonth, setChangingMonth] = useState(false);
  const [error, setError] = useState("");

  // Selected calendar date
  const [selectedDay, setSelectedDay] = useState(null);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setError("");

        const response = await api.get(
          `/attendance/my/summary?month=${selectedMonth}&year=${selectedYear}`
        );

        if (response.data.success) {
          setDashboard(response.data);

          // Clear selected date when changing month
          setSelectedDay(null);
        } else {
          setError(
            response.data.message || "Failed to load attendance summary"
          );
        }
      } catch (error) {
        console.error("Employee dashboard error:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load attendance summary"
        );
      } finally {
        setLoading(false);
        setChangingMonth(false);
      }
    };

    fetchSummary();
  }, [selectedMonth, selectedYear]);

  const handlePreviousMonth = () => {
    setChangingMonth(true);
    setSelectedDay(null);

    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (!isCurrentMonth()) {
      setChangingMonth(true);
      setSelectedDay(null);

      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear((prev) => prev + 1);
      } else {
        setSelectedMonth((prev) => prev + 1);
      }
    }
  };

  const isCurrentMonth = () => {
    return (
      selectedMonth === today.getMonth() + 1 &&
      selectedYear === today.getFullYear()
    );
  };

  const getStatusLabel = (status) => {
    if (!status) return "Unknown";

    return status === "UPCOMING"
      ? "Upcoming"
      : status.replaceAll("_", " ");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PRESENT":
        return "✓";
      case "ABSENT":
        return "!";
      case "ON_LEAVE":
        return "L";
      case "HOLIDAY":
        return "H";
      case "WEEKEND":
        return "W";
      case "HALF_DAY":
        return "½";
      case "MISSED_CHECKOUT":
        return "!";
      case "UPCOMING":
        return "•";
      default:
        return "•";
    }
  };

  const formatTime = (time) => {
    if (!time) return "Not available";

    const date = new Date(time);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateKey) => {
    if (!dateKey) return "Unknown date";

    const [year, month, day] = dateKey.split("-").map(Number);

    if (!year || !month || !day) {
      return dateKey;
    }

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatWorkingTime = (minutes) => {
    const totalMinutes = Number(minutes);

    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
      return "0 min";
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  };

  const renderDetailRow = (label, value) => {
    return (
      <div className="attendance-detail-row" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    );
  };

  const renderSelectedDayDetails = () => {
    if (!selectedDay) {
      return null;
    }

    const attendance = selectedDay.attendance;
    const holiday = selectedDay.holiday;
    const leave = selectedDay.leave;
    const remoteRequest = selectedDay.remoteRequest;
    const overtimeRequest = selectedDay.overtimeRequest;

    return (
      <div className="selected-day-details">
        <div className="selected-day-details-header">
          <div>
            <span className="dashboard-eyebrow">DAY DETAILS</span>

            <h3>{formatDate(selectedDay.dateKey)}</h3>

            <p>
              Attendance information for {selectedDay.dateKey}
            </p>
          </div>

          <button
            type="button"
            className="close-details-button"
            onClick={() => setSelectedDay(null)}
            aria-label="Close day details"
          >
            ×
          </button>
        </div>

        <div className="selected-day-status">
          <div
            className={`selected-status-icon ${selectedDay.status
              .toLowerCase()
              .replaceAll("_", "-")}`}
          >
            {getStatusIcon(selectedDay.status)}
          </div>

          <div>
            <span>Status</span>
            <strong>{getStatusLabel(selectedDay.status)}</strong>
          </div>
        </div>

        {attendance && (
          <div className="attendance-details-section">
            <div className="details-section-title">
              Attendance
            </div>

            <div className="attendance-details-grid">
              {renderDetailRow(
                "Check-in",
                formatTime(attendance.checkIn?.time)
              )}

              {renderDetailRow(
                "Check-out",
                formatTime(attendance.checkOut?.time)
              )}

              {renderDetailRow(
                "Working time",
                formatWorkingTime(attendance.workingMinutes)
              )}

              {renderDetailRow(
                "Attendance method",
                attendance.checkIn?.method ||
                  selectedDay.attendanceMethod ||
                  "Not available"
              )}

              {renderDetailRow(
                "Overtime",
                attendance.isOvertime ? "Yes" : "No"
              )}

              {renderDetailRow(
                "Overtime minutes",
                `${attendance.overtimeMinutes || 0} min`
              )}
            </div>
          </div>
        )}

        {holiday && (
          <div className="day-information-box holiday-info">
            <div className="day-information-icon">H</div>

            <div>
              <span>Holiday</span>
              <strong>{holiday.name}</strong>

              {holiday.description && (
                <p>{holiday.description}</p>
              )}
            </div>
          </div>
        )}

        {leave && (
          <div className="day-information-box leave-info">
            <div className="day-information-icon">L</div>

            <div>
              <span>Leave</span>
              <strong>{leave.leaveType || "Approved Leave"}</strong>

              {leave.reason && <p>{leave.reason}</p>}
            </div>
          </div>
        )}

        {remoteRequest && (
          <div className="day-information-box remote-info">
            <div className="day-information-icon">R</div>

            <div>
              <span>Remote Request</span>
              <strong>
                {remoteRequest.requestedMethod || "REMOTE"}
              </strong>

              <p>
                Status: {remoteRequest.status}
              </p>

              {remoteRequest.reason && (
                <p>{remoteRequest.reason}</p>
              )}

              {remoteRequest.adminComment && (
                <p>
                  Admin comment: {remoteRequest.adminComment}
                </p>
              )}
            </div>
          </div>
        )}

        {overtimeRequest && (
          <div className="day-information-box overtime-info">
            <div className="day-information-icon">O</div>

            <div>
              <span>Overtime Request</span>

              <strong>
                {overtimeRequest.status}
              </strong>

              {overtimeRequest.reason && (
                <p>{overtimeRequest.reason}</p>
              )}

              {overtimeRequest.adminComment && (
                <p>
                  Admin comment: {overtimeRequest.adminComment}
                </p>
              )}
            </div>
          </div>
        )}

        {!attendance &&
          !holiday &&
          !leave &&
          !remoteRequest &&
          !overtimeRequest && (
            <div className="no-day-details">
              <span>No additional information</span>
              <p>
                There are no attendance records or requests
                associated with this date.
              </p>
            </div>
          )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="employee-dashboard-loading">
        <div className="dashboard-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="employee-dashboard-error">
        <div className="error-symbol">!</div>
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!dashboard || !dashboard.employee || !dashboard.summary) {
    return (
      <div className="employee-dashboard-error">
        <div className="error-symbol">!</div>
        <h2>No dashboard data</h2>
        <p>We could not load your attendance information.</p>
      </div>
    );
  }

  const { employee, summary, calendar } = dashboard;

  const firstDayOffset =
    calendar.length > 0
      ? (new Date(`${calendar[0].dateKey}T00:00:00`).getDay() + 6) % 7
      : 0;

  return (
    <div className="employee-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <span className="dashboard-eyebrow">
              EMPLOYEE PORTAL
            </span>

            <h1>
              Welcome back,{" "}
              <span>{employee.name.split(" ")[0]}</span>
            </h1>

            <p>
              Here's your attendance overview for{" "}
              {monthNames[dashboard.month - 1]} {dashboard.year}.
            </p>
          </div>

          <div className="employee-profile-card">
            <div className="employee-avatar">
              {employee.name.charAt(0).toUpperCase()}
            </div>

            <div className="employee-profile-info">
              <strong>{employee.name}</strong>

              <span>{employee.employeeId}</span>

              <small>
                {employee.designation} · {employee.department}
              </small>
            </div>
          </div>
        </div>
      </header>

      {/* Main Statistics */}
      <section className="dashboard-stats">
        <div className="stat-card stat-present">
          <div className="stat-card-icon">✓</div>

          <div className="stat-card-content">
            <span>Present</span>
            <strong>{summary.present}</strong>
            <small>This month</small>
          </div>
        </div>

        <div className="stat-card stat-absent">
          <div className="stat-card-icon">!</div>

          <div className="stat-card-content">
            <span>Absent</span>
            <strong>{summary.absent}</strong>
            <small>This month</small>
          </div>
        </div>

        <div className="stat-card stat-leave">
          <div className="stat-card-icon">L</div>

          <div className="stat-card-content">
            <span>On Leave</span>
            <strong>{summary.onLeave}</strong>
            <small>This month</small>
          </div>
        </div>

        <div className="stat-card stat-overtime">
          <div className="stat-card-icon">⏱</div>

          <div className="stat-card-content">
            <span>Overtime</span>
            <strong>{summary.overtimeMinutes}</strong>
            <small>Minutes</small>
          </div>
        </div>
      </section>

      {/* Secondary Statistics */}
      <section className="secondary-stats">
        <div className="secondary-stat">
          <span>Half Day</span>
          <strong>{summary.halfDay}</strong>
        </div>

        <div className="secondary-stat">
          <span>Holidays</span>
          <strong>{summary.holiday}</strong>
        </div>

        <div className="secondary-stat">
          <span>Weekends</span>
          <strong>{summary.weekend}</strong>
        </div>

        <div className="secondary-stat">
          <span>Missed Checkout</span>
          <strong>{summary.missedCheckout}</strong>
        </div>
      </section>

      {/* Calendar */}
      <section className="calendar-card">
        <div className="calendar-card-header">
          <div>
            <span className="dashboard-eyebrow">
              MONTHLY RECORD
            </span>

            <h2>Attendance Calendar</h2>

            <p>
              {monthNames[dashboard.month - 1]} {dashboard.year}
            </p>
          </div>

          <div className="calendar-summary-badge">
            <strong>{summary.present}</strong>
            <span>Present days</span>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="calendar-navigation">
          <button
            type="button"
            onClick={handlePreviousMonth}
            disabled={changingMonth}
            className="calendar-nav-button"
          >
            ‹ <span>Previous</span>
          </button>

          <div className="calendar-current-month">
            {monthNames[dashboard.month - 1]} {dashboard.year}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={changingMonth || isCurrentMonth()}
            className="calendar-nav-button"
          >
            <span>Next</span> ›
          </button>
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <span>
            <i className="legend-dot present"></i>
            Present
          </span>

          <span>
            <i className="legend-dot absent"></i>
            Absent
          </span>

          <span>
            <i className="legend-dot leave"></i>
            Leave
          </span>

          <span>
            <i className="legend-dot holiday"></i>
            Holiday
          </span>

          <span>
            <i className="legend-dot weekend"></i>
            Weekend
          </span>

          <span>
            <i className="legend-dot missed"></i>
            Missed Checkout
          </span>
        </div>

        {/* Weekdays */}
        <div className="calendar-weekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
            (day) => (
              <div key={day}>{day}</div>
            )
          )}
        </div>

        {/* Days */}
        <div className="calendar-grid">
          {Array.from({ length: firstDayOffset }).map(
            (_, index) => (
              <div
                key={`empty-${index}`}
                className="calendar-day empty"
              ></div>
            )
          )}

          {calendar.map((day) => {
            const statusClass = day.status
              .toLowerCase()
              .replaceAll("_", "-");

            const isSelected =
              selectedDay?.dateKey === day.dateKey;

            return (
              <button
                type="button"
                key={day.dateKey}
                className={`calendar-day ${statusClass} ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => setSelectedDay(day)}
                aria-label={`View details for ${formatDate(
                  day.dateKey
                )}`}
              >
                <div className="calendar-day-number">
                  {day.day}
                </div>

                <div className="calendar-day-status">
                  <div className="status-icon">
                    {getStatusIcon(day.status)}
                  </div>

                  <span>{getStatusLabel(day.status)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Details */}
        {renderSelectedDayDetails()}
      </section>
    </div>
  );
};

export default EmployeeDashboard;