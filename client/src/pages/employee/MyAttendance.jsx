import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./MyAttendance.css";

const MyAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 8;

  const [showWorkReport, setShowWorkReport] = useState(false);
  const [workDescription, setWorkDescription] = useState("");
  const [workReportLoading, setWorkReportLoading] = useState(false);
  const [workReportExists, setWorkReportExists] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  // --------------------------------------------------
  // DATE HELPERS
  // --------------------------------------------------

  const getDateKey = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDay = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      weekday: "long",
    });
  };

  const formatShortDay = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      weekday: "short",
    });
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLongDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // --------------------------------------------------
  // STATUS HELPERS
  // --------------------------------------------------

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    const statusMap = {
      PRESENT: "Present",
      ABSENT: "Absent",
      ON_LEAVE: "On Leave",
      HOLIDAY: "Holiday",
      WEEKEND: "Weekend",
      MISSED_CHECKOUT: "Missed Checkout",
      HALF_DAY: "Half Day",
      UPCOMING: "Upcoming",
    };

    return (
      statusMap[status] ||
      status
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );
  };

  const getStatusClass = (status) => {
    if (!status) return "unknown";

    return status.toLowerCase().replaceAll("_", "-");
  };

  // --------------------------------------------------
  // ATTENDANCE METHOD
  // --------------------------------------------------

  const getAttendanceMethod = (record) => {
    return (
      record?.checkIn?.method ||
      record?.checkOut?.method ||
      record?.method ||
      record?.attendanceMethod ||
      ""
    );
  };

  const formatMethod = (method) => {
    if (!method) return "—";

    const methodMap = {
      OFFICE: "Office",
      REMOTE: "Remote",
      FIELD: "Field",
    };

    return (
      methodMap[method] ||
      method
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case "REMOTE":
        return "⌂";

      case "FIELD":
        return "⌖";

      case "OFFICE":
        return "⌂";

      default:
        return "•";
    }
  };

  // --------------------------------------------------
  // WORKING TIME
  // --------------------------------------------------

  const formatMinutes = (minutes) => {
    const totalMinutes = Number(minutes || 0);

    if (totalMinutes <= 0) return "0m";

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${remainingMinutes}m`;
  };

  // --------------------------------------------------
  // TODAY ATTENDANCE
  // --------------------------------------------------

  const todayAttendance = useMemo(() => {
    const todayKey = getDateKey(new Date());

    return (
      attendance.find(
        (record) => getDateKey(record.date) === todayKey
      ) || null
    );
  }, [attendance]);

  /*
   * IMPORTANT FIX
   *
   * Do NOT use:
   *
   * !todayAttendance
   *
   * because backend can return a record for today
   * even before the employee checks in.
   *
   * Instead, check whether an actual check-in time exists.
   */

  const hasCheckedIn = !!todayAttendance?.checkIn?.time;

  const hasCheckedOut = !!todayAttendance?.checkOut?.time;

  const isCheckedIn = hasCheckedIn && !hasCheckedOut;

  const isCheckedOut = hasCheckedIn && hasCheckedOut;

  // --------------------------------------------------
  // LIVE WORKING TIME
  // --------------------------------------------------

  const liveWorkingMinutes = useMemo(() => {
    if (!todayAttendance?.checkIn?.time) {
      return Number(todayAttendance?.workingMinutes || 0);
    }

    if (todayAttendance?.checkOut?.time) {
      return Number(todayAttendance?.workingMinutes || 0);
    }

    const checkInTime = new Date(
      todayAttendance.checkIn.time
    ).getTime();

    const now = currentTime.getTime();

    if (Number.isNaN(checkInTime)) return 0;

    return Math.max(
      0,
      Math.floor((now - checkInTime) / 60000)
    );
  }, [todayAttendance, currentTime]);

  // --------------------------------------------------
  // MESSAGE
  // --------------------------------------------------

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4000);
  };

  // --------------------------------------------------
  // FETCH ATTENDANCE
  // --------------------------------------------------

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const response = await api.get("/attendance/my");

      if (response.data.success) {
        setAttendance(response.data.attendance || []);
      } else {
        setAttendance([]);

        showMessage(
          response.data.message ||
            "Failed to load attendance",
          "error"
        );
      }
    } catch (error) {
      console.error("Fetch attendance error:", error);

      setAttendance([]);

      showMessage(
        error.response?.data?.message ||
          "Unable to load attendance",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH TODAY WORK REPORT
  // --------------------------------------------------

  const fetchTodayWorkReport = async () => {
    try {
      const response = await api.get("/work-reports/my");

      if (response.data.success) {
        const reports = response.data.workReports || [];

        const todayReport = reports.find(
          (report) =>
            getDateKey(report.date) ===
            getDateKey(new Date())
        );

        if (todayReport) {
          setWorkReportExists(true);
          setWorkDescription(
            todayReport.description || ""
          );
        } else {
          setWorkReportExists(false);
          setWorkDescription("");
        }
      }
    } catch (error) {
      console.error(
        "Fetch today's work report error:",
        error
      );
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    fetchAttendance();
    fetchTodayWorkReport();
  }, []);

  // --------------------------------------------------
  // LIVE CLOCK
  // --------------------------------------------------

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --------------------------------------------------
  // CHECK IN
  // --------------------------------------------------

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      showMessage(
        "Geolocation is not supported by your browser.",
        "error"
      );
      return;
    }

    setActionLoading(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } =
            position.coords;

          const response = await api.post(
            "/attendance/check-in",
            {
              latitude,
              longitude,
              accuracy,
            }
          );

          if (response.data.success) {
            showMessage(
              response.data.message ||
                "Check-in successful",
              "success"
            );

            await fetchAttendance();
          } else {
            showMessage(
              response.data.message ||
                "Check-in failed",
              "error"
            );
          }
        } catch (error) {
          console.error("Check-in error:", error);

          showMessage(
            error.response?.data?.message ||
              "Unable to check in",
            "error"
          );
        } finally {
          setActionLoading(false);
        }
      },
      (error) => {
        setActionLoading(false);

        let errorMessage =
          "Unable to get your location.";

        if (error.code === 1) {
          errorMessage =
            "Location permission was denied. Please allow location access.";
        } else if (error.code === 2) {
          errorMessage =
            "Your location could not be determined.";
        } else if (error.code === 3) {
          errorMessage =
            "Location request timed out. Please try again.";
        }

        showMessage(errorMessage, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // --------------------------------------------------
  // CHECK OUT BUTTON
  // --------------------------------------------------

  const handleCheckOutClick = async () => {
    await fetchTodayWorkReport();

    setShowWorkReport(true);
  };

  // --------------------------------------------------
  // WORK REPORT + CHECK OUT
  // --------------------------------------------------

  const handleWorkReportAndCheckOut = async () => {
    const description = workDescription.trim();

    if (!description) {
      showMessage(
        "Please enter today's work description.",
        "error"
      );
      return;
    }

    if (description.length < 10) {
      showMessage(
        "Work description must contain at least 10 characters.",
        "error"
      );
      return;
    }

    if (!navigator.geolocation) {
      showMessage(
        "Geolocation is not supported by your browser.",
        "error"
      );
      return;
    }

    setWorkReportLoading(true);
    setMessage("");

    try {
      // ----------------------------------------------
      // SAVE / UPDATE WORK REPORT
      // ----------------------------------------------

      if (workReportExists) {
        await api.put("/work-reports/my", {
          description,
        });
      } else {
        await api.post("/work-reports", {
          description,
        });
      }

      // ----------------------------------------------
      // GET LOCATION
      // ----------------------------------------------

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const {
              latitude,
              longitude,
              accuracy,
            } = position.coords;

            const response = await api.post(
              "/attendance/check-out",
              {
                latitude,
                longitude,
                accuracy,
              }
            );

            if (response.data.success) {
              setShowWorkReport(false);
              setWorkDescription("");
              setWorkReportExists(true);

              showMessage(
                response.data.message ||
                  "Check-out successful",
                "success"
              );

              await fetchAttendance();
              await fetchTodayWorkReport();
            } else {
              showMessage(
                response.data.message ||
                  "Check-out failed",
                "error"
              );
            }
          } catch (error) {
            console.error("Check-out error:", error);

            showMessage(
              error.response?.data?.message ||
                "Unable to check out",
              "error"
            );
          } finally {
            setWorkReportLoading(false);
          }
        },
        (error) => {
          setWorkReportLoading(false);

          let errorMessage =
            "Unable to get your location.";

          if (error.code === 1) {
            errorMessage =
              "Location permission was denied. Please allow location access.";
          } else if (error.code === 2) {
            errorMessage =
              "Your location could not be determined.";
          } else if (error.code === 3) {
            errorMessage =
              "Location request timed out. Please try again.";
          }

          showMessage(errorMessage, "error");
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      console.error("Work report error:", error);

      setWorkReportLoading(false);

      showMessage(
        error.response?.data?.message ||
          "Unable to save work report",
        "error"
      );
    }
  };

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const method = getAttendanceMethod(record);

      const statusMatches =
        statusFilter === "ALL" ||
        record.status === statusFilter;

      const methodMatches =
        methodFilter === "ALL" ||
        method === methodFilter;

      return statusMatches && methodMatches;
    });
  }, [
    attendance,
    statusFilter,
    methodFilter,
  ]);

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredAttendance.length / recordsPerPage
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safeCurrentPage - 1) * recordsPerPage;

  const paginatedAttendance =
    filteredAttendance.slice(
      startIndex,
      startIndex + recordsPerPage
    );

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const presentCount = attendance.filter(
    (record) => record.status === "PRESENT"
  ).length;

  const absentCount = attendance.filter(
    (record) => record.status === "ABSENT"
  ).length;

  const leaveCount = attendance.filter(
    (record) => record.status === "ON_LEAVE"
  ).length;

  const overtimeMinutes = attendance.reduce(
    (total, record) =>
      total + Number(record.overtimeMinutes || 0),
    0
  );

  // --------------------------------------------------
  // CLEAR FILTERS
  // --------------------------------------------------

  const clearFilters = () => {
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="attendance-page">
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Loading your attendance...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="attendance-page">

      {/* -------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* -------------------------------------------- */}

      <div className="attendance-page-header">
        <div>
          <p className="dashboard-eyebrow">
            EMPLOYEE PORTAL
          </p>

          <h1>My Attendance</h1>

          <p>
            Track your daily attendance, working hours
            and attendance history.
          </p>
        </div>
      </div>

      {/* -------------------------------------------- */}
      {/* MESSAGE */}
      {/* -------------------------------------------- */}

      {message && (
        <div
          className={`attendance-message ${messageType}`}
        >
          <span>
            {messageType === "success" ? "✓" : "!"}
          </span>

          <p>{message}</p>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setMessageType("");
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* -------------------------------------------- */}
      {/* TODAY SECTION */}
      {/* -------------------------------------------- */}

      <section className="today-section">

        <div className="today-main-card">

          <div className="today-card-header">

            <div>
              <p className="dashboard-eyebrow">
                TODAY
              </p>

              <h2>
                {formatLongDate(new Date())}
              </h2>
            </div>

            <div
              className={`today-status ${
                isCheckedOut
                  ? "completed"
                  : isCheckedIn
                  ? "working"
                  : "not-started"
              }`}
            >
              <span className="status-dot"></span>

              {isCheckedOut
                ? "Completed"
                : isCheckedIn
                ? "Working"
                : "Not Checked In"}
            </div>

          </div>

          {/* ---------------------------------------- */}
          {/* TIME */}
          {/* ---------------------------------------- */}

          <div className="today-time-area">

            <div className="clock-display">
              {currentTime.toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )}
            </div>

            <p>Current time</p>

          </div>

          {/* ---------------------------------------- */}
          {/* TODAY DETAILS */}
          {/* ---------------------------------------- */}

          <div className="today-details">

            <div className="today-detail-item">
              <span className="detail-label">
                Check In
              </span>

              <strong>
                {formatTime(
                  todayAttendance?.checkIn?.time
                )}
              </strong>
            </div>

            <div className="today-detail-item">
              <span className="detail-label">
                Check Out
              </span>

              <strong>
                {formatTime(
                  todayAttendance?.checkOut?.time
                )}
              </strong>
            </div>

            <div className="today-detail-item">
              <span className="detail-label">
                Working Time
              </span>

              <strong>
                {formatMinutes(
                  liveWorkingMinutes
                )}
              </strong>
            </div>

            <div className="today-detail-item">
              <span className="detail-label">
                Method
              </span>

              <strong>
                {formatMethod(
                  getAttendanceMethod(
                    todayAttendance
                  )
                )}
              </strong>
            </div>

          </div>

          {/* ---------------------------------------- */}
          {/* ACTION BUTTONS */}
          {/* ---------------------------------------- */}

          <div className="today-action-area">

            {/* FIXED CHECK-IN CONDITION */}
            {!hasCheckedIn && (
              <button
                type="button"
                className="primary-attendance-button"
                onClick={handleCheckIn}
                disabled={actionLoading}
              >
                <span className="button-icon">
                  ✓
                </span>

                {actionLoading
                  ? "Checking location..."
                  : "Check In"}
              </button>
            )}

            {isCheckedIn && (
              <button
                type="button"
                className="checkout-attendance-button"
                onClick={handleCheckOutClick}
                disabled={actionLoading}
              >
                <span className="button-icon">
                  ↗
                </span>

                Check Out
              </button>
            )}

            {isCheckedOut && (
              <div className="completed-message">
                <span>✓</span>

                <div>
                  <strong>
                    Attendance completed
                  </strong>

                  <p>
                    Your attendance has been
                    completed for today.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* ---------------------------------------- */}
          {/* FOOTER */}
          {/* ---------------------------------------- */}

          <div className="today-footer">

            {isCheckedIn && (
              <span>
                ● You are currently working
              </span>
            )}

            {isCheckedOut && (
              <span>
                ✓ Today's attendance is complete
              </span>
            )}

            {!hasCheckedIn && (
              <span>
                Check in when you arrive at work.
              </span>
            )}

          </div>

        </div>

      </section>

      {/* -------------------------------------------- */}
      {/* MONTH OVERVIEW */}
      {/* -------------------------------------------- */}

      <section className="month-overview">

        <div className="section-title-row">

          <div>
            <p className="dashboard-eyebrow">
              OVERVIEW
            </p>

            <h2>Attendance Summary</h2>

            <p>
              Based on your available attendance
              records.
            </p>
          </div>

        </div>

        <div className="month-summary-grid">

          <div className="month-summary-card">
            <span>Present</span>
            <strong>{presentCount}</strong>
          </div>

          <div className="month-summary-card">
            <span>Absent</span>
            <strong>{absentCount}</strong>
          </div>

          <div className="month-summary-card">
            <span>On Leave</span>
            <strong>{leaveCount}</strong>
          </div>

          <div className="month-summary-card">
            <span>Overtime</span>
            <strong>
              {formatMinutes(overtimeMinutes)}
            </strong>
          </div>

        </div>

      </section>

      {/* -------------------------------------------- */}
      {/* ATTENDANCE HISTORY */}
      {/* -------------------------------------------- */}

      <section className="attendance-history-section">

        <div className="section-title-row">

          <div>
            <p className="dashboard-eyebrow">
              RECORDS
            </p>

            <h2>Attendance History</h2>

            <p>
              View your previous attendance records.
            </p>
          </div>

        </div>

        {/* ------------------------------------------ */}
        {/* FILTERS */}
        {/* ------------------------------------------ */}

        <div className="attendance-filters">

          <div className="filter-group">

            <span>Status</span>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value
                );
                setCurrentPage(1);
              }}
            >
              <option value="ALL">
                All Status
              </option>

              <option value="PRESENT">
                Present
              </option>

              <option value="ABSENT">
                Absent
              </option>

              <option value="ON_LEAVE">
                On Leave
              </option>

              <option value="HALF_DAY">
                Half Day
              </option>

              <option value="MISSED_CHECKOUT">
                Missed Checkout
              </option>

              <option value="HOLIDAY">
                Holiday
              </option>

              <option value="WEEKEND">
                Weekend
              </option>
            </select>

          </div>

          <div className="filter-group">

            <span>Method</span>

            <select
              value={methodFilter}
              onChange={(event) => {
                setMethodFilter(
                  event.target.value
                );
                setCurrentPage(1);
              }}
            >
              <option value="ALL">
                All Methods
              </option>

              <option value="OFFICE">
                Office
              </option>

              <option value="REMOTE">
                Remote
              </option>

              <option value="FIELD">
                Field
              </option>
            </select>

          </div>

          {(statusFilter !== "ALL" ||
            methodFilter !== "ALL") && (
            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}

        </div>

        {/* ------------------------------------------ */}
        {/* RECORD LIST */}
        {/* ------------------------------------------ */}

        {paginatedAttendance.length === 0 ? (
          <div className="empty-attendance">
            <div className="empty-icon">
              ◷
            </div>

            <h3>No attendance records</h3>

            <p>
              No records match the selected filters.
            </p>

            {(statusFilter !== "ALL" ||
              methodFilter !== "ALL") && (
              <button
                type="button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="attendance-record-list">

            {paginatedAttendance.map(
              (record) => {
                const method =
                  getAttendanceMethod(record);

                return (
                  <div
                    key={
                      record._id ||
                      record.id ||
                      record.date
                    }
                    className="attendance-record"
                  >

                    {/* DATE */}
                    <div className="record-date">

                      <strong>
                        {formatShortDay(
                          record.date
                        )}
                      </strong>

                      <span>
                        {formatDate(
                          record.date
                        )}
                      </span>

                    </div>

                    {/* STATUS */}
                    <div className="record-status">

                      <span
                        className={`status-badge ${getStatusClass(
                          record.status
                        )}`}
                      >
                        {formatStatus(
                          record.status
                        )}
                      </span>

                    </div>

                    {/* CHECK IN */}
                    <div className="record-time">

                      <span>
                        Check In
                      </span>

                      <strong>
                        {formatTime(
                          record?.checkIn?.time
                        )}
                      </strong>

                    </div>

                    {/* CHECK OUT */}
                    <div className="record-time">

                      <span>
                        Check Out
                      </span>

                      <strong>
                        {formatTime(
                          record?.checkOut?.time
                        )}
                      </strong>

                    </div>

                    {/* WORKING TIME */}
                    <div className="record-duration">

                      <span>
                        Working
                      </span>

                      <strong>
                        {formatMinutes(
                          record.workingMinutes
                        )}
                      </strong>

                    </div>

                    {/* METHOD */}
                    <div className="record-method">

                      <span className="method-icon">
                        {getMethodIcon(method)}
                      </span>

                      <span>
                        {formatMethod(method)}
                      </span>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

        {/* ------------------------------------------ */}
        {/* PAGINATION */}
        {/* ------------------------------------------ */}

        {filteredAttendance.length >
          recordsPerPage && (
          <div className="attendance-pagination">

            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(1, page - 1)
                )
              }
            >
              ← Previous
            </button>

            <span>
              Page {safeCurrentPage} of{" "}
              {totalPages}
            </span>

            <button
              type="button"
              disabled={
                safeCurrentPage === totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
              }
            >
              Next →
            </button>

          </div>
        )}

      </section>

      {/* -------------------------------------------- */}
      {/* WORK REPORT MODAL */}
      {/* -------------------------------------------- */}

      {showWorkReport && (
        <div
          className="work-report-modal-overlay"
          onClick={() => {
            if (!workReportLoading) {
              setShowWorkReport(false);
            }
          }}
        >

          <div
            className="work-report-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <p className="dashboard-eyebrow">
                  WORK REPORT
                </p>

                <h2>
                  Complete Today's Work
                </h2>

                <p>
                  Please describe the work you
                  completed before checking out.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowWorkReport(false)
                }
                disabled={workReportLoading}
              >
                ×
              </button>

            </div>

            <div className="modal-body">

              <label htmlFor="work-description">
                Work Description
              </label>

              <textarea
                id="work-description"
                value={workDescription}
                onChange={(event) =>
                  setWorkDescription(
                    event.target.value
                  )
                }
                placeholder="Example: Completed employee attendance API integration, fixed validation issues and tested the check-in/check-out flow..."
                rows={6}
                disabled={workReportLoading}
              />

              <div className="character-info">
                <span>
                  Minimum 10 characters
                </span>

                <span>
                  {workDescription.length} characters
                </span>
              </div>

            </div>

            <div className="modal-footer">

              <button
                type="button"
                className="modal-cancel-button"
                onClick={() =>
                  setShowWorkReport(false)
                }
                disabled={workReportLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-submit-button"
                onClick={
                  handleWorkReportAndCheckOut
                }
                disabled={workReportLoading}
              >
                {workReportLoading
                  ? "Processing..."
                  : "Save & Check Out"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default MyAttendance;
