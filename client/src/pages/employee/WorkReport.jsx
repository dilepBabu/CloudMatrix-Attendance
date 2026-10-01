import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./WorkReport.css";

const WorkReport = () => {
  const [workReports, setWorkReports] = useState([]);
  const [todayReport, setTodayReport] = useState(null);
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // =========================================================
  // FILTER + PAGINATION
  // =========================================================

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const reportsPerPage = 5;

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const getDateKey = (date) => {
    if (!date) return "";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "";
    }

    return `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getTodayStart = () => {
    const today = new Date();

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
  };

  // =========================================================
  // CHECK TODAY
  // =========================================================

  const isToday = (date) => {
    if (!date) return false;

    return getDateKey(date) === getDateKey(new Date());
  };

  // =========================================================
  // FETCH WORK REPORTS
  // =========================================================

  const fetchWorkReports = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await api.get("/work-reports/my");

      if (response.data.success) {
        const reports = response.data.workReports || [];

        setWorkReports(reports);

        const currentTodayReport = reports.find((report) =>
          isToday(report.date)
        );

        setTodayReport(currentTodayReport || null);

        setDescription(
          currentTodayReport?.description || ""
        );
      } else {
        setWorkReports([]);
        setTodayReport(null);
        setDescription("");
      }
    } catch (error) {
      console.error("Work report fetch error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to load your work reports."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchWorkReports();
  }, []);

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) return "--";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "--";
    }

    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // =========================================================
  // FORMAT SHORT DATE
  // =========================================================

  const formatShortDate = (date) => {
    if (!date) return "--";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "--";
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (time) => {
    if (!time) return "--:--";

    const d = new Date(time);

    if (Number.isNaN(d.getTime())) {
      return "--:--";
    }

    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // =========================================================
  // SAVE / UPDATE TODAY'S REPORT
  // =========================================================

  const handleSaveReport = async () => {
    const trimmedDescription = description.trim();

    setMessage("");

    if (!trimmedDescription) {
      setMessage("Please enter your work description.");
      setMessageType("error");
      return;
    }

    if (trimmedDescription.length < 10) {
      setMessage(
        "Work description must contain at least 10 characters."
      );
      setMessageType("error");
      return;
    }

    if (trimmedDescription.length > 2000) {
      setMessage(
        "Work description cannot exceed 2000 characters."
      );
      setMessageType("error");
      return;
    }

    try {
      setSaving(true);

      let response;

      if (todayReport) {
        response = await api.put("/work-reports/my", {
          description: trimmedDescription,
        });
      } else {
        response = await api.post("/work-reports", {
          description: trimmedDescription,
        });
      }

      if (response.data.success) {
        setMessage(
          response.data.message ||
            "Work report saved successfully."
        );

        setMessageType("success");

        await fetchWorkReports();
      } else {
        setMessage(
          response.data.message ||
            "Unable to save work report."
        );

        setMessageType("error");
      }
    } catch (error) {
      console.error("Work report save error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to save work report."
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // TODAY'S ATTENDANCE
  // =========================================================

  const todayAttendance =
    todayReport?.attendanceId || null;

  const checkIn = todayAttendance?.checkIn || null;
  const checkOut = todayAttendance?.checkOut || null;

  const status =
    todayAttendance?.status || "NOT AVAILABLE";

  const workingMinutes =
    todayAttendance?.workingMinutes ?? 0;

  const hours = Math.floor(workingMinutes / 60);
  const minutes = workingMinutes % 60;

  const hasCheckedOut = Boolean(checkOut?.time);

  // =========================================================
  // PREVIOUS REPORTS
  // =========================================================

  const previousReports = useMemo(() => {
    return workReports.filter(
      (report) => !isToday(report.date)
    );
  }, [workReports]);

  // =========================================================
  // FILTER REPORTS
  // =========================================================

  const filteredReports = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return previousReports.filter((report) => {
      const reportStatus =
        report.attendanceId?.status ||
        "NOT AVAILABLE";

      const reportDate = getDateKey(report.date);

      // STATUS
      const statusMatches =
        statusFilter === "ALL" ||
        reportStatus === statusFilter;

      // TEXT SEARCH
      const textMatches =
        !search ||
        report.description
          ?.toLowerCase()
          .includes(search);

      // FROM DATE
      const fromDateMatches =
        !fromDate || reportDate >= fromDate;

      // TO DATE
      const toDateMatches =
        !toDate || reportDate <= toDate;

      return (
        statusMatches &&
        textMatches &&
        fromDateMatches &&
        toDateMatches
      );
    });
  }, [
    previousReports,
    statusFilter,
    searchText,
    fromDate,
    toDate,
  ]);

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = Math.ceil(
    filteredReports.length / reportsPerPage
  );

  const safeCurrentPage =
    totalPages > 0
      ? Math.min(currentPage, totalPages)
      : 1;

  const startIndex =
    (safeCurrentPage - 1) * reportsPerPage;

  const paginatedReports = filteredReports.slice(
    startIndex,
    startIndex + reportsPerPage
  );

  // =========================================================
  // FILTER HANDLERS
  // =========================================================

  const handleStatusFilter = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
    setCurrentPage(1);
  };

  const handleFromDateChange = (event) => {
    setFromDate(event.target.value);
    setCurrentPage(1);
  };

  const handleToDateChange = (event) => {
    setToDate(event.target.value);
    setCurrentPage(1);
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const handlePreviousPage = () => {
    setCurrentPage((page) =>
      Math.max(page - 1, 1)
    );
  };

  const handleNextPage = () => {
    setCurrentPage((page) =>
      Math.min(page + 1, totalPages)
    );
  };

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    searchText.trim() !== "" ||
    fromDate !== "" ||
    toDate !== "";

  const handleClearFilter = () => {
    setStatusFilter("ALL");
    setSearchText("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="work-report-page">
        <div className="work-report-loading">
          <div className="work-report-spinner"></div>
          <p>Loading your work reports...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="work-report-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="work-report-page-header">
        <div>
          <div className="work-report-breadcrumb">
            Employee Portal
            <span>/</span>
            Work Reports
          </div>

          <h1>My Work Reports</h1>

          <p>
            Record today's work and review your previous reports.
          </p>
        </div>

        <div className="work-report-date-card">
          <div className="work-report-date-icon">
            ✓
          </div>

          <div>
            <span>TODAY</span>

            <strong>
              {formatDate(new Date())}
            </strong>
          </div>
        </div>
      </header>

      {/* =====================================================
          MESSAGE
      ===================================================== */}

      {message && (
        <div
          className={`work-report-message ${
            messageType === "success"
              ? "success"
              : "error"
          }`}
        >
          <div className="work-report-message-icon">
            {messageType === "success" ? "✓" : "!"}
          </div>

          <div>
            <strong>
              {messageType === "success"
                ? "Success"
                : "Something went wrong"}
            </strong>

            <p>{message}</p>
          </div>

          <button
            onClick={() => setMessage("")}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* =====================================================
          TODAY'S REPORT
      ===================================================== */}

      <div className="work-report-layout">

        {/* MAIN REPORT */}

        <section className="work-report-card">

          <div className="work-report-card-header">
            <div>
              <span className="work-report-label">
                DAILY ACTIVITY
              </span>

              <h2>
                {todayReport
                  ? "Today's Work Report"
                  : "Create Today's Report"}
              </h2>

              <p>
                Describe the work you completed today.
              </p>
            </div>

            <div
              className={`report-status ${
                todayReport
                  ? "report-status-saved"
                  : "report-status-pending"
              }`}
            >
              <span></span>

              {todayReport
                ? "Saved"
                : "Not Submitted"}
            </div>
          </div>

          <div className="work-report-form">

            <label htmlFor="work-description">
              Work Description
            </label>

            <textarea
              id="work-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Example: Worked on the employee attendance module, tested GPS check-in and checkout, fixed validation issues and updated the dashboard UI..."
              minLength={10}
              maxLength={2000}
              disabled={saving || hasCheckedOut}
            />

            <div className="work-report-character-count">
              <span>
                Minimum 10 characters
              </span>

              <span>
                {description.length}/2000
              </span>
            </div>

            <div className="work-report-form-info">
              <span>💡</span>

              <p>
                Mention the main tasks, development work,
                testing, fixes or other activities you
                completed today.
              </p>
            </div>

            {hasCheckedOut && (
              <div className="work-report-form-info">
                <span>🔒</span>

                <p>
                  Your work report is locked because you
                  have already checked out today.
                </p>
              </div>
            )}

            <button
              type="button"
              className="work-report-save-button"
              onClick={handleSaveReport}
              disabled={
                saving ||
                hasCheckedOut ||
                description.trim().length < 10
              }
            >
              {saving ? (
                <>
                  <span className="work-report-button-spinner"></span>
                  Saving...
                </>
              ) : hasCheckedOut ? (
                <>🔒 Report Locked</>
              ) : todayReport ? (
                <>✓ Update Work Report</>
              ) : (
                <>✓ Submit Work Report</>
              )}
            </button>
          </div>
        </section>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <aside className="work-report-side">

          {/* ATTENDANCE */}

          <div className="work-report-attendance-card">

            <div className="side-card-header">
              <div>
                <span className="work-report-label">
                  ATTENDANCE
                </span>

                <h3>
                  Today's Status
                </h3>
              </div>

              <div className="attendance-check-icon">
                ✓
              </div>
            </div>

            <div className="attendance-status-display">
              <span
                className={`attendance-status-dot ${
                  status === "PRESENT"
                    ? "present"
                    : ""
                }`}
              ></span>

              <strong>
                {status}
              </strong>
            </div>

            <div className="attendance-times">
              <div>
                <span>CHECK IN</span>

                <strong>
                  {formatTime(checkIn?.time)}
                </strong>
              </div>

              <div>
                <span>CHECK OUT</span>

                <strong>
                  {formatTime(checkOut?.time)}
                </strong>
              </div>
            </div>

            <div className="working-time-summary">
              <span>WORKING TIME</span>

              <strong>
                {hours}h {minutes}m
              </strong>
            </div>
          </div>

          {/* INFO */}

          <div className="work-report-info-card">

            <div className="info-card-icon">
              ✓
            </div>

            <div>
              <h3>
                Why submit a report?
              </h3>

              <p>
                Your daily work report records the tasks
                completed during your workday and is linked
                to your attendance.
              </p>
            </div>
          </div>

          {/* STATE */}

          <div className="work-report-state-card">

            <div className="state-row">
              <span>Report status</span>

              <strong>
                {todayReport
                  ? hasCheckedOut
                    ? "Locked"
                    : "Submitted"
                  : "Pending"}
              </strong>
            </div>

            <div className="state-row">
              <span>Description</span>

              <strong>
                {description.length}/2000
              </strong>
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================
          PREVIOUS REPORTS
      ===================================================== */}

      <section className="work-report-history">

        <div className="work-report-history-header">
          <div>
            <span className="work-report-label">
              HISTORY
            </span>

            <h2>
              Previous Work Reports
            </h2>

            <p>
              Search and review the work reports you
              submitted on previous days.
            </p>
          </div>

          <div className="work-report-history-count">
            {filteredReports.length} Reports
          </div>
        </div>

        {/* =================================================
            FILTER TOOLBAR
        ================================================= */}

        <div className="work-report-history-toolbar">

          {/* SEARCH */}

          <div className="work-report-search">
            <span className="filter-search-icon">
              🔎
            </span>

            <input
              type="text"
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Search report text..."
            />
          </div>

          {/* FROM DATE */}

          <div className="work-report-filter">
            <label htmlFor="from-date">
              From
            </label>

            <input
              id="from-date"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={handleFromDateChange}
            />
          </div>

          {/* TO DATE */}

          <div className="work-report-filter">
            <label htmlFor="to-date">
              To
            </label>

            <input
              id="to-date"
              type="date"
              min={fromDate || undefined}
              onChange={handleToDateChange}
              value={toDate}
            />
          </div>

          {/* STATUS */}

          <div className="work-report-filter">
            <label htmlFor="report-status-filter">
              Status
            </label>

            <select
              id="report-status-filter"
              value={statusFilter}
              onChange={handleStatusFilter}
            >
              <option value="ALL">
                All
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

              <option value="HOLIDAY">
                Holiday
              </option>

              <option value="WEEKEND">
                Weekend
              </option>

              <option value="HALF_DAY">
                Half Day
              </option>

              <option value="MISSED_CHECKOUT">
                Missed Checkout
              </option>
            </select>
          </div>

          {/* CLEAR */}

          {hasActiveFilters && (
            <button
              type="button"
              className="work-report-clear-filter"
              onClick={handleClearFilter}
            >
              Clear All
            </button>
          )}
        </div>

        {/* FILTER RESULT */}

        {hasActiveFilters && (
          <div className="work-report-filter-result">
            <span>
              Showing {filteredReports.length} matching report
              {filteredReports.length !== 1 ? "s" : ""}
            </span>

            {searchText && (
              <span className="active-filter-chip">
                Search: "{searchText}"
              </span>
            )}

            {fromDate && (
              <span className="active-filter-chip">
                From: {fromDate}
              </span>
            )}

            {toDate && (
              <span className="active-filter-chip">
                To: {toDate}
              </span>
            )}

            {statusFilter !== "ALL" && (
              <span className="active-filter-chip">
                Status: {statusFilter.replaceAll("_", " ")}
              </span>
            )}
          </div>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {filteredReports.length === 0 ? (
          <div className="work-report-empty-history">

            <div>📋</div>

            <h3>
              {hasActiveFilters
                ? "No matching reports"
                : "No previous reports"}
            </h3>

            <p>
              {hasActiveFilters
                ? "Try changing your search or filters."
                : "Your previous submitted work reports will appear here."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilter}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* REPORT LIST */}

            <div className="work-report-history-list">

              {paginatedReports.map((report) => {

                const attendance =
                  report.attendanceId || null;

                const reportStatus =
                  attendance?.status ||
                  "NOT AVAILABLE";

                const reportWorkingMinutes =
                  attendance?.workingMinutes ?? 0;

                const reportHours = Math.floor(
                  reportWorkingMinutes / 60
                );

                const reportMinutes =
                  reportWorkingMinutes % 60;

                return (
                  <div
                    className="work-report-history-item"
                    key={report._id}
                  >

                    {/* DATE */}

                    <div className="history-date">
                      <strong>
                        {formatShortDate(report.date)}
                      </strong>

                      <span>
                        {formatDate(report.date).split(",")[0]}
                      </span>
                    </div>

                    {/* DESCRIPTION */}

                    <div className="history-description">
                      <p>
                        {report.description}
                      </p>
                    </div>

                    {/* ATTENDANCE */}

                    <div className="history-attendance">

                      <span
                        className={`history-status ${
                          reportStatus === "PRESENT"
                            ? "present"
                            : ""
                        }`}
                      >
                        {reportStatus.replaceAll("_", " ")}
                      </span>

                      <span>
                        {reportHours}h {reportMinutes}m
                      </span>
                    </div>

                    {/* TIMES */}

                    <div className="history-times">

                      <span>
                        IN{" "}
                        {formatTime(
                          attendance?.checkIn?.time
                        )}
                      </span>

                      <span>
                        OUT{" "}
                        {formatTime(
                          attendance?.checkOut?.time
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION */}

            {totalPages > 1 && (
              <div className="work-report-pagination">

                <button
                  type="button"
                  onClick={handlePreviousPage}
                  disabled={safeCurrentPage === 1}
                >
                  ← Previous
                </button>

                <div className="work-report-page-info">
                  <span>Page</span>

                  <strong>
                    {safeCurrentPage}
                  </strong>

                  <span>
                    of {totalPages}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={
                    safeCurrentPage === totalPages
                  }
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default WorkReport;