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

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const getCurrentCompanyDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());

  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  return { year, month };
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

  return Math.floor(
    difference / (1000 * 60 * 60 * 24)
  ) + 1;
};

const AdminLeave = () => {
  // =====================================================
  // LEAVE REQUEST STATE
  // =====================================================

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  // =====================================================
  // COMMON MESSAGE
  // =====================================================

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  // =====================================================
  // EMPLOYEES
  // =====================================================

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  // =====================================================
  // CASUAL LEAVE ALLOCATION
  // =====================================================

  const currentDate = getCurrentCompanyDate();

  const [allocationYear, setAllocationYear] = useState(
    currentDate.year
  );

  const [allocationMonth, setAllocationMonth] = useState(
    currentDate.month
  );

  const [allocations, setAllocations] = useState({});
  const [allocationLoading, setAllocationLoading] = useState(false);

  const [allocationModalOpen, setAllocationModalOpen] =
    useState(false);

  const [selectedAllocationEmployee, setSelectedAllocationEmployee] =
    useState(null);

  const [allocationLimit, setAllocationLimit] = useState(1);
  const [allocationSaving, setAllocationSaving] = useState(false);

  // =====================================================
  // FETCH LEAVES
  // =====================================================

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

  // =====================================================
  // FETCH EMPLOYEES
  // =====================================================

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);

      const response = await api.get("/employees");

      if (response.data?.success) {
        setEmployees(response.data.employees || []);
      } else {
        setMessage({
          type: "error",
          text:
            response.data?.message ||
            "Unable to load employees.",
        });
      }
    } catch (error) {
      console.error("Get employees error:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to load employees.",
      });
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  // =====================================================
  // FETCH CASUAL LEAVE ALLOCATIONS
  // =====================================================

  const fetchAllocations = async () => {
    if (!employees.length) {
      setAllocations({});
      return;
    }

    try {
      setAllocationLoading(true);

      const results = await Promise.allSettled(
        employees.map(async (employee) => {
          const response = await api.get(
            `/leave/allocation/${employee._id}`,
            {
              params: {
                year: Number(allocationYear),
                month: Number(allocationMonth),
              },
            }
          );

          return {
            employeeId: employee._id,
            casualLeaveLimit:
              response.data?.casualLeaveLimit ?? 1,
          };
        })
      );

      const allocationMap = {};

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          allocationMap[result.value.employeeId] =
            result.value.casualLeaveLimit;
        }
      });

      // If a request fails, still show backend default of 1
      employees.forEach((employee) => {
        if (
          allocationMap[employee._id] === undefined
        ) {
          allocationMap[employee._id] = 1;
        }
      });

      setAllocations(allocationMap);
    } catch (error) {
      console.error(
        "Get casual leave allocations error:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to load casual leave allocations.",
      });
    } finally {
      setAllocationLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [employees, allocationYear, allocationMonth]);

  // =====================================================
  // FILTER LEAVES
  // =====================================================

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

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    });
  }, [
    leaves,
    searchText,
    statusFilter,
    typeFilter,
  ]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const summary = useMemo(
    () => ({
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
    }),
    [leaves]
  );

  // =====================================================
  // REVIEW MODAL
  // =====================================================

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

      // Close directly because reviewingId is still active
      setSelectedLeave(null);
      setReviewStatus("");
      setAdminComment("");
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

  // =====================================================
  // ALLOCATION MODAL
  // =====================================================

  const openAllocationModal = (employee) => {
    setSelectedAllocationEmployee(employee);

    setAllocationLimit(
      allocations[employee._id] ?? 1
    );

    setMessage({
      type: "",
      text: "",
    });

    setAllocationModalOpen(true);
  };

  const closeAllocationModal = () => {
    if (allocationSaving) return;

    setAllocationModalOpen(false);
    setSelectedAllocationEmployee(null);
    setAllocationLimit(1);
  };

  // =====================================================
  // SAVE ALLOCATION
  // =====================================================

  const handleAllocationSave = async (event) => {
    event.preventDefault();

    if (!selectedAllocationEmployee) return;

    const limit = Number(allocationLimit);

    if (!Number.isInteger(limit) || limit < 0) {
      setMessage({
        type: "error",
        text:
          "Casual leave allocation must be a whole number greater than or equal to 0.",
      });

      return;
    }

    try {
      setAllocationSaving(true);

      const response = await api.put(
        `/leave/allocation/${selectedAllocationEmployee._id}`,
        {
          year: Number(allocationYear),
          month: Number(allocationMonth),
          casualLeaveLimit: limit,
        }
      );

      if (response.data?.success) {
        setAllocations((current) => ({
          ...current,
          [selectedAllocationEmployee._id]:
            response.data?.allocation
              ?.casualLeaveLimit ?? limit,
        }));

        setMessage({
          type: "success",
          text: `Casual leave allocation updated for ${selectedAllocationEmployee.name}.`,
        });

        setAllocationModalOpen(false);
        setSelectedAllocationEmployee(null);
      } else {
        setMessage({
          type: "error",
          text:
            response.data?.message ||
            "Unable to update casual leave allocation.",
        });
      }
    } catch (error) {
      console.error(
        "Update casual leave allocation error:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to update casual leave allocation.",
      });
    } finally {
      setAllocationSaving(false);
    }
  };

  // =====================================================
  // ALLOCATION MONTH LABEL
  // =====================================================

  const selectedMonthLabel =
    MONTHS.find(
      (month) => month.value === allocationMonth
    )?.label || "";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="admin-leave-page">

      {/* =================================================
          HEADER
          ================================================= */}

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
          onClick={() => {
            fetchLeaves();
            fetchEmployees();
          }}
          disabled={loading || employeesLoading}
        >
          ↻ Refresh
        </button>
      </div>

      {/* =================================================
          MESSAGE
          ================================================= */}

      {message.text && (
        <div
          className={`admin-leave-message ${message.type}`}
        >
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

      {/* =================================================
          STATS
          ================================================= */}

      <div className="admin-leave-stats">

        <div className="admin-leave-stat">
          <div className="stat-icon">📋</div>

          <div>
            <p>Total Requests</p>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="admin-leave-stat pending">
          <div className="stat-icon">⏳</div>

          <div>
            <p>Pending</p>
            <strong>{summary.pending}</strong>
          </div>
        </div>

        <div className="admin-leave-stat approved">
          <div className="stat-icon">✓</div>

          <div>
            <p>Approved</p>
            <strong>{summary.approved}</strong>
          </div>
        </div>

        <div className="admin-leave-stat rejected">
          <div className="stat-icon">×</div>

          <div>
            <p>Rejected</p>
            <strong>{summary.rejected}</strong>
          </div>
        </div>

      </div>

      {/* =================================================
          LEAVE REQUESTS
          ================================================= */}

      <section className="admin-leave-card">

        <div className="admin-leave-card-header">
          <div>
            <h2>Leave Requests</h2>

            <p>
              Review employee leave applications and
              approve or reject pending requests.
            </p>
          </div>
        </div>

        {/* FILTERS */}

        <div className="admin-leave-filters">

          <div className="admin-leave-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search employee name or ID..."
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

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
          >
            <option value="ALL">
              All Leave Types
            </option>

            {Object.entries(LEAVE_TYPE_LABELS).map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>

        </div>

        {/* TABLE */}

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
              Try changing your search or filters.
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

                  const duration = calculateDays(
                    leave.startDate,
                    leave.endDate
                  );

                  return (
                    <tr key={leave._id}>

                      {/* EMPLOYEE */}

                      <td>
                        <div className="employee-cell">

                          <div className="employee-avatar">
                            {employee?.name
                              ?.charAt(0)
                              .toUpperCase() || "?"}
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

                      {/* LEAVE TYPE */}

                      <td>
                        <span className="leave-type-badge">
                          {LEAVE_TYPE_LABELS[
                            leave.leaveType
                          ] ||
                            leave.leaveType ||
                            "-"}
                        </span>
                      </td>

                      {/* DURATION */}

                      <td>
                        <div className="duration-cell">

                          <strong>
                            {duration}{" "}
                            {duration === 1
                              ? "day"
                              : "days"}
                          </strong>

                          <span>
                            {formatDate(
                              leave.startDate
                            )}{" "}
                            –{" "}
                            {formatDate(
                              leave.endDate
                            )}
                          </span>

                        </div>
                      </td>

                      {/* REASON */}

                      <td>
                        <div className="reason-cell">
                          {leave.reason || "-"}
                        </div>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`leave-status-badge ${leave.status?.toLowerCase()}`}
                        >
                          {leave.status || "-"}
                        </span>
                      </td>

                      {/* APPLIED */}

                      <td>
                        {formatDate(
                          leave.createdAt
                        )}
                      </td>

                      {/* ACTION */}

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

      {/* =================================================
          CASUAL LEAVE ALLOCATION
          ================================================= */}

      <section className="admin-leave-card casual-allocation-card">

        <div className="casual-allocation-header">

          <div>
            <p className="casual-allocation-eyebrow">
              Monthly Leave Settings
            </p>

            <h2>Casual Leave Allocation</h2>

            <p>
              Set the number of casual leave days available
              to each employee for the selected month.
            </p>
          </div>

          <div className="allocation-period">

            <div>
              <label htmlFor="allocation-year">
                Year
              </label>

              <select
                id="allocation-year"
                value={allocationYear}
                onChange={(event) =>
                  setAllocationYear(
                    Number(event.target.value)
                  )
                }
              >
                {Array.from(
                  { length: 7 },
                  (_, index) =>
                    currentDate.year - 3 + index
                ).map((year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="allocation-month">
                Month
              </label>

              <select
                id="allocation-month"
                value={allocationMonth}
                onChange={(event) =>
                  setAllocationMonth(
                    Number(event.target.value)
                  )
                }
              >
                {MONTHS.map((month) => (
                  <option
                    key={month.value}
                    value={month.value}
                  >
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>

        <div className="allocation-period-info">
          <span>Showing allocation for</span>

          <strong>
            {selectedMonthLabel} {allocationYear}
          </strong>
        </div>

        {employeesLoading || allocationLoading ? (
          <div className="admin-leave-loading">
            <div className="leave-spinner"></div>

            <p>
              {employeesLoading
                ? "Loading employees..."
                : "Loading leave allocations..."}
            </p>
          </div>
        ) : employees.length === 0 ? (
          <div className="admin-leave-empty">

            <div className="empty-icon">👥</div>

            <h3>No employees found</h3>

            <p>
              Add employees from Employee Management
              before setting leave allocation.
            </p>

          </div>
        ) : (
          <div className="admin-leave-table-wrapper">

            <table className="admin-leave-table allocation-table">

              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Casual Leave</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {employees.map((employee) => {

                  const limit =
                    allocations[employee._id] ?? 1;

                  const isActive =
                    employee.employmentStatus ===
                    "ACTIVE";

                  return (
                    <tr key={employee._id}>

                      {/* EMPLOYEE */}

                      <td>
                        <div className="employee-cell">

                          <div className="employee-avatar">
                            {employee.name
                              ?.charAt(0)
                              .toUpperCase() || "?"}
                          </div>

                          <div>
                            <strong>
                              {employee.name ||
                                "Unknown"}
                            </strong>

                            <span>
                              {employee.employeeId ||
                                "-"}
                            </span>
                          </div>

                        </div>
                      </td>

                      {/* DEPARTMENT */}

                      <td>
                        <div className="allocation-department">

                          <strong>
                            {employee.department ||
                              "Not assigned"}
                          </strong>

                          <span>
                            {employee.designation ||
                              "No designation"}
                          </span>

                        </div>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`allocation-status ${
                            isActive
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          <span></span>

                          {isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {/* ALLOCATION */}

                      <td>
                        <div className="allocation-value">

                          <strong>
                            {limit}
                          </strong>

                          <span>
                            {limit === 1
                              ? "day"
                              : "days"}
                          </span>

                        </div>
                      </td>

                      {/* ACTION */}

                      <td>
                        <button
                          type="button"
                          className="allocation-edit-button"
                          onClick={() =>
                            openAllocationModal(
                              employee
                            )
                          }
                        >
                          Edit Allocation
                        </button>
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* =================================================
          LEAVE REVIEW MODAL
          ================================================= */}

      {selectedLeave && (
        <div
          className="leave-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !reviewingId
            ) {
              closeReviewModal();
            }
          }}
        >

          <div className="leave-review-modal">

            <div className="modal-header">

              <div>
                <p>Leave Review</p>

                <h2>
                  {reviewStatus === "APPROVED"
                    ? "Approve Leave"
                    : "Reject Leave"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={Boolean(reviewingId)}
              >
                ×
              </button>

            </div>

            <div className="modal-employee">

              <div className="employee-avatar large">
                {selectedLeave.employeeId?.name
                  ?.charAt(0)
                  .toUpperCase() || "?"}
              </div>

              <div>
                <strong>
                  {selectedLeave.employeeId?.name ||
                    "Unknown"}
                </strong>

                <span>
                  {selectedLeave.employeeId
                    ?.employeeId || "-"}
                </span>
              </div>

            </div>

            <div className="modal-details">

              <div>
                <span>Leave Type</span>

                <strong>
                  {LEAVE_TYPE_LABELS[
                    selectedLeave.leaveType
                  ] ||
                    selectedLeave.leaveType ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Duration</span>

                <strong>
                  {calculateDays(
                    selectedLeave.startDate,
                    selectedLeave.endDate
                  )}{" "}
                  days
                </strong>
              </div>

              <div>
                <span>Start Date</span>

                <strong>
                  {formatDate(
                    selectedLeave.startDate
                  )}
                </strong>
              </div>

              <div>
                <span>End Date</span>

                <strong>
                  {formatDate(
                    selectedLeave.endDate
                  )}
                </strong>
              </div>

              <div className="full-width">
                <span>Reason</span>

                <p>
                  {selectedLeave.reason || "-"}
                </p>
              </div>

            </div>

            <label className="comment-field">

              <span>
                Admin Comment{" "}
                <small>(Optional)</small>
              </span>

              <textarea
                value={adminComment}
                onChange={(event) =>
                  setAdminComment(
                    event.target.value
                  )
                }
                placeholder="Add a comment for the employee..."
                maxLength={500}
                disabled={Boolean(reviewingId)}
              />

              <small>
                {adminComment.length}/500
              </small>

            </label>

            <div className="modal-actions">

              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeReviewModal}
                disabled={Boolean(reviewingId)}
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
                disabled={Boolean(reviewingId)}
              >
                {reviewingId
                  ? "Saving..."
                  : reviewStatus === "APPROVED"
                  ? "Approve Leave"
                  : "Reject Leave"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          CASUAL LEAVE ALLOCATION MODAL
          ================================================= */}

      {allocationModalOpen &&
        selectedAllocationEmployee && (
          <div
            className="leave-modal-overlay allocation-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !allocationSaving
              ) {
                closeAllocationModal();
              }
            }}
          >

            <div className="leave-review-modal allocation-modal">

              <div className="modal-header">

                <div>
                  <p>Leave Allocation</p>

                  <h2>
                    Edit Casual Leave
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeAllocationModal}
                  disabled={allocationSaving}
                >
                  ×
                </button>

              </div>

              <div className="modal-employee">

                <div className="employee-avatar large">
                  {selectedAllocationEmployee.name
                    ?.charAt(0)
                    .toUpperCase() || "?"}
                </div>

                <div>
                  <strong>
                    {selectedAllocationEmployee.name}
                  </strong>

                  <span>
                    {
                      selectedAllocationEmployee.employeeId
                    }
                  </span>
                </div>

              </div>

              <form
                className="allocation-form"
                onSubmit={handleAllocationSave}
              >

                <div className="allocation-form-info">

                  <div>
                    <span>Year</span>

                    <strong>
                      {allocationYear}
                    </strong>
                  </div>

                  <div>
                    <span>Month</span>

                    <strong>
                      {selectedMonthLabel}
                    </strong>
                  </div>

                </div>

                <div className="allocation-input-group">

                  <label htmlFor="casual-leave-limit">
                    Casual Leave Allocation
                  </label>

                  <div className="allocation-number-wrapper">

                    <input
                      id="casual-leave-limit"
                      type="number"
                      min="0"
                      step="1"
                      value={allocationLimit}
                      onChange={(event) =>
                        setAllocationLimit(
                          event.target.value
                        )
                      }
                      disabled={allocationSaving}
                    />

                    <span>days</span>

                  </div>

                  <small>
                    Enter the total casual leave days
                    available for this employee for{" "}
                    {selectedMonthLabel}{" "}
                    {allocationYear}.
                  </small>

                </div>

                <div className="allocation-note">
                  <span>i</span>

                  <p>
                    This allocation applies only to the
                    selected month. If no allocation is
                    created, the system uses the default
                    allocation of 1 day.
                  </p>
                </div>

                <div className="modal-actions">

                  <button
                    type="button"
                    className="modal-cancel-button"
                    onClick={closeAllocationModal}
                    disabled={allocationSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="allocation-save-button"
                    disabled={allocationSaving}
                  >
                    {allocationSaving
                      ? "Saving..."
                      : "Save Allocation"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </div>
  );
};

export default AdminLeave;