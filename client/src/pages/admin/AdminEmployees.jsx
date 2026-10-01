import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./AdminEmployees.css";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  joiningDate: "",
  attendanceMethod: "OFFICE",
};

const AdminEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [credentials, setCredentials] = useState(null);

  // --------------------------------------------------
  // FETCH EMPLOYEES
  // --------------------------------------------------

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/employees");

      if (response.data.success) {
        setEmployees(response.data.employees || []);
      } else {
        setError(
          response.data.message || "Failed to load employees"
        );
      }
    } catch (err) {
      console.error("Fetch Employees Error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load employees"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // --------------------------------------------------
  // FILTER DATA
  // --------------------------------------------------

  const departments = useMemo(() => {
    const values = employees
      .map((employee) => employee.department)
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        employee.name?.toLowerCase().includes(searchValue) ||
        employee.employeeId
          ?.toLowerCase()
          .includes(searchValue) ||
        employee.userId?.email
          ?.toLowerCase()
          .includes(searchValue) ||
        employee.department
          ?.toLowerCase()
          .includes(searchValue) ||
        employee.designation
          ?.toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" ||
        employee.employmentStatus === statusFilter;

      const matchesDepartment =
        departmentFilter === "ALL" ||
        employee.department === departmentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDepartment
      );
    });
  }, [
    employees,
    search,
    statusFilter,
    departmentFilter,
  ]);

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------

  const totalEmployees = employees.length;

  const activeEmployees = employees.filter(
    (employee) =>
      employee.employmentStatus === "ACTIVE"
  ).length;

  const inactiveEmployees = employees.filter(
    (employee) =>
      employee.employmentStatus === "INACTIVE"
  ).length;

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setModalMode("add");
    setSelectedEmployee(null);
    setCredentials(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setModalMode("edit");
    setSelectedEmployee(employee);
    setCredentials(null);
    setError("");
    setSuccess("");

    setForm({
      name: employee.name || "",
      email: employee.userId?.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      joiningDate: employee.joiningDate
        ? employee.joiningDate.substring(0, 10)
        : "",
      attendanceMethod:
        employee.attendanceMethod || "OFFICE",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setSelectedEmployee(null);
    setCredentials(null);
    setForm(emptyForm);
    setError("");
  };

  // --------------------------------------------------
  // ADD / EDIT
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Employee name is required.");
      return;
    }

    if (modalMode === "add" && !form.email.trim()) {
      setError("Email is required.");
      return;
    }

    try {
      setSaving(true);

      if (modalMode === "add") {
        const response = await api.post("/employees", {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          department: form.department.trim(),
          designation: form.designation.trim(),
          joiningDate: form.joiningDate || undefined,
          attendanceMethod: form.attendanceMethod,
        });

        if (response.data.success) {
          setSuccess(
            "Employee created successfully."
          );

          setCredentials(
            response.data.credentials
          );

          await fetchEmployees();
        } else {
          setError(
            response.data.message ||
              "Failed to create employee."
          );
        }
      } else {
        const response = await api.put(
          `/employees/${selectedEmployee._id}`,
          {
            name: form.name.trim(),
            phone: form.phone.trim(),
            department: form.department.trim(),
            designation: form.designation.trim(),
            joiningDate:
              form.joiningDate || undefined,
            attendanceMethod:
              form.attendanceMethod,
          }
        );

        if (response.data.success) {
          setSuccess(
            "Employee updated successfully."
          );

          await fetchEmployees();

          setTimeout(() => {
            closeModal();
          }, 700);
        } else {
          setError(
            response.data.message ||
              "Failed to update employee."
          );
        }
      }
    } catch (err) {
      console.error("Employee Save Error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to save employee."
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // ACTIVATE / DEACTIVATE
  // --------------------------------------------------

  const handleDeactivate = async (employee) => {
    const confirmed = window.confirm(
      `Deactivate ${employee.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/employees/${employee._id}`
      );

      if (response.data.success) {
        setSuccess(
          `${employee.name} has been deactivated.`
        );

        await fetchEmployees();
      } else {
        setError(
          response.data.message ||
            "Failed to deactivate employee."
        );
      }
    } catch (err) {
      console.error(
        "Deactivate Employee Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to deactivate employee."
      );
    }
  };

  const handleActivate = async (employee) => {
    try {
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/employees/${employee._id}/activate`
      );

      if (response.data.success) {
        setSuccess(
          `${employee.name} has been activated.`
        );

        await fetchEmployees();
      } else {
        setError(
          response.data.message ||
            "Failed to activate employee."
        );
      }
    } catch (err) {
      console.error(
        "Activate Employee Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to activate employee."
      );
    }
  };

  // --------------------------------------------------
  // COPY CREDENTIAL
  // --------------------------------------------------

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess("Copied to clipboard.");
    } catch {
      setError("Unable to copy.");
    }
  };

  // --------------------------------------------------
  // FORMAT DATE
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="employees-page">

      {/* HEADER */}
      <div className="employees-header">
        <div>
          <span className="employees-eyebrow">
            PEOPLE MANAGEMENT
          </span>

          <h1>Employees</h1>

          <p>
            Manage your team, employee access and
            attendance settings.
          </p>
        </div>

        <div className="employees-header-actions">
          <button
            className="employees-refresh-btn"
            onClick={fetchEmployees}
            disabled={loading}
          >
            ↻ Refresh
          </button>

          <button
            className="employees-add-btn"
            onClick={openAddModal}
          >
            + Add Employee
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="employees-alert employees-alert-error">
          <span>!</span>
          {error}
        </div>
      )}

      {success && (
        <div className="employees-alert employees-alert-success">
          <span>✓</span>
          {success}
        </div>
      )}

      {/* STATS */}
      <div className="employees-stats">

        <div className="employee-stat-card">
          <div className="employee-stat-icon">
            👥
          </div>

          <div>
            <span>Total Employees</span>
            <strong>{totalEmployees}</strong>
          </div>
        </div>

        <div className="employee-stat-card">
          <div className="employee-stat-icon">
            ✓
          </div>

          <div>
            <span>Active</span>
            <strong>{activeEmployees}</strong>
          </div>
        </div>

        <div className="employee-stat-card">
          <div className="employee-stat-icon">
            ○
          </div>

          <div>
            <span>Inactive</span>
            <strong>{inactiveEmployees}</strong>
          </div>
        </div>

        <div className="employee-stat-card">
          <div className="employee-stat-icon">
            🏢
          </div>

          <div>
            <span>Departments</span>
            <strong>{departments.length}</strong>
          </div>
        </div>

      </div>

      {/* FILTER BAR */}
      <div className="employees-toolbar">

        <div className="employee-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search name, ID, email, department..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="ALL">
            All Status
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="INACTIVE">
            Inactive
          </option>
        </select>

        <select
          value={departmentFilter}
          onChange={(event) =>
            setDepartmentFilter(event.target.value)
          }
        >
          <option value="ALL">
            All Departments
          </option>

          {departments.map((department) => (
            <option
              key={department}
              value={department}
            >
              {department}
            </option>
          ))}
        </select>

      </div>

      {/* EMPLOYEE TABLE */}
      <div className="employees-card">

        <div className="employees-card-header">
          <div>
            <h2>Employee Directory</h2>

            <p>
              Showing {filteredEmployees.length} of{" "}
              {employees.length} employees
            </p>
          </div>
        </div>

        {loading ? (
          <div className="employees-loading">
            <div className="employees-spinner"></div>
            <p>Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="employees-empty">
            <div className="employees-empty-icon">
              👥
            </div>

            <h3>No employees found</h3>

            <p>
              Try changing your filters or add a
              new employee.
            </p>

            <button
              onClick={openAddModal}
              className="employees-empty-btn"
            >
              + Add Employee
            </button>
          </div>
        ) : (
          <div className="employees-table-wrapper">

            <table className="employees-table">

              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contact</th>
                  <th>Department</th>
                  <th>Attendance</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredEmployees.map(
                  (employee) => {

                    const isActive =
                      employee.employmentStatus ===
                      "ACTIVE";

                    return (
                      <tr key={employee._id}>

                        {/* EMPLOYEE */}
                        <td>
                          <div className="employee-person">

                            <div className="employee-avatar">
                              {employee.name
                                ?.charAt(0)
                                .toUpperCase()}
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

                        {/* CONTACT */}
                        <td>
                          <div className="employee-contact">

                            <span>
                              {employee.userId?.email ||
                                "-"}
                            </span>

                            {employee.phone && (
                              <small>
                                {employee.phone}
                              </small>
                            )}

                          </div>
                        </td>

                        {/* DEPARTMENT */}
                        <td>
                          <div className="employee-department">

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

                        {/* ATTENDANCE */}
                        <td>
                          <span
                            className={`attendance-badge ${employee.attendanceMethod?.toLowerCase()}`}
                          >
                            {employee.attendanceMethod ||
                              "OFFICE"}
                          </span>
                        </td>

                        {/* JOINING DATE */}
                        <td>
                          {formatDate(
                            employee.joiningDate
                          )}
                        </td>

                        {/* STATUS */}
                        <td>
                          <span
                            className={`employee-status ${
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

                        {/* ACTIONS */}
                        <td>
                          <div className="employee-actions">

                            <button
                              className="action-edit"
                              onClick={() =>
                                openEditModal(
                                  employee
                                )
                              }
                            >
                              Edit
                            </button>

                            {isActive ? (
                              <button
                                className="action-deactivate"
                                onClick={() =>
                                  handleDeactivate(
                                    employee
                                  )
                                }
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                className="action-activate"
                                onClick={() =>
                                  handleActivate(
                                    employee
                                  )
                                }
                              >
                                Activate
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          className="employee-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="employee-modal">

            <div className="employee-modal-header">

              <div>
                <span>
                  {modalMode === "add"
                    ? "NEW EMPLOYEE"
                    : "EMPLOYEE DETAILS"}
                </span>

                <h2>
                  {modalMode === "add"
                    ? "Add Employee"
                    : "Edit Employee"}
                </h2>
              </div>

              <button
                className="employee-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="employee-form-grid">

                <div className="employee-form-group full">
                  <label>
                    Full Name *
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter employee name"
                  />
                </div>

                <div className="employee-form-group">
                  <label>
                    Email *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="employee@example.com"
                    disabled={modalMode === "edit"}
                  />

                  {modalMode === "edit" && (
                    <small>
                      Email cannot be changed here.
                    </small>
                  )}
                </div>

                <div className="employee-form-group">
                  <label>
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="employee-form-group">
                  <label>
                    Department
                  </label>

                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    placeholder="IT, HR, Marketing..."
                  />
                </div>

                <div className="employee-form-group">
                  <label>
                    Designation
                  </label>

                  <input
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="Software Developer"
                  />
                </div>

                <div className="employee-form-group">
                  <label>
                    Joining Date
                  </label>

                  <input
                    type="date"
                    name="joiningDate"
                    value={form.joiningDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="employee-form-group">
                  <label>
                    Attendance Method
                  </label>

                  <select
                    name="attendanceMethod"
                    value={form.attendanceMethod}
                    onChange={handleChange}
                  >
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

              </div>

              {error && (
                <div className="employee-form-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="employee-form-success">
                  {success}
                </div>
              )}

              {/* GENERATED CREDENTIALS */}
              {credentials && (
                <div className="credentials-box">

                  <div className="credentials-title">
                    <span>✓</span>

                    <div>
                      <strong>
                        Employee Created
                      </strong>

                      <p>
                        Save these temporary login
                        credentials securely.
                      </p>
                    </div>
                  </div>

                  <div className="credential-row">

                    <div>
                      <small>
                        Employee ID
                      </small>

                      <strong>
                        {credentials.employeeId}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          credentials.employeeId
                        )
                      }
                    >
                      Copy
                    </button>

                  </div>

                  <div className="credential-row">

                    <div>
                      <small>
                        Temporary Password
                      </small>

                      <strong>
                        {credentials.temppassword}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          credentials.temppassword
                        )
                      }
                    >
                      Copy
                    </button>

                  </div>

                  <p className="credential-warning">
                    The employee must change this
                    password during first login.
                  </p>

                </div>
              )}

              <div className="employee-modal-actions">

                <button
                  type="button"
                  className="employee-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  {credentials
                    ? "Close"
                    : "Cancel"}
                </button>

                {!credentials && (
                  <button
                    type="submit"
                    className="employee-save-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : modalMode === "add"
                      ? "Create Employee"
                      : "Save Changes"}
                  </button>
                )}

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default AdminEmployees;