
import { useEffect, useMemo, useState } from "react";

import api from "../../services/api";

import "./AdminRemoteRequests.css";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ITEMS_PER_PAGE = 6;

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
      return "status-pending";

    case "APPROVED":
      return "status-approved";

    case "REJECTED":
      return "status-rejected";

    case "CANCELLED":
      return "status-cancelled";

    default:
      return "";
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

function AdminRemoteRequests() {
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState("");

  const [searchText, setSearchText] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [reviewModal, setReviewModal] = useState(null);

  const [adminComment, setAdminComment] = useState("");

  // =========================================================
  // FETCH REMOTE REQUESTS
  // =========================================================

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const response = await api.get("/remote-requests");

      setRequests(response.data?.requests || []);
    } catch (error) {
      console.error("Fetch Remote Requests Error:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to load remote requests"
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // =========================================================
  // FILTER REQUESTS
  // =========================================================

  const filteredRequests = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return requests.filter((request) => {
      const employee = request.employeeId;

      const employeeName =
        employee?.name?.toLowerCase() || "";

      const employeeCode =
        employee?.employeeId?.toLowerCase() || "";

      const department =
        employee?.department?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        employeeName.includes(search) ||
        employeeCode.includes(search) ||
        department.includes(search);

      const matchesStatus =
        !statusFilter ||
        request.status === statusFilter;

      const requestDate = request.date
        ? new Date(request.date)
            .toISOString()
            .slice(0, 10)
        : "";

      const matchesDate =
        !dateFilter ||
        requestDate === dateFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    requests,
    searchText,
    statusFilter,
    dateFilter,
  ]);

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRequests.length / ITEMS_PER_PAGE
    )
  );

  const paginatedRequests =
    filteredRequests.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

  // =========================================================
  // STATISTICS
  // =========================================================

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

  // =========================================================
  // REVIEW MODAL
  // =========================================================

  const openReviewModal = (request, action) => {
    setReviewModal({
      request,
      action,
    });

    setAdminComment("");

    setMessage("");

    setMessageType("");
  };

  const closeReviewModal = () => {
    if (actionLoading) return;

    setReviewModal(null);

    setAdminComment("");
  };

  // =========================================================
  // APPROVE / REJECT REQUEST
  // =========================================================

  const handleReview = async () => {
    if (!reviewModal?.request?._id) return;

    try {
      setActionLoading(true);

      setMessage("");

      const action = reviewModal.action;

      const endpoint =
        action === "approve"
          ? `/remote-requests/${reviewModal.request._id}/approve`
          : `/remote-requests/${reviewModal.request._id}/reject`;

      const response = await api.patch(endpoint, {
        adminComment: adminComment.trim(),
      });

      setMessage(
        action === "approve"
          ? "Remote work request approved successfully."
          : "Remote work request rejected successfully."
      );

      setMessageType("success");

      setReviewModal(null);

      setAdminComment("");

      await fetchRequests();
    } catch (error) {
      console.error(
        "Review Remote Request Error:",
        error
      );

      setMessage(
        error.response?.data?.message ||
          "Failed to update request"
      );

      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // RESET PAGE WHEN FILTER CHANGES
  // =========================================================

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchText,
    statusFilter,
    dateFilter,
  ]);

  // =========================================================
  // KEEP PAGE VALID
  // =========================================================

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="admin-remote-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="remote-page-header">

        <div>

          <div className="remote-header-label">
            <span className="header-dot"></span>
            ATTENDANCE MANAGEMENT
          </div>

          <h1>Remote Requests</h1>

          <p>
            Review and manage employee
            work-from-home requests.
          </p>

        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={fetchRequests}
          disabled={loading}
        >
          <span className="refresh-icon">
            ↻
          </span>

          Refresh
        </button>

      </div>

      {/* =====================================================
          MESSAGE
      ====================================================== */}

      {message && (
        <div
          className={`remote-message ${messageType}`}
        >
          <span>
            {messageType === "success"
              ? "✓"
              : "!"}
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

      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <section className="remote-stat-grid">

        <div className="remote-stat-card">

          <div className="remote-stat-icon total-icon">
            ▦
          </div>

          <div>
            <span>Total Requests</span>
            <strong>{totalCount}</strong>
          </div>

        </div>

        <div className="remote-stat-card">

          <div className="remote-stat-icon pending-icon">
            ◷
          </div>

          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>

        </div>

        <div className="remote-stat-card">

          <div className="remote-stat-icon approved-icon">
            ✓
          </div>

          <div>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </div>

        </div>

        <div className="remote-stat-card">

          <div className="remote-stat-icon rejected-icon">
            ×
          </div>

          <div>
            <span>Rejected</span>
            <strong>{rejectedCount}</strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <section className="remote-filter-card">

        <div className="remote-filter-title">

          <div>

            <h2>Request History</h2>

            <p>
              {filteredRequests.length} request
              {filteredRequests.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>

          </div>

        </div>

        <div className="remote-filter-grid">

          {/* SEARCH */}

          <div className="filter-field search-field">

            <label>
              Search Employee
            </label>

            <div className="search-input-wrapper">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Name, ID or department"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
              />

              {searchText && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchText("")
                  }
                >
                  ×
                </button>
              )}

            </div>

          </div>

          {/* STATUS */}

          <div className="filter-field">

            <label>Status</label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              {STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

          </div>

          {/* DATE */}

          <div className="filter-field">

            <label>Request Date</label>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(
                  event.target.value
                )
              }
            />

          </div>

          {/* CLEAR */}

          <button
            type="button"
            className="clear-filter-button"
            onClick={() => {
              setSearchText("");
              setStatusFilter("");
              setDateFilter("");
            }}
          >
            Clear Filters
          </button>

        </div>

      </section>

      {/* =====================================================
          REQUEST LIST
      ====================================================== */}

      <section className="remote-request-list">

        {loading ? (

          <div className="remote-loading">

            <div className="loading-spinner"></div>

            <p>
              Loading remote requests...
            </p>

          </div>

        ) : paginatedRequests.length === 0 ? (

          <div className="remote-empty">

            <div className="empty-icon">
              ⌁
            </div>

            <h3>
              No remote requests found
            </h3>

            <p>
              There are no requests matching
              your current filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setStatusFilter("");
                setDateFilter("");
              }}
            >
              Clear Filters
            </button>

          </div>

        ) : (

          paginatedRequests.map(
            (request) => {

              const employee =
                request.employeeId;

              return (

                <article
                  className="remote-request-card"
                  key={request._id}
                >

                  <div className="request-main">

                    {/* EMPLOYEE AVATAR */}

                    <div className="employee-avatar">

                      {getInitials(
                        employee?.name
                      )}

                    </div>

                    <div className="request-content">

                      {/* TOP LINE */}

                      <div className="request-top-line">

                        <div>

                          <h3>
                            {employee?.name ||
                              "Unknown Employee"}
                          </h3>

                          <span className="employee-meta">

                            {employee?.employeeId ||
                              "-"}

                            {employee?.department
                              ? ` • ${employee.department}`
                              : ""}

                          </span>

                        </div>

                        <span
                          className={`request-status ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>

                      </div>

                      {/* DETAILS */}

                      <div className="request-details">

                        <div className="request-detail">

                          <span className="detail-icon">
                            ▣
                          </span>

                          <div>

                            <small>
                              Request Date
                            </small>

                            <strong>
                              {formatDate(
                                request.date
                              )}
                            </strong>

                          </div>

                        </div>

                        <div className="request-detail">

                          <span className="detail-icon">
                            ⌁
                          </span>

                          <div>

                            <small>
                              Method
                            </small>

                            <strong>
                              {request.requestedMethod ||
                                "REMOTE"}
                            </strong>

                          </div>

                        </div>

                        <div className="request-detail">

                          <span className="detail-icon">
                            ◷
                          </span>

                          <div>

                            <small>
                              Submitted
                            </small>

                            <strong>
                              {formatDateTime(
                                request.createdAt
                              )}
                            </strong>

                          </div>

                        </div>

                      </div>

                      {/* REASON */}

                      <div className="reason-box">

                        <span>
                          Reason
                        </span>

                        <p>
                          {request.reason}
                        </p>

                      </div>

                      {/* ADMIN COMMENT */}

                      {request.adminComment && (

                        <div className="admin-comment-box">

                          <span>
                            Admin Comment
                          </span>

                          <p>
                            {request.adminComment}
                          </p>

                          {request.reviewedAt && (
                            <small>
                              Reviewed on{" "}
                              {formatDateTime(
                                request.reviewedAt
                              )}
                            </small>
                          )}

                        </div>

                      )}

                      {/* ACTION BUTTONS */}

                      {request.status ===
                        "PENDING" && (

                        <div className="request-actions">

                          <button
                            type="button"
                            className="approve-button"
                            onClick={() =>
                              openReviewModal(
                                request,
                                "approve"
                              )
                            }
                          >
                            <span>
                              ✓
                            </span>

                            Approve
                          </button>

                          <button
                            type="button"
                            className="reject-button"
                            onClick={() =>
                              openReviewModal(
                                request,
                                "reject"
                              )
                            }
                          >
                            <span>
                              ×
                            </span>

                            Reject
                          </button>

                        </div>

                      )}

                    </div>

                  </div>

                </article>

              );
            }
          )

        )}

      </section>

      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {!loading &&
        filteredRequests.length > 0 && (

        <div className="remote-pagination">

          <div className="pagination-summary">

            Showing{" "}

            <strong>
              {(currentPage - 1) *
                ITEMS_PER_PAGE +
                1}
            </strong>

            {" "} - {" "}

            <strong>
              {Math.min(
                currentPage *
                  ITEMS_PER_PAGE,
                filteredRequests.length
              )}
            </strong>

            {" "}of{" "}

            <strong>
              {filteredRequests.length}
            </strong>

          </div>

          <div className="pagination-controls">

            <button
              type="button"
              disabled={
                currentPage === 1
              }
              onClick={() =>
                setCurrentPage(
                  (page) => page - 1
                )
              }
            >
              ←
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (

              <button
                type="button"
                key={page}
                className={
                  currentPage === page
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCurrentPage(page)
                }
              >
                {page}
              </button>

            ))}

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

      {/* =====================================================
          REVIEW MODAL
      ====================================================== */}

      {reviewModal && (

        <div
          className="review-modal-overlay"
          onMouseDown={closeReviewModal}
        >

          <div
            className="review-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <span
                  className={
                    reviewModal.action ===
                    "approve"
                      ? "modal-icon approve-modal-icon"
                      : "modal-icon reject-modal-icon"
                  }
                >
                  {reviewModal.action ===
                  "approve"
                    ? "✓"
                    : "×"}
                </span>

                <div>

                  <h2>
                    {reviewModal.action ===
                    "approve"
                      ? "Approve Remote Request"
                      : "Reject Remote Request"}
                  </h2>

                  <p>

                    {reviewModal.request
                      .employeeId?.name ||
                      "Employee"}

                    {" • "}

                    {formatDate(
                      reviewModal.request.date
                    )}

                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={actionLoading}
              >
                ×
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="modal-body">

              <label htmlFor="adminComment">

                Admin Comment{" "}

                <span>
                  (optional)
                </span>

              </label>

              <textarea
                id="adminComment"
                rows="5"
                maxLength="1000"
                placeholder={
                  reviewModal.action ===
                  "approve"
                    ? "Add an optional approval comment..."
                    : "Add a reason for rejection..."
                }
                value={adminComment}
                onChange={(event) =>
                  setAdminComment(
                    event.target.value
                  )
                }
              />

              <div className="comment-counter">
                {adminComment.length}/1000
              </div>

            </div>

            {/* MODAL FOOTER */}

            <div className="modal-footer">

              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeReviewModal}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  reviewModal.action ===
                  "approve"
                    ? "modal-approve-button"
                    : "modal-reject-button"
                }
                onClick={handleReview}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Updating..."
                  : reviewModal.action ===
                    "approve"
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

export default AdminRemoteRequests;
