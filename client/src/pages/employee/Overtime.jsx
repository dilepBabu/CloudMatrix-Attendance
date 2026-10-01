import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./Overtime.css";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
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

const getStatusClass = (status) => {
  switch (status) {
    case "PENDING":
      return "overtime-status pending";

    case "APPROVED":
      return "overtime-status approved";

    case "REJECTED":
      return "overtime-status rejected";

    case "CANCELLED":
      return "overtime-status cancelled";

    default:
      return "overtime-status";
  }
};

const getInitials = (name = "") => {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

function Overtime() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const response = await api.get("/overtime-requests/my");

      setRequests(response.data?.requests || []);
    } catch (error) {
      console.error("Fetch Overtime Requests Error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to load overtime requests."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!date) {
      setMessage("Please select an overtime date.");
      setMessageType("error");
      return;
    }

    if (!reason.trim()) {
      setMessage("Please enter a reason for overtime.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post("/overtime-requests", {
        date,
        reason: reason.trim(),
      });

      setMessage(
        response.data?.message ||
          "Overtime request submitted successfully."
      );

      setMessageType("success");

      setDate("");
      setReason("");
      setCurrentPage(1);

      await fetchRequests();
    } catch (error) {
      console.error("Create Overtime Request Error:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to submit overtime request."
      );

      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this overtime request?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(requestId);

      setMessage("");
      setMessageType("");

      const response = await api.patch(
        `/overtime-requests/${requestId}/cancel`
      );

      setMessage(
        response.data?.message ||
          "Overtime request cancelled successfully."
      );

      setMessageType("success");

      if (response.data?.request) {
        setRequests((currentRequests) =>
          currentRequests.map((request) =>
            request._id === response.data.request._id
              ? response.data.request
              : request
          )
        );
      } else {
        await fetchRequests();
      }
    } catch (error) {
      console.error("Cancel Overtime Request Error:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to cancel overtime request."
      );

      setMessageType("error");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return requests.filter((request) => {
      const reasonText = request.reason?.toLowerCase() || "";
      const status = request.status || "";

      const matchesSearch =
        !search ||
        reasonText.includes(search) ||
        status.toLowerCase().includes(search);

      const matchesStatus =
        !statusFilter || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchText, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const pendingCount = requests.filter(
    (request) => request.status === "PENDING"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "APPROVED"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "REJECTED"
  ).length;

  const cancelledCount = requests.filter(
    (request) => request.status === "CANCELLED"
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="employee-overtime-page">
      {/* Header */}
      <div className="overtime-header">
        <div>
          <p className="overtime-eyebrow">
            ATTENDANCE & OVERTIME
          </p>

          <h1>Overtime Requests</h1>

          <p className="overtime-subtitle">
            Request overtime for weekends and holidays and
            track your approval status.
          </p>
        </div>

        <div className="overtime-header-icon">
          ⏱
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`overtime-message ${messageType}`}>
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

      {/* Stats */}
      <div className="overtime-stats">
        <div className="overtime-stat-card">
          <div className="stat-icon total">📋</div>

          <div>
            <span>Total Requests</span>
            <strong>{requests.length}</strong>
          </div>
        </div>

        <div className="overtime-stat-card">
          <div className="stat-icon pending">⏳</div>

          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="overtime-stat-card">
          <div className="stat-icon approved">✓</div>

          <div>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </div>
        </div>

        <div className="overtime-stat-card">
          <div className="stat-icon rejected">×</div>

          <div>
            <span>Rejected</span>
            <strong>{rejectedCount}</strong>
          </div>
        </div>

        <div className="overtime-stat-card">
          <div className="stat-icon cancelled">↩</div>

          <div>
            <span>Cancelled</span>
            <strong>{cancelledCount}</strong>
          </div>
        </div>
      </div>

      {/* Apply overtime */}
      <section className="overtime-apply-card">
        <div className="section-heading">
          <div className="section-heading-icon">+</div>

          <div>
            <h2>Request Overtime</h2>

            <p>
              Submit a request before working overtime on a
              weekend or holiday.
            </p>
          </div>
        </div>

        <form
          className="overtime-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label htmlFor="overtime-date">
              Overtime Date
            </label>

            <input
              id="overtime-date"
              type="date"
              value={date}
              min={
                new Date().toISOString().split("T")[0]
              }
              onChange={(event) =>
                setDate(event.target.value)
              }
            />

            <small>
              Select the date on which you plan to work
              overtime.
            </small>
          </div>

          <div className="form-group reason-group">
            <label htmlFor="overtime-reason">
              Reason
            </label>

            <textarea
              id="overtime-reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Example: Completing an urgent client project..."
              rows="4"
              maxLength="500"
            />

            <div className="character-count">
              {reason.length}/500
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={submitting}
              onClick={() => {
                setDate("");
                setReason("");
              }}
            >
              Clear
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="button-spinner" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Request
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* History */}
      <section className="overtime-history-card">
        <div className="history-header">
          <div>
            <h2>Request History</h2>

            <p>
              View and manage your previous overtime
              requests.
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={fetchRequests}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="overtime-filters">
          <div className="search-box">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search by reason or status..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
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

        {/* Loading */}
        {loading ? (
          <div className="overtime-loading">
            <div className="loading-spinner" />
            <p>Loading overtime requests...</p>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="overtime-empty">
            <div className="empty-icon">⏱</div>

            <h3>No overtime requests found</h3>

            <p>
              {requests.length === 0
                ? "You have not submitted any overtime requests yet."
                : "No requests match your current filters."}
            </p>
          </div>
        ) : (
          <div className="overtime-request-list">
            {paginatedRequests.map((request) => (
              <article
                className="overtime-request-card"
                key={request._id}
              >
                <div className="request-main">
                  <div className="employee-avatar">
                    {getInitials(
                      request.employeeId?.name ||
                        "Employee"
                    )}
                  </div>

                  <div className="request-content">
                    <div className="request-top">
                      <div>
                        <h3>
                          {formatDate(request.date)}
                        </h3>

                        <p>
                          Overtime request
                        </p>
                      </div>

                      <span
                        className={getStatusClass(
                          request.status
                        )}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="request-details">
                      <div className="request-detail">
                        <span className="detail-label">
                          Requested
                        </span>

                        <strong>
                          {formatDateTime(
                            request.createdAt
                          )}
                        </strong>
                      </div>

                      <div className="request-detail">
                        <span className="detail-label">
                          Reason
                        </span>

                        <strong>
                          {request.reason || "-"}
                        </strong>
                      </div>
                    </div>

                    {request.adminComment && (
                      <div className="admin-comment">
                        <span>Admin response</span>

                        <p>
                          {request.adminComment}
                        </p>
                      </div>
                    )}

                    {request.reviewedAt && (
                      <div className="reviewed-info">
                        Reviewed on{" "}
                        {formatDateTime(
                          request.reviewedAt
                        )}
                        {request.reviewedBy?.name
                          ? ` by ${request.reviewedBy.name}`
                          : ""}
                      </div>
                    )}

                    {request.status === "PENDING" && (
                      <div className="request-actions">
                        <button
                          type="button"
                          className="cancel-request-button"
                          disabled={
                            cancellingId ===
                            request._id
                          }
                          onClick={() =>
                            handleCancel(
                              request._id
                            )
                          }
                        >
                          {cancellingId ===
                          request._id
                            ? "Cancelling..."
                            : "Cancel Request"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading &&
          filteredRequests.length > 0 && (
            <div className="overtime-pagination">
              <span>
                Showing{" "}
                {(currentPage - 1) *
                  ITEMS_PER_PAGE +
                  1}{" "}
                -{" "}
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredRequests.length
                )}{" "}
                of {filteredRequests.length}
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage(
                      (page) => page - 1
                    )
                  }
                >
                  ←
                </button>

                <span>
                  {currentPage} / {totalPages}
                </span>

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
                  →
                </button>
              </div>
            </div>
          )}
      </section>
    </div>
  );
}

export default Overtime;