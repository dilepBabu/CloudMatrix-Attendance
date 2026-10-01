import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./AdminOvertime.css";

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

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

const getEmployeeName = (request) => {
  return request?.employeeId?.name || "Unknown Employee";
};

const getEmployeeCode = (request) => {
  return request?.employeeId?.employeeId || "-";
};

export default function AdminOvertime() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [adminComment, setAdminComment] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 8;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      if (dateFilter) {
        params.date = dateFilter;
      }

      const response = await api.get("/overtime-requests", {
        params,
      });

      setRequests(response.data?.requests || []);
    } catch (err) {
      console.error("Fetch Overtime Requests Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load overtime requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateFilter]);

  const filteredRequests = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return requests;
    }

    return requests.filter((request) => {
      const employeeName = getEmployeeName(request).toLowerCase();
      const employeeCode = getEmployeeCode(request).toLowerCase();
      const reason = request.reason?.toLowerCase() || "";

      return (
        employeeName.includes(searchValue) ||
        employeeCode.includes(searchValue) ||
        reason.includes(searchValue)
      );
    });
  }, [requests, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    };
  }, [requests]);

  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminComment("");
  };

  const closeActionModal = () => {
    if (actionLoading) return;

    setSelectedRequest(null);
    setActionType(null);
    setAdminComment("");
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      setError("");

      const requestId = selectedRequest._id;

      if (actionType === "approve") {
        await api.patch(
          `/overtime-requests/${requestId}/approve`,
          {
            adminComment: adminComment.trim(),
          }
        );
      }

      if (actionType === "reject") {
        if (!adminComment.trim()) {
          setError("Please enter a reason for rejection.");
          setActionLoading(false);
          return;
        }

        await api.patch(
          `/overtime-requests/${requestId}/reject`,
          {
            adminComment: adminComment.trim(),
          }
        );
      }

      closeActionModal();
      await fetchRequests();
    } catch (err) {
      console.error("Overtime Action Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to update overtime request"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setDateFilter("");
  };

  return (
    <div className="admin-overtime-page">
      {/* HEADER */}
      <div className="overtime-page-header">
        <div>
          <div className="header-eyebrow">
            ATTENDANCE MANAGEMENT
          </div>

          <h1>Overtime Requests</h1>

          <p>
            Review and manage employee overtime requests for
            Sundays and company holidays.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={fetchRequests}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="overtime-error">
          <span>⚠</span>
          <span>{error}</span>

          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* STATS */}
      <div className="overtime-stats">
        <div className="overtime-stat-card">
          <div className="stat-icon total-icon">⌛</div>

          <div>
            <span>Total Requests</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="overtime-stat-card">
          <div className="stat-icon pending-icon">◷</div>

          <div>
            <span>Pending</span>
            <strong>{stats.pending}</strong>
          </div>
        </div>

        <div className="overtime-stat-card">
          <div className="stat-icon approved-icon">✓</div>

          <div>
            <span>Approved</span>
            <strong>{stats.approved}</strong>
          </div>
        </div>

        <div className="overtime-stat-card">
          <div className="stat-icon rejected-icon">×</div>

          <div>
            <span>Rejected</span>
            <strong>{stats.rejected}</strong>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="overtime-filter-card">
        <div className="filter-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search employee, ID or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-control">
          <label>Status</label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "All Statuses" : status}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-control">
          <label>Date</label>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <button className="clear-filter-btn" onClick={clearFilters}>
          Clear
        </button>
      </div>

      {/* TABLE */}
      <div className="overtime-table-card">
        <div className="table-heading">
          <div>
            <h2>Overtime Requests</h2>
            <span>
              {filteredRequests.length} request
              {filteredRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="overtime-loading">
            <div className="loading-spinner"></div>
            <p>Loading overtime requests...</p>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="overtime-empty">
            <div className="empty-icon">◷</div>
            <h3>No overtime requests found</h3>
            <p>
              There are no requests matching your current
              filters.
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="overtime-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>DATE</th>
                    <th>REASON</th>
                    <th>STATUS</th>
                    <th>SUBMITTED</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRequests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar">
                            {getEmployeeName(request)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {getEmployeeName(request)}
                            </strong>

                            <span>
                              {getEmployeeCode(request)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="date-cell">
                          <strong>
                            {formatDate(request.date)}
                          </strong>

                          <span>
                            {new Date(
                              request.date
                            ).toLocaleDateString("en-IN", {
                              weekday: "long",
                            })}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="reason-cell">
                          {request.reason}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            request.status
                          )}`}
                        >
                          <span className="status-dot"></span>
                          {request.status}
                        </span>
                      </td>

                      <td>
                        <div className="submitted-cell">
                          {formatDateTime(request.createdAt)}
                        </div>
                      </td>

                      <td>
                        {request.status === "PENDING" ? (
                          <div className="action-buttons">
                            <button
                              className="approve-btn"
                              onClick={() =>
                                openActionModal(
                                  request,
                                  "approve"
                                )
                              }
                            >
                              Approve
                            </button>

                            <button
                              className="reject-btn"
                              onClick={() =>
                                openActionModal(
                                  request,
                                  "reject"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="no-action">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => page - 1)
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
                      key={page}
                      className={
                        currentPage === page
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
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => page + 1)
                  }
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ACTION MODAL */}
      {selectedRequest && (
        <div
          className="overtime-modal-overlay"
          onClick={closeActionModal}
        >
          <div
            className="overtime-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">
                  {actionType === "approve"
                    ? "APPROVE REQUEST"
                    : "REJECT REQUEST"}
                </span>

                <h2>
                  {actionType === "approve"
                    ? "Approve Overtime"
                    : "Reject Overtime"}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={closeActionModal}
              >
                ×
              </button>
            </div>

            <div className="modal-request-info">
              <div className="modal-avatar">
                {getEmployeeName(selectedRequest)
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {getEmployeeName(selectedRequest)}
                </strong>

                <span>
                  {getEmployeeCode(selectedRequest)}
                </span>
              </div>
            </div>

            <div className="modal-details">
              <div>
                <span>Date</span>
                <strong>
                  {formatDate(selectedRequest.date)}
                </strong>
              </div>

              <div>
                <span>Reason</span>
                <strong>{selectedRequest.reason}</strong>
              </div>
            </div>

            <div className="comment-field">
              <label>
                Admin Comment
                {actionType === "reject" && (
                  <span> *</span>
                )}
              </label>

              <textarea
                rows="4"
                placeholder={
                  actionType === "approve"
                    ? "Optional comment..."
                    : "Enter reason for rejection..."
                }
                value={adminComment}
                onChange={(e) =>
                  setAdminComment(e.target.value)
                }
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={closeActionModal}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                className={
                  actionType === "approve"
                    ? "modal-approve-btn"
                    : "modal-reject-btn"
                }
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Processing..."
                  : actionType === "approve"
                  ? "Approve Request"
                  : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}