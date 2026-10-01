import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./AdminLeave.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const LEAVE_TYPE_LABELS = {
  CASUAL: "Casual Leave",
  SICK: "Sick Leave",
  EARNED: "Earned Leave",
  UNPAID: "Unpaid Leave",
  OTHER: "Other",
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const difference = end.getTime() - start.getTime();

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
};

const AdminLeave = () => {
  const [leaves, setLeaves] = useState([]);

  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [adminComment, setAdminComment] = useState("");

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const fetchLeaves = async () => {
    try {
      setLoading(true);

      const response = await api.get("/leave");

      setLeaves(response.data?.leaves || []);
    } catch (error) {
      console.error("Get admin leaves error:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to load leave requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const filteredLeaves = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return leaves.filter((leave) => {
      const employee = leave.employeeId;

      const employeeName =
        employee?.name?.toLowerCase() || "";

      const employeeId =
        employee?.employeeId?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        employeeName.includes(search) ||
        employeeId.includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        leave.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        leave.leaveType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [leaves, searchText, statusFilter, typeFilter]);

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

  const openReviewModal = (leave, status) => {
    setSelectedLeave(leave);
    setReviewStatus(status);
    setAdminComment("");
  };

  const closeReviewModal = () => {
    if (reviewingId) return;

    setSelectedLeave(null);
    setReviewStatus("");
    setAdminComment("");
  };

  const handleReview = async () => {
    if (!selectedLeave || !reviewStatus) return;

    try {
      setReviewingId(selectedLeave._id);

      const response = await api.patch(
        `/leave/${selectedLeave._id}/review`,
        {
          status: reviewStatus,
          adminComment: adminComment.trim(),
        }
      );

      const updatedLeave = response.data?.leave;

      if (updatedLeave) {
        setLeaves((currentLeaves) =>
          currentLeaves.map((leave) =>
            leave._id === updatedLeave._id
              ? updatedLeave
              : leave
          )
        );
      } else {
        await fetchLeaves();
      }

      setMessage({
        type: "success",
        text:
          reviewStatus === "APPROVED"
            ? "Leave approved successfully."
            : "Leave rejected successfully.",
      });

      closeReviewModal();
    } catch (error) {
      console.error("Review leave error:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to review leave request.",
      });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="admin-leave-page">
      <div className="admin-leave-header">
        <div>
          <p className="admin-leave-eyebrow">
            Leave Management
          </p>

          <h1>Employee Leave Requests</h1>

          <p>
            Review and manage employee leave applications.
          </p>
        </div>

        <button
          type="button"
          className="refresh-leave-button"
          onClick={fetchLeaves}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {message.text && (
        <div className={`admin-leave-message ${message.type}`}>
          <span>
            {message.type === "success" ? "✓" : "!"}
          </span>

          <p>{message.text}</p>

          <button
            type="button"
            onClick={() =>
              setMessage({
                type: "",
                text: "",
              })
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-leave-stats">
        <div className="admin-leave-stat">
          <span className="stat-icon">▣</span>
          <div>
            <p>Total Requests</p>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="admin-leave-stat pending">
          <span className="stat-icon">◷</span>
          <div>
            <p>Pending</p>
            <strong>{summary.pending}</strong>
          </div>
        </div>

        <div className="admin-leave-stat approved">
          <span className="stat-icon">✓</span>
          <div>
            <p>Approved</p>
            <strong>{summary.approved}</strong>
          </div>
        </div>

        <div className="admin-leave-stat rejected">
          <span className="stat-icon">×</span>
          <div>
            <p>Rejected</p>
            <strong>{summary.rejected}</strong>
          </div>
        </div>
      </div>

      <section className="admin-leave-card">
        <div className="admin-leave-card-header">
          <div>
            <h2>Leave Requests</h2>
            <p>
              {filteredLeaves.length} request
              {filteredLeaves.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>

        <div className="admin-leave-filters">
          <div className="admin-leave-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search employee name or ID..."
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
            }}
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

          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
            }}
          >
            <option value="ALL">All Leave Types</option>
            <option value="CASUAL">Casual Leave</option>
            <option value="SICK">Sick Leave</option>
            <option value="EARNED">Earned Leave</option>
            <option value="UNPAID">Unpaid Leave</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-leave-loading">
            <div className="leave-spinner"></div>
            <p>Loading leave requests...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="admin-leave-empty">
            <div className="empty-icon">✓</div>
            <h3>No leave requests found</h3>
            <p>
              Try changing the filters or search for another
              employee.
            </p>
          </div>
        ) : (
          <div className="admin-leave-table-wrapper">
            <table className="admin-leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeaves.map((leave) => {
                  const employee = leave.employeeId;

                  return (
                    <tr key={leave._id}>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar">
                            {employee?.name
                              ?.charAt(0)
                              ?.toUpperCase() || "?"}
                          </div>

                          <div>
                            <strong>
                              {employee?.name || "Unknown"}
                            </strong>

                            <span>
                              {employee?.employeeId || "-"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="leave-type-badge">
                          {LEAVE_TYPE_LABELS[
                            leave.leaveType
                          ] || leave.leaveType}
                        </span>
                      </td>

                      <td>
                        <div className="duration-cell">
                          <strong>
                            {calculateDays(
                              leave.startDate,
                              leave.endDate
                            )}{" "}
                            day
                            {calculateDays(
                              leave.startDate,
                              leave.endDate
                            ) !== 1
                              ? "s"
                              : ""}
                          </strong>

                          <span>
                            {formatDate(leave.startDate)}
                            {" → "}
                            {formatDate(leave.endDate)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="reason-cell">
                          {leave.reason || "-"}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`leave-status-badge ${leave.status.toLowerCase()}`}
                        >
                          {leave.status}
                        </span>
                      </td>

                      <td>
                        {formatDate(leave.createdAt)}
                      </td>

                      <td>
                        {leave.status === "PENDING" ? (
                          <div className="leave-action-buttons">
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() =>
                                openReviewModal(
                                  leave,
                                  "APPROVED"
                                )
                              }
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="reject-button"
                              onClick={() =>
                                openReviewModal(
                                  leave,
                                  "REJECTED"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="reviewed-label">
                            Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedLeave && (
        <div
          className="leave-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReviewModal();
            }
          }}
        >
          <div className="leave-review-modal">
            <div className="modal-header">
              <div>
                <p>Review Leave Request</p>
                <h2>
                  {reviewStatus === "APPROVED"
                    ? "Approve Leave"
                    : "Reject Leave"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={!!reviewingId}
              >
                ×
              </button>
            </div>

            <div className="modal-employee">
              <div className="employee-avatar large">
                {selectedLeave.employeeId?.name
                  ?.charAt(0)
                  ?.toUpperCase() || "?"}
              </div>

              <div>
                <strong>
                  {selectedLeave.employeeId?.name ||
                    "Unknown Employee"}
                </strong>

                <span>
                  {selectedLeave.employeeId?.employeeId || "-"}
                </span>
              </div>
            </div>

            <div className="modal-details">
              <div>
                <span>Leave Type</span>
                <strong>
                  {LEAVE_TYPE_LABELS[
                    selectedLeave.leaveType
                  ] || selectedLeave.leaveType}
                </strong>
              </div>

              <div>
                <span>Duration</span>
                <strong>
                  {formatDate(selectedLeave.startDate)}
                  {" → "}
                  {formatDate(selectedLeave.endDate)}
                </strong>
              </div>

              <div className="full-width">
                <span>Employee Reason</span>
                <p>{selectedLeave.reason}</p>
              </div>
            </div>

            <label className="comment-field">
              <span>
                Admin Comment{" "}
                <small>(optional)</small>
              </span>

              <textarea
                rows="4"
                placeholder="Add a comment for the employee..."
                value={adminComment}
                onChange={(event) => {
                  setAdminComment(event.target.value);
                }}
                maxLength={1000}
              />

              <small>
                {adminComment.length}/1000
              </small>
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeReviewModal}
                disabled={!!reviewingId}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  reviewStatus === "APPROVED"
                    ? "modal-approve-button"
                    : "modal-reject-button"
                }
                onClick={handleReview}
                disabled={!!reviewingId}
              >
                {reviewingId
                  ? "Processing..."
                  : reviewStatus === "APPROVED"
                  ? "Approve Leave"
                  : "Reject Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeave;