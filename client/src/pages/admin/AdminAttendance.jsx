import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./AdminAttendance.css";

const AdminAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filters, setFilters] = useState({
    date: "",
    employeeId: "",
    status: "",
  });

  const [search, setSearch] = useState("");

  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [checkoutAttendance, setCheckoutAttendance] = useState(null);
  const [checkoutTime, setCheckoutTime] = useState("");
  const [updatingCheckout, setUpdatingCheckout] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // Monthly employee report
const [reportEmployeeId, setReportEmployeeId] = useState("");
const [reportMonth, setReportMonth] = useState(() => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
});

const [monthlyReport, setMonthlyReport] = useState(null);
const [reportLoading, setReportLoading] = useState(false);
const [reportError, setReportError] = useState("");

  // --------------------------------------------------
  // Fetch Employees
  // --------------------------------------------------

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees");

      if (response.data.success) {
        setEmployees(response.data.employees || []);
      }
    } catch (error) {
      console.error("Fetch employees error:", error);
    }
  };
  // --------------------------------------------------
// Fetch Individual Employee Monthly Report
// --------------------------------------------------

const fetchMonthlyReport = async () => {
  if (!reportEmployeeId || !reportMonth) {
    setMonthlyReport(null);
    return;
  }

  try {
    setReportLoading(true);
    setReportError("");

    const [year, month] = reportMonth.split("-");

    const response = await api.get(
      `/attendance/employee/${reportEmployeeId}/summary`,
      {
        params: {
          month: Number(month),
          year: Number(year),
        },
      }
    );

    if (response.data.success) {
      setMonthlyReport(response.data);
    } else {
      setMonthlyReport(null);
      setReportError(
        response.data.message || "Unable to load monthly report."
      );
    }
  } catch (error) {
    console.error("Monthly report error:", error);

    setMonthlyReport(null);
    setReportError(
      error.response?.data?.message ||
        "Unable to load monthly report."
    );
  } finally {
    setReportLoading(false);
  }
};

useEffect(() => {
  fetchMonthlyReport();
}, [reportEmployeeId, reportMonth]);

  // --------------------------------------------------
  // Fetch Attendance
  // --------------------------------------------------

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (filters.date) {
        params.date = filters.date;
      }

      if (filters.employeeId) {
        params.employeeId = filters.employeeId;
      }

      if (filters.status) {
        params.status = filters.status;
      }

      const response = await api.get("/attendance", {
        params,
      });

      if (response.data.success) {
        setAttendance(response.data.attendance || []);
      } else {
        setError(
          response.data.message || "Failed to load attendance"
        );
      }
    } catch (error) {
      console.error("Fetch attendance error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load attendance"
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Initial Load
  // --------------------------------------------------

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
    setCurrentPage(1);
  }, [filters]);

  // --------------------------------------------------
  // Clear Messages
  // --------------------------------------------------

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [success]);

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  const filteredAttendance = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return attendance;
    }

    return attendance.filter((record) => {
      const employee = record.employeeId;

      const employeeName =
        employee?.name?.toLowerCase() || "";

      const employeeCode =
        employee?.employeeId?.toLowerCase() || "";

      const department =
        employee?.department?.toLowerCase() || "";

      const designation =
        employee?.designation?.toLowerCase() || "";

      return (
        employeeName.includes(searchValue) ||
        employeeCode.includes(searchValue) ||
        department.includes(searchValue) ||
        designation.includes(searchValue)
      );
    });
  }, [attendance, search]);

  // --------------------------------------------------
  // Pagination
  // --------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttendance.length / itemsPerPage)
  );

  const paginatedAttendance = filteredAttendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // --------------------------------------------------
  // Stats
  // --------------------------------------------------

  const stats = useMemo(() => {
    return {
      total: filteredAttendance.length,

      present: filteredAttendance.filter(
        (item) => item.status === "PRESENT"
      ).length,

      halfDay: filteredAttendance.filter(
        (item) => item.status === "HALF_DAY"
      ).length,

      missedCheckout: filteredAttendance.filter(
        (item) => item.status === "MISSED_CHECKOUT"
      ).length,

      overtime: filteredAttendance.filter(
        (item) => item.isOvertime
      ).length,
    };
  }, [filteredAttendance]);

  // --------------------------------------------------
  // Format Date
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --------------------------------------------------
  // Format Date & Time
  // --------------------------------------------------

  const formatDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --------------------------------------------------
  // Convert Date To datetime-local
  // --------------------------------------------------

  const toDateTimeLocal = (date) => {
    if (!date) return "";

    const value = new Date(date);

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // --------------------------------------------------
  // Get Employee Information
  // --------------------------------------------------

  const getEmployee = (record) => {
    if (!record?.employeeId) {
      return {
        name: "Unknown Employee",
        employeeId: "-",
        department: "-",
        designation: "-",
      };
    }

    return record.employeeId;
  };

  // --------------------------------------------------
  // Open Details
  // --------------------------------------------------

  const handleViewDetails = (record) => {
    setSelectedAttendance(record);
    setShowDetailsModal(true);
  };

  // --------------------------------------------------
  // Open Add Checkout
  // --------------------------------------------------

  const handleOpenCheckout = (record) => {
    /*
      IMPORTANT:

      Admin can add checkout ONLY when:
      1. Employee actually checked in
      2. Employee has not checked out yet

      This prevents ON_LEAVE / ABSENT / HOLIDAY /
      WEEKEND records from showing Add Checkout.
    */

    if (!record?.checkIn?.time) {
      return;
    }

    if (record?.checkOut?.time) {
      return;
    }

    setCheckoutAttendance(record);

    setCheckoutTime(
      toDateTimeLocal(record.checkIn.time)
    );
  };

  // --------------------------------------------------
  // Update Checkout
  // --------------------------------------------------

  const handleUpdateCheckout = async () => {
    if (!checkoutAttendance) {
      return;
    }

    if (!checkoutTime) {
      setError("Please select checkout time.");
      return;
    }

    if (!checkoutAttendance.checkIn?.time) {
      setError(
        "Checkout cannot be added because this employee has no check-in."
      );
      return;
    }

    if (checkoutAttendance.checkOut?.time) {
      setError("This attendance already has a checkout.");
      return;
    }

    const selectedCheckout = new Date(checkoutTime);
    const checkInTime = new Date(
      checkoutAttendance.checkIn.time
    );

    if (
      Number.isNaN(selectedCheckout.getTime())
    ) {
      setError("Invalid checkout time.");
      return;
    }

    if (
      selectedCheckout.getTime() <=
      checkInTime.getTime()
    ) {
      setError(
        "Checkout time must be after check-in time."
      );
      return;
    }

    try {
      setUpdatingCheckout(true);
      setError("");

      const response = await api.patch(
        `/attendance/${checkoutAttendance._id}/checkout`,
        {
          checkoutTime,
        }
      );

      if (response.data.success) {
        setSuccess(
          response.data.message ||
            "Checkout updated successfully."
        );

        setCheckoutAttendance(null);
        setCheckoutTime("");

        await fetchAttendance();
      } else {
        setError(
          response.data.message ||
            "Failed to update checkout."
        );
      }
    } catch (error) {
      console.error(
        "Update checkout error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to update checkout."
      );
    } finally {
      setUpdatingCheckout(false);
    }
  };

  // --------------------------------------------------
  // Filter Change
  // --------------------------------------------------

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // Clear Filters
  // --------------------------------------------------

  const clearFilters = () => {
    setFilters({
      date: "",
      employeeId: "",
      status: "",
    });

    setSearch("");
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // Status Badge
  // --------------------------------------------------

  const getStatusClass = (status) => {
    switch (status) {
      case "PRESENT":
        return "status-present";

      case "HALF_DAY":
        return "status-half-day";

      case "MISSED_CHECKOUT":
        return "status-missed";

      case "ON_LEAVE":
        return "status-leave";

      case "HOLIDAY":
        return "status-holiday";

      case "WEEKEND":
        return "status-weekend";

      case "ABSENT":
        return "status-absent";

      default:
        return "status-default";
    }
  };

  // --------------------------------------------------
  // Render Action
  // --------------------------------------------------

  const renderAction = (record) => {
    const hasCheckIn = !!record?.checkIn?.time;
    const hasCheckOut = !!record?.checkOut?.time;

    /*
      THIS IS THE IMPORTANT FIX.

      Add Checkout is shown ONLY when:
      check-in exists AND checkout doesn't exist.
    */

    if (hasCheckIn && !hasCheckOut) {
      return (
        <button
          type="button"
          className="attendance-action-btn"
          onClick={() => handleOpenCheckout(record)}
        >
          Add Checkout
        </button>
      );
    }

    if (record.status === "ON_LEAVE") {
      return (
        <span className="attendance-action-muted">
          Leave Day
        </span>
      );
    }

    if (record.status === "HOLIDAY") {
      return (
        <span className="attendance-action-muted">
          Holiday
        </span>
      );
    }

    if (record.status === "WEEKEND") {
      return (
        <span className="attendance-action-muted">
          Weekend
        </span>
      );
    }

    if (record.status === "ABSENT") {
      return (
        <span className="attendance-action-muted">
          Absent
        </span>
      );
    }

    if (hasCheckOut) {
      return (
        <span className="attendance-action-complete">
          Completed
        </span>
      );
    }

    return (
      <span className="attendance-action-muted">
        -
      </span>
    );
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="admin-attendance-page">
        <div className="attendance-loading">
          Loading attendance...
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="admin-attendance-page">
      {/* Header */}

      <div className="attendance-page-header">
        <div>
          <h1>Attendance Management</h1>

          <p>
            View and manage employee attendance records.
          </p>
        </div>

        <button
          type="button"
          className="attendance-refresh-btn"
          onClick={fetchAttendance}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Messages */}

      {error && (
        <div className="attendance-alert attendance-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="attendance-alert attendance-alert-success">
          {success}
        </div>
      )}

  {/* Stats */}

<div className="attendance-stats">
  <div className="attendance-stat-card">
    <span className="stat-label">Total Records</span>
    <strong>{stats.total}</strong>
  </div>

  <div className="attendance-stat-card">
    <span className="stat-label">Present</span>
    <strong>{stats.present}</strong>
  </div>

  <div className="attendance-stat-card">
    <span className="stat-label">Half Day</span>
    <strong>{stats.halfDay}</strong>
  </div>

  <div className="attendance-stat-card">
    <span className="stat-label">Missed Checkout</span>
    <strong>{stats.missedCheckout}</strong>
  </div>

  <div className="attendance-stat-card">
    <span className="stat-label">Overtime</span>
    <strong>{stats.overtime}</strong>
  </div>
</div>

{/* ==================================================
    INDIVIDUAL EMPLOYEE MONTHLY REPORT
================================================== */}

<div className="monthly-report-section">
  <div className="monthly-report-header">
    <div>
      <h2>Employee Monthly Attendance Report</h2>
      <p>
        View individual attendance details for monthly salary calculation.
      </p>
    </div>
  </div>

  <div className="monthly-report-filters">
    <div className="filter-group">
      <label htmlFor="report-employee">Select Employee</label>

      <select
        id="report-employee"
        value={reportEmployeeId}
        onChange={(event) => setReportEmployeeId(event.target.value)}
      >
        <option value="">Select an employee</option>

        {employees.map((employee) => (
          <option key={employee._id} value={employee._id}>
            {employee.employeeId} - {employee.name}
          </option>
        ))}
      </select>
    </div>

    <div className="filter-group">
      <label htmlFor="report-month">Select Month</label>

      <input
        id="report-month"
        type="month"
        value={reportMonth}
        onChange={(event) => setReportMonth(event.target.value)}
      />
    </div>

    <button
      type="button"
      className="attendance-refresh-btn"
      onClick={fetchMonthlyReport}
      disabled={!reportEmployeeId || !reportMonth || reportLoading}
    >
      {reportLoading ? "Loading..." : "Refresh Report"}
    </button>
  </div>

  {reportError && (
    <div className="attendance-alert attendance-alert-error">
      {reportError}
    </div>
  )}

  {!reportEmployeeId && (
    <div className="attendance-empty">
      <h3>Select an employee</h3>
      <p>
        Choose an employee and month to view their attendance report.
      </p>
    </div>
  )}

  {reportLoading && (
    <div className="attendance-loading">
      Loading monthly report...
    </div>
  )}

  {!reportLoading && monthlyReport && (
    <>
      <div className="monthly-report-employee">
        <div>
          <span>Employee</span>
          <strong>{monthlyReport.employee?.name || "-"}</strong>
        </div>

        <div>
          <span>Employee ID</span>
          <strong>{monthlyReport.employee?.employeeId || "-"}</strong>
        </div>

        <div>
          <span>Department</span>
          <strong>{monthlyReport.employee?.department || "-"}</strong>
        </div>

        <div>
          <span>Designation</span>
          <strong>{monthlyReport.employee?.designation || "-"}</strong>
        </div>
      </div>

      <div className="monthly-report-stats">
        {[
          ["Present", monthlyReport.summary?.present, "status-present"],
          ["Absent", monthlyReport.summary?.absent, "status-absent"],
          ["Half Day", monthlyReport.summary?.halfDay, "status-half-day"],
          ["Leave", monthlyReport.summary?.onLeave, "status-leave"],
          ["Holiday", monthlyReport.summary?.holiday, "status-holiday"],
          ["Weekend", monthlyReport.summary?.weekend, "status-weekend"],
          ["Missed Checkout", monthlyReport.summary?.missedCheckout, "status-missed"],
          ["Overtime Days", monthlyReport.summary?.overtime, "status-default"],
          ["Upcoming", monthlyReport.summary?.upcoming, "status-default"],
        ].map(([label, value, statusClass]) => (
          <div className="monthly-report-stat-card" key={label}>
            <span>{label}</span>
            <strong className={statusClass}>
              {value ?? 0}
            </strong>
          </div>
        ))}
      </div>

      <div className="monthly-report-overtime">
        <strong>Total Overtime Minutes:</strong>{" "}
        {monthlyReport.summary?.overtimeMinutes || 0} minutes
      </div>

      <div className="monthly-report-table-card">
        <div className="attendance-table-header">
          <div>
            <h2>Date-wise Attendance</h2>
            <p>
              {monthlyReport.calendar?.length || 0} calendar days
            </p>
          </div>
        </div>

        <div className="attendance-table-wrapper">
          <table className="attendance-table monthly-report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Minutes</th>
                <th>Status</th>
                <th>Overtime</th>
              </tr>
            </thead>

            <tbody>
              {(monthlyReport.calendar || []).map((day) => {
                const attendanceRecord = day.attendance;

                return (
                  <tr key={day.dateKey}>
                    <td>{formatDate(day.date)}</td>
                    <td>{day.day}</td>

                    <td>
                      {attendanceRecord?.checkIn?.time
                        ? formatDateTime(attendanceRecord.checkIn.time)
                        : "-"}
                    </td>

                    <td>
                      {attendanceRecord?.checkOut?.time
                        ? formatDateTime(attendanceRecord.checkOut.time)
                        : "-"}
                    </td>

                    <td>
                      {attendanceRecord?.workingMinutes || 0}m
                    </td>

                    <td>
                      <span
                        className={`status-badge ${getStatusClass(day.status)}`}
                      >
                        {day.status}
                      </span>
                    </td>

                    <td>
                      {day.isOvertime
                        ? `+${day.overtimeMinutes || 0}m`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>

      {/* Filters */}

      <div className="attendance-filters">
        <div className="filter-group">
          <label htmlFor="attendance-search">
            Search
          </label>

          <input
            id="attendance-search"
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="attendance-date">
            Date
          </label>

          <input
            id="attendance-date"
            type="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="attendance-employee">
            Employee
          </label>

          <select
            id="attendance-employee"
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
          >
            <option value="">
              All Employees
            </option>

            {employees.map((employee) => (
              <option
                key={employee._id}
                value={employee._id}
              >
                {employee.employeeId} -{" "}
                {employee.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="attendance-status">
            Status
          </label>

          <select
            id="attendance-status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">
              All Status
            </option>

            <option value="PRESENT">
              Present
            </option>

            <option value="HALF_DAY">
              Half Day
            </option>

            <option value="MISSED_CHECKOUT">
              Missed Checkout
            </option>

            <option value="ON_LEAVE">
              On Leave
            </option>

            <option value="ABSENT">
              Absent
            </option>

            <option value="HOLIDAY">
              Holiday
            </option>

            <option value="WEEKEND">
              Weekend
            </option>
          </select>
        </div>

        <button
          type="button"
          className="attendance-clear-btn"
          onClick={clearFilters}
        >
          Clear
        </button>
      </div>

      {/* Table */}

      <div className="attendance-table-card">
        <div className="attendance-table-header">
          <div>
            <h2>Attendance Records</h2>

            <p>
              {filteredAttendance.length} record
              {filteredAttendance.length !== 1
                ? "s"
                : ""}
            </p>
          </div>
        </div>

        {paginatedAttendance.length === 0 ? (
          <div className="attendance-empty">
            <div className="attendance-empty-icon">
              📋
            </div>

            <h3>No attendance records</h3>

            <p>
              No records match your current filters.
            </p>
          </div>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Overtime</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedAttendance.map((record) => {
                  const employee =
                    getEmployee(record);

                  return (
                    <tr key={record._id}>
                      {/* Employee */}

                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar">
                            {employee.name
                              ?.charAt(0)
                              ?.toUpperCase() || "?"}
                          </div>

                          <div>
                            <strong>
                              {employee.name}
                            </strong>

                            <span>
                              {employee.employeeId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}

                      <td>
                        {formatDate(record.date)}
                      </td>

                      {/* Check In */}

                      <td>
                        {record.checkIn?.time ? (
                          <span className="time-value">
                            {formatDateTime(
                              record.checkIn.time
                            )}
                          </span>
                        ) : (
                          <span className="empty-value">
                            -
                          </span>
                        )}
                      </td>

                      {/* Check Out */}

                      <td>
                        {record.checkOut?.time ? (
                          <span className="time-value">
                            {formatDateTime(
                              record.checkOut.time
                            )}
                          </span>
                        ) : (
                          <span className="not-checked-out">
                            Not checked out
                          </span>
                        )}
                      </td>

                      {/* Working */}

                      <td>
                        <strong>
                          {record.workingMinutes || 0}m
                        </strong>
                      </td>

                      {/* Method */}

                      <td>
                        <span className="method-badge">
                          {record.checkIn?.method ||
                            record.checkOut?.method ||
                            employee.attendanceMethod ||
                            "-"}
                        </span>
                      </td>

                      {/* Status */}

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>

                      {/* Overtime */}

                      <td>
                        {record.isOvertime ? (
                          <span className="overtime-badge">
                            +{record.overtimeMinutes || 0}m
                          </span>
                        ) : (
                          <span className="empty-value">
                            -
                          </span>
                        )}
                      </td>

                      {/* Action */}

                      <td>
                        <div className="attendance-actions">
                          <button
                            type="button"
                            className="view-btn"
                            onClick={() =>
                              handleViewDetails(record)
                            }
                          >
                            View
                          </button>

                          {renderAction(record)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}

        {filteredAttendance.length > 0 && (
          <div className="attendance-pagination">
            <span>
              Page {currentPage} of{" "}
              {totalPages}
            </span>

            <div>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage(
                    (page) => page - 1
                  )
                }
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  currentPage === totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (page) => page + 1
                  )
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}

      {showDetailsModal &&
        selectedAttendance && (
          <div
            className="attendance-modal-overlay"
            onClick={() =>
              setShowDetailsModal(false)
            }
          >
            <div
              className="attendance-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="attendance-modal-header">
                <div>
                  <h2>Attendance Details</h2>

                  <p>
                    {getEmployee(
                      selectedAttendance
                    ).name}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() =>
                    setShowDetailsModal(false)
                  }
                >
                  ×
                </button>
              </div>

              <div className="attendance-details-grid">
                <div>
                  <span>Employee ID</span>
                  <strong>
                    {
                      getEmployee(
                        selectedAttendance
                      ).employeeId
                    }
                  </strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>
                    {formatDate(
                      selectedAttendance.date
                    )}
                  </strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>
                    {
                      getEmployee(
                        selectedAttendance
                      ).department || "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>Designation</span>
                  <strong>
                    {
                      getEmployee(
                        selectedAttendance
                      ).designation || "-"
                    }
                  </strong>
                </div>

                <div>
                  <span>Check In</span>
                  <strong>
                    {selectedAttendance.checkIn?.time
                      ? formatDateTime(
                          selectedAttendance.checkIn
                            .time
                        )
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>Check Out</span>
                  <strong>
                    {selectedAttendance.checkOut?.time
                      ? formatDateTime(
                          selectedAttendance.checkOut
                            .time
                        )
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>Working Minutes</span>
                  <strong>
                    {selectedAttendance.workingMinutes ||
                      0}
                    m
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {selectedAttendance.status}
                  </strong>
                </div>

                <div>
                  <span>Attendance Method</span>
                  <strong>
                    {selectedAttendance.checkIn
                      ?.method ||
                      selectedAttendance.checkOut
                        ?.method ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>Overtime</span>
                  <strong>
                    {selectedAttendance.isOvertime
                      ? `${selectedAttendance.overtimeMinutes || 0}m`
                      : "No"}
                  </strong>
                </div>
              </div>

              <div className="attendance-modal-footer">
                <button
                  type="button"
                  onClick={() =>
                    setShowDetailsModal(false)
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Add Checkout Modal */}

      {checkoutAttendance && (
        <div
          className="attendance-modal-overlay"
          onClick={() =>
            setCheckoutAttendance(null)
          }
        >
          <div
            className="attendance-modal checkout-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="attendance-modal-header">
              <div>
                <h2>Add Checkout</h2>

                <p>
                  {
                    getEmployee(
                      checkoutAttendance
                    ).name
                  }{" "}
                  ·{" "}
                  {
                    getEmployee(
                      checkoutAttendance
                    ).employeeId
                  }
                </p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() =>
                  setCheckoutAttendance(null)
                }
              >
                ×
              </button>
            </div>

            <div className="checkout-info">
              <div>
                <span>Check In</span>

                <strong>
                  {formatDateTime(
                    checkoutAttendance.checkIn.time
                  )}
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong>
                  {checkoutAttendance.status}
                </strong>
              </div>
            </div>

            <div className="checkout-form-group">
              <label htmlFor="admin-checkout-time">
                Checkout Date & Time
              </label>

              <input
                id="admin-checkout-time"
                type="datetime-local"
                value={checkoutTime}
                onChange={(event) =>
                  setCheckoutTime(
                    event.target.value
                  )
                }
              />

              <small>
                Checkout time must be after the
                employee's check-in time.
              </small>
            </div>

            <div className="attendance-modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() =>
                  setCheckoutAttendance(null)
                }
                disabled={updatingCheckout}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-save-btn"
                onClick={handleUpdateCheckout}
                disabled={updatingCheckout}
              >
                {updatingCheckout
                  ? "Saving..."
                  : "Save Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;