
import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./Leave.css";

const LEAVE_TYPES = [
  { value: "CASUAL", label: "Casual Leave" },
  { value: "SICK", label: "Sick Leave" },
  { value: "EARNED", label: "Earned Leave" },
  { value: "UNPAID", label: "Unpaid Leave" },
  { value: "OTHER", label: "Other Leave" },
];

const STATUS_OPTIONS = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const Leave = () => {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);

  const [leaveType, setLeaveType] = useState("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const leavesPerPage = 5;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // ---------------------------------------------------------
  // FETCH LEAVES
  // ---------------------------------------------------------

  const fetchLeaves = async () => {
    try {
      setLoading(true);

      const response = await api.get("/leave/my");

      if (response.data.success) {
        setLeaves(response.data.leaves || []);
      } else {
        setLeaves([]);
      }
    } catch (error) {
      console.error("Get leaves error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to load your leave history."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // FETCH BALANCE
  // ---------------------------------------------------------

  const fetchBalance = async () => {
    try {
      const response = await api.get("/leave/my/balance");

      if (response.data.success) {
        setBalance(response.data);
      }
    } catch (error) {
      console.error("Get leave balance error:", error);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchBalance();
  }, []);

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "--";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "--";
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDateKey = (date) => {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getLeaveTypeLabel = (type) => {
    const found = LEAVE_TYPES.find(
      (item) => item.value === type
    );

    return found?.label || type || "Unknown";
  };

  const calculateCalendarDays = (start, end) => {
    if (!start || !end) return 0;

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    if (
      Number.isNaN(startDateObj.getTime()) ||
      Number.isNaN(endDateObj.getTime())
    ) {
      return 0;
    }

    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(0, 0, 0, 0);

    return (
      Math.floor(
        (endDateObj.getTime() - startDateObj.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );
  };

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------

  const summary = useMemo(() => {
    return {
      total: leaves.length,

      pending: leaves.filter(
        (leave) => leave.status === "PENDING"
      ).length,

      approved: leaves.filter(
        (leave) => leave.status === "APPROVED"
      ).length,

      rejected: leaves.filter(
        (leave) => leave.status === "REJECTED"
      ).length,
    };
  }, [leaves]);

  // ---------------------------------------------------------
  // APPLY LEAVE
  // ---------------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      setMessage("Please fill in all leave details.");
      setMessageType("error");
      return;
    }

    if (reason.trim().length < 5) {
      setMessage(
        "Reason must contain at least 5 characters."
      );
      setMessageType("error");
      return;
    }

    if (reason.trim().length > 1000) {
      setMessage(
        "Reason cannot exceed 1000 characters."
      );
      setMessageType("error");
      return;
    }

    if (endDate < startDate) {
      setMessage(
        "End date cannot be before start date."
      );
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post("/leave", {
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      });

      if (response.data.success) {
        setMessage(
          response.data.message ||
            "Leave application submitted successfully."
        );
        setMessageType("success");

        setLeaveType("CASUAL");
        setStartDate("");
        setEndDate("");
        setReason("");

        await fetchLeaves();
        await fetchBalance();
      } else {
        setMessage(
          response.data.message ||
            "Unable to submit leave application."
        );
        setMessageType("error");
      }
    } catch (error) {
      console.error("Apply leave error:", error);
        console.log("Backend response:", error.response?.data);
  console.log("Status:", error.response?.status);

      setMessage(
        error.response?.data?.message ||
          "Unable to submit leave application."
      );
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // CANCEL LEAVE
  // ---------------------------------------------------------

  const handleCancel = async (leaveId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this leave application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(leaveId);
      setMessage("");

      const response = await api.patch(
        `/leave/${leaveId}/cancel`
      );

      if (response.data.success) {
        setMessage(
          response.data.message ||
            "Leave cancelled successfully."
        );
        setMessageType("success");

        await fetchLeaves();
        await fetchBalance();
      } else {
        setMessage(
          response.data.message ||
            "Unable to cancel leave."
        );
        setMessageType("error");
      }
    } catch (error) {
      console.error("Cancel leave error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to cancel leave."
      );
      setMessageType("error");
    } finally {
      setCancellingId(null);
    }
  };

  // ---------------------------------------------------------
  // FILTERS
  // ---------------------------------------------------------

  const filteredLeaves = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return leaves.filter((leave) => {
      const type = leave.leaveType || "";
      const status = leave.status || "";
      const reasonText = leave.reason || "";

      const matchesSearch =
        !search ||
        type.toLowerCase().includes(search) ||
        getLeaveTypeLabel(type)
          .toLowerCase()
          .includes(search) ||
        reasonText.toLowerCase().includes(search);

      const matchesType =
        typeFilter === "ALL" ||
        type === typeFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter;

      const leaveStart = getDateKey(leave.startDate);
      const leaveEnd = getDateKey(leave.endDate);

      const matchesFrom =
        !fromDate || leaveEnd >= fromDate;

      const matchesTo =
        !toDate || leaveStart <= toDate;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    leaves,
    searchText,
    typeFilter,
    statusFilter,
    fromDate,
    toDate,
  ]);

  // ---------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------

  const totalPages = Math.ceil(
    filteredLeaves.length / leavesPerPage
  );

  const startIndex =
    (currentPage - 1) * leavesPerPage;

  const paginatedLeaves = filteredLeaves.slice(
    startIndex,
    startIndex + leavesPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchText,
    typeFilter,
    statusFilter,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    if (
      totalPages > 0 &&
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleClearFilters = () => {
    setSearchText("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const hasFilters =
    searchText ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    fromDate ||
    toDate;

  // ---------------------------------------------------------
  // CURRENT MONTH
  // ---------------------------------------------------------

  const currentMonthName = new Date().toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-loading">
          <div className="leave-spinner"></div>
          <p>Loading your leave information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-page">

      {/* -------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* -------------------------------------------------- */}

      <header className="leave-page-header">
        <div>
          <div className="leave-breadcrumb">
            Employee Portal <span>/</span> Leave
          </div>

          <h1>Leave Management</h1>

          <p>
            Apply for leave and keep track of your
            leave applications.
          </p>
        </div>

        <div className="leave-header-date">
          <span>Current Month</span>
          <strong>{currentMonthName}</strong>
        </div>
      </header>

      {/* -------------------------------------------------- */}
      {/* MESSAGE */}
      {/* -------------------------------------------------- */}

      {message && (
        <div
          className={`leave-message ${messageType}`}
        >
          <span>
            {messageType === "success" ? "✓" : "!"}
          </span>

          <p>{message}</p>

          <button
            type="button"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* SUMMARY CARDS */}
      {/* -------------------------------------------------- */}

      <section className="leave-summary-grid">

        <div className="leave-summary-card casual">
          <div className="leave-summary-icon">
            CL
          </div>

          <div>
            <span>Casual Leave</span>
            <strong>
              {balance?.casualLeaveLimit ?? 0} days
            </strong>
          </div>
        </div>

        <div className="leave-summary-card available">
          <div className="leave-summary-icon">
            ✓
          </div>

          <div>
            <span>Available</span>
            <strong>
              {balance?.availableDays ?? 0} days
            </strong>
          </div>
        </div>

        <div className="leave-summary-card pending">
          <div className="leave-summary-icon">
            ⏱
          </div>

          <div>
            <span>Pending</span>
            <strong>{summary.pending}</strong>
          </div>
        </div>

        <div className="leave-summary-card approved">
          <div className="leave-summary-icon">
            ✓
          </div>

          <div>
            <span>Approved</span>
            <strong>{summary.approved}</strong>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* MAIN CONTENT */}
      {/* -------------------------------------------------- */}

      <section className="leave-main-grid">

        {/* APPLY LEAVE */}
        <div className="leave-card leave-apply-card">

          <div className="leave-card-header">
            <div>
              <span className="leave-section-label">
                REQUEST
              </span>

              <h2>Apply for Leave</h2>

              <p>
                Submit your leave request for approval.
              </p>
            </div>

            <div className="leave-card-icon">
              +
            </div>
          </div>

          <form
            className="leave-form"
            onSubmit={handleSubmit}
          >

            <div className="leave-form-group">
              <label htmlFor="leaveType">
                Leave Type
              </label>

              <select
                id="leaveType"
                value={leaveType}
                onChange={(event) =>
                  setLeaveType(event.target.value)
                }
              >
                {LEAVE_TYPES.map((type) => (
  <option
    key={type.value}
    value={type.value}
    disabled={type.value === "CASUAL" && balance?.availableDays <= 0}
  >
    {type.label}
    {type.value === "CASUAL" && balance?.availableDays <= 0
      ? " — Balance exhausted"
      : ""}
  </option>
))}
              </select>
            </div>

            <div className="leave-date-grid">

              <div className="leave-form-group">
                <label htmlFor="startDate">
                  From
                </label>

                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                />
              </div>

              <div className="leave-form-group">
                <label htmlFor="endDate">
                  To
                </label>

                <input
                  id="endDate"
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                />
              </div>

            </div>

            <div className="leave-form-group">

              <div className="leave-label-row">
                <label htmlFor="reason">
                  Reason
                </label>

                <span>
                  {reason.length}/1000
                </span>
              </div>

              <textarea
                id="reason"
                rows="5"
                maxLength="1000"
                placeholder="Explain the reason for your leave..."
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
              />
            </div>

            <div className="leave-form-footer">

              <div className="leave-form-note">
                <span>i</span>
                <p>
                  Weekends are automatically excluded
                  from leave days.
                </p>
              </div>

              <button
                type="submit"
                className="leave-submit-button"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="button-spinner"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Leave
                    <span>→</span>
                  </>
                )}
              </button>

            </div>

          </form>
        </div>

        {/* GUIDELINES */}
        <aside className="leave-card leave-guidelines-card">

          <div className="leave-guidelines-top">
            <div className="leave-card-icon">
              ?
            </div>

            <div>
              <span className="leave-section-label">
                INFORMATION
              </span>

              <h2>Leave Guidelines</h2>
            </div>
          </div>

          <div className="leave-guidelines-list">

            <div className="leave-guideline">
              <span>01</span>
              <div>
                <strong>Apply in advance</strong>
                <p>
                  Submit your request before
                  taking leave whenever possible.
                </p>
              </div>
            </div>

            <div className="leave-guideline">
              <span>02</span>
              <div>
                <strong>Working days only</strong>
                <p>
                  Saturday and Sunday are not
                  counted as leave days.
                </p>
              </div>
            </div>

            <div className="leave-guideline">
              <span>03</span>
              <div>
                <strong>Casual leave balance</strong>
                <p>
                  Your available balance is
                  calculated for the current month.
                </p>
              </div>
            </div>

            <div className="leave-guideline">
              <span>04</span>
              <div>
                <strong>Pending requests</strong>
                <p>
                  Only pending leave applications
                  can be cancelled.
                </p>
              </div>
            </div>

          </div>

        </aside>

      </section>

      {/* -------------------------------------------------- */}
      {/* HISTORY */}
      {/* -------------------------------------------------- */}

      <section className="leave-card leave-history-card">

        <div className="leave-history-header">

          <div>
            <span className="leave-section-label">
              HISTORY
            </span>

            <h2>My Leave History</h2>

            <p>
              View and manage your previous leave
              applications.
            </p>
          </div>

          <div className="leave-history-count">
            {filteredLeaves.length} records
          </div>

        </div>

        {/* FILTERS */}

        <div className="leave-filter-toolbar">

          <div className="leave-filter search-filter">
            <label htmlFor="leaveSearch">
              Search
            </label>

            <input
              id="leaveSearch"
              type="text"
              placeholder="Search reason or leave type..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          </div>

          <div className="leave-filter">
            <label htmlFor="typeFilter">
              Type
            </label>

            <select
              id="typeFilter"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
            >
              <option value="ALL">All types</option>

              {LEAVE_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="leave-filter">
            <label htmlFor="statusFilter">
              Status
            </label>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">All statuses</option>

              {STATUS_OPTIONS.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="leave-filter">
            <label htmlFor="fromFilter">
              From
            </label>

            <input
              id="fromFilter"
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="leave-filter">
            <label htmlFor="toFilter">
              To
            </label>

            <input
              id="toFilter"
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(event.target.value)
              }
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              className="leave-clear-button"
              onClick={handleClearFilters}
            >
              Clear
            </button>
          )}

        </div>

        {/* FILTER RESULT */}

        <div className="leave-result-bar">

          <span>
            {filteredLeaves.length === 0
              ? "No records found"
              : `Showing ${
                  startIndex + 1
                }–${Math.min(
                  startIndex + leavesPerPage,
                  filteredLeaves.length
                )} of ${
                  filteredLeaves.length
                } records`}
          </span>

          {hasFilters && (
            <span className="leave-filter-active">
              Filters applied
            </span>
          )}

        </div>

        {/* HISTORY LIST */}

        {paginatedLeaves.length > 0 ? (
          <div className="leave-list">

            {paginatedLeaves.map((leave) => {
              const days = calculateCalendarDays(
                leave.startDate,
                leave.endDate
              );

              return (
                <article
                  className="leave-history-item"
                  key={leave._id}
                >

                  <div className="leave-history-type">

                    <div className="leave-type-icon">
                      {leave.leaveType === "CASUAL"
                        ? "CL"
                        : leave.leaveType === "SICK"
                        ? "SL"
                        : leave.leaveType === "EARNED"
                        ? "EL"
                        : leave.leaveType === "UNPAID"
                        ? "UL"
                        : "OL"}
                    </div>

                    <div>
                      <strong>
                        {getLeaveTypeLabel(
                          leave.leaveType
                        )}
                      </strong>

                      <span>
                        Applied{" "}
                        {formatDate(
                          leave.createdAt
                        )}
                      </span>
                    </div>

                  </div>

                  <div className="leave-history-dates">
                    <span>Date</span>
                    <strong>
                      {formatDate(
                        leave.startDate
                      )}
                      {getDateKey(leave.startDate) !==
                        getDateKey(leave.endDate) && (
                        <>
                          {" "}
                          →{" "}
                          {formatDate(
                            leave.endDate
                          )}
                        </>
                      )}
                    </strong>
                  </div>

                  <div className="leave-history-days">
                    <span>Days</span>
                    <strong>
                      {days}{" "}
                      {days === 1
                        ? "day"
                        : "days"}
                    </strong>
                  </div>

                  <div className="leave-history-status">
                    <span>Status</span>

                    <strong
                      className={`leave-status-badge ${leave.status.toLowerCase()}`}
                    >
                      <i></i>
                      {leave.status}
                    </strong>
                  </div>

                  <div className="leave-history-action">

                    {leave.status === "PENDING" ? (
                      <button
                        type="button"
                        className="leave-cancel-button"
                        onClick={() =>
                          handleCancel(
                            leave._id
                          )
                        }
                        disabled={
                          cancellingId ===
                          leave._id
                        }
                      >
                        {cancellingId ===
                        leave._id
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    ) : (
                      <span className="leave-action-empty">
                        —
                      </span>
                    )}

                  </div>

                  {(leave.adminComment ||
                    leave.reviewedAt) && (
                    <div className="leave-review-info">

                      {leave.adminComment && (
                        <div>
                          <span>
                            Admin comment
                          </span>

                          <p>
                            {leave.adminComment}
                          </p>
                        </div>
                      )}

                      {leave.reviewedAt && (
                        <div>
                          <span>
                            Reviewed
                          </span>

                          <p>
                            {formatDate(
                              leave.reviewedAt
                            )}
                          </p>
                        </div>
                      )}

                    </div>
                  )}

                </article>
              );
            })}

          </div>
        ) : (
          <div className="leave-empty-state">

            <div className="leave-empty-icon">
              {hasFilters ? "⌕" : "☰"}
            </div>

            <h3>
              {hasFilters
                ? "No matching leave records"
                : "No leave applications yet"}
            </h3>

            <p>
              {hasFilters
                ? "Try changing or clearing your filters."
                : "Your submitted leave applications will appear here."}
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}

          </div>
        )}

        {/* PAGINATION */}

        {totalPages > 1 && (
          <div className="leave-pagination">

            <span className="leave-pagination-info">
              Page {currentPage} of {totalPages}
            </span>

            <div className="leave-pagination-buttons">

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(page - 1, 1)
                  )
                }
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(
                      page + 1,
                      totalPages
                    )
                  )
                }
                disabled={
                  currentPage === totalPages
                }
              >
                Next →
              </button>

            </div>

          </div>
        )}

      </section>
    </div>
  );
};

export default Leave;
