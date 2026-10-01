import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./RemoteRequest.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ITEMS_PER_PAGE = 5;

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateKey = (date) => {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  return value.toISOString().split("T")[0];
};

const getStatusClass = (status) => {
  switch (status) {
    case "APPROVED":
      return "status-approved";

    case "REJECTED":
      return "status-rejected";

    case "CANCELLED":
      return "status-cancelled";

    default:
      return "status-pending";
  }
};

const RemoteRequest = () => {
  const [requests, setRequests] = useState([]);

  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [currentPage, setCurrentPage] = useState(1);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const response = await api.get("/remote-requests/my");

      if (response.data?.success) {
        setRequests(response.data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch remote requests:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to load remote requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const clearMessage = () => {
    setMessage({
      type: "",
      text: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    clearMessage();

    if (!date) {
      setMessage({
        type: "error",
        text: "Please select a date.",
      });
      return;
    }

    if (!reason.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a reason.",
      });
      return;
    }

    if (reason.trim().length < 5) {
      setMessage({
        type: "error",
        text: "Reason must contain at least 5 characters.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post("/remote-requests", {
        date,
        reason: reason.trim(),
      });

      if (response.data?.success) {
        setMessage({
          type: "success",
          text:
            response.data.message ||
            "Remote work request submitted successfully.",
        });

        setDate("");
        setReason("");

        await fetchRequests();

        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Create remote request error:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to submit remote work request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this remote work request?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(requestId);
      clearMessage();

      const response = await api.patch(
        `/remote-requests/${requestId}/cancel`
      );

      if (response.data?.success) {
        setMessage({
          type: "success",
          text:
            response.data.message ||
            "Remote work request cancelled successfully.",
        });

        await fetchRequests();
      }
    } catch (error) {
      console.error("Cancel remote request error:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to cancel remote work request.",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return requests.filter((request) => {
      const requestDate = getDateKey(request.date);

      const matchesSearch =
        !search ||
        request.reason?.toLowerCase().includes(search) ||
        request.requestedMethod?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        request.status === statusFilter;

      const matchesFromDate =
        !fromDate || requestDate >= fromDate;

      const matchesToDate =
        !toDate || requestDate <= toDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [
    requests,
    searchText,
    statusFilter,
    fromDate,
    toDate,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRequests = filteredRequests.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const totalCount = requests.length;

  const pendingCount = requests.filter(
    (request) => request.status === "PENDING"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "APPROVED"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "REJECTED"
  ).length;

  const resetFilters = () => {
    setSearchText("");
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="remote-page">
      {/* Header */}
      <section className="remote-page-header">
        <div>
          <div className="remote-eyebrow">
            <span className="remote-eyebrow-dot"></span>
            WORK FROM HOME
          </div>

          <h1>Remote Work</h1>

          <p>
            Request work from home for a specific working day
            and track your request status.
          </p>
        </div>

        <div className="remote-header-icon">
          <span>⌂</span>
        </div>
      </section>

      {/* Message */}
      {message.text && (
        <div
          className={`remote-message ${
            message.type === "success"
              ? "remote-message-success"
              : "remote-message-error"
          }`}
        >
          <span className="message-icon">
            {message.type === "success" ? "✓" : "!"}
          </span>

          <span>{message.text}</span>

          <button
            type="button"
            onClick={clearMessage}
            className="message-close"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary */}
      <section className="remote-summary-grid">
        <div className="remote-summary-card">
          <div className="summary-card-icon total-icon">↗</div>

          <div>
            <span>Total Requests</span>
            <strong>{totalCount}</strong>
          </div>
        </div>

        <div className="remote-summary-card">
          <div className="summary-card-icon pending-icon">◷</div>

          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="remote-summary-card">
          <div className="summary-card-icon approved-icon">✓</div>

          <div>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </div>
        </div>

        <div className="remote-summary-card">
          <div className="summary-card-icon rejected-icon">!</div>

          <div>
            <span>Rejected</span>
            <strong>{rejectedCount}</strong>
          </div>
        </div>
      </section>

      {/* Apply */}
      <section className="remote-apply-card">
        <div className="section-heading">
          <div className="section-heading-icon">⌂</div>

          <div>
            <h2>Request Remote Work</h2>
            <p>
              Submit your WFH request for an upcoming date.
            </p>
          </div>
        </div>

        <form
          className="remote-request-form"
          onSubmit={handleSubmit}
        >
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="remote-date">
                Date <span>*</span>
              </label>

              <input
                id="remote-date"
                type="date"
                value={date}
                min={getDateKey(new Date())}
                onChange={(event) =>
                  setDate(event.target.value)
                }
              />

              <small>
                Past dates cannot be requested.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="remote-reason">
                Reason <span>*</span>
              </label>

              <input
                id="remote-reason"
                type="text"
                value={reason}
                maxLength={1000}
                placeholder="Why do you need to work remotely?"
                onChange={(event) =>
                  setReason(event.target.value)
                }
              />

              <small>
                {reason.length}/1000 characters
              </small>
            </div>
          </div>

          <div className="remote-form-footer">
            <div className="remote-form-note">
              <span>ⓘ</span>
              <p>
                Your request will be reviewed by an admin.
              </p>
            </div>

            <button
              type="submit"
              className="remote-submit-button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="button-spinner"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <span>↗</span>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* History */}
      <section className="remote-history-card">
        <div className="history-header">
          <div>
            <h2>Request History</h2>
            <p>
              View and manage your previous remote work requests.
            </p>
          </div>

          <div className="history-count">
            {filteredRequests.length} request
            {filteredRequests.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Filters */}
        <div className="remote-filters">
          <div className="filter-group search-filter">
            <label>Search</label>

            <div className="search-input-wrapper">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search reason..."
                value={searchText}
                onChange={(event) =>
                  handleFilterChange(
                    setSearchText,
                    event.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Status</label>

            <select
              value={statusFilter}
              onChange={(event) =>
                handleFilterChange(
                  setStatusFilter,
                  event.target.value
                )
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                handleFilterChange(
                  setFromDate,
                  event.target.value
                )
              }
            />
          </div>

          <div className="filter-group">
            <label>To</label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                handleFilterChange(
                  setToDate,
                  event.target.value
                )
              }
            />
          </div>

          <button
            type="button"
            className="clear-filter-button"
            onClick={resetFilters}
          >
            Clear
          </button>
        </div>

        {/* Requests */}
        {loading ? (
          <div className="remote-loading">
            <span className="loading-spinner"></span>
            <p>Loading your remote requests...</p>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="remote-empty">
            <div className="empty-icon">⌂</div>

            <h3>
              {requests.length === 0
                ? "No remote requests yet"
                : "No matching requests"}
            </h3>

            <p>
              {requests.length === 0
                ? "Your remote work requests will appear here."
                : "Try changing your filters."}
            </p>

            {requests.length > 0 && (
              <button
                type="button"
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="remote-request-list">
              {paginatedRequests.map((request) => (
                <article
                  className="remote-request-item"
                  key={request._id}
                >
                  <div className="request-date-box">
                    <span>
                      {new Date(request.date).toLocaleDateString(
                        "en-IN",
                        { month: "short" }
                      )}
                    </span>

                    <strong>
                      {new Date(request.date).getDate()}
                    </strong>

                    <small>
                      {new Date(request.date).toLocaleDateString(
                        "en-IN",
                        { weekday: "short" }
                      )}
                    </small>
                  </div>

                  <div className="request-main">
                    <div className="request-top">
                      <div>
                        <h3>Remote Work Request</h3>

                        <span className="request-method">
                          {request.requestedMethod === "REMOTE"
                            ? "Work From Home"
                            : request.requestedMethod ||
                              "Remote"}
                        </span>
                      </div>

                      <span
                        className={`remote-status ${getStatusClass(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="request-reason">
                      <span>Reason</span>
                      <p>{request.reason}</p>
                    </div>

                    {request.adminComment && (
                      <div className="admin-comment">
                        <span>Admin Comment</span>
                        <p>{request.adminComment}</p>
                      </div>
                    )}

                    {request.reviewedAt && (
                      <div className="reviewed-info">
                        Reviewed on{" "}
                        {formatDate(request.reviewedAt)}
                      </div>
                    )}

                    {request.status === "PENDING" && (
                      <div className="request-actions">
                        <button
                          type="button"
                          className="cancel-request-button"
                          disabled={
                            cancellingId === request._id
                          }
                          onClick={() =>
                            handleCancel(request._id)
                          }
                        >
                          {cancellingId === request._id
                            ? "Cancelling..."
                            : "Cancel Request"}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="remote-pagination">
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                >
                  ← Previous
                </button>

                <div className="page-numbers">
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={
                        page === safeCurrentPage
                          ? "active"
                          : ""
                      }
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
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

export default RemoteRequest;