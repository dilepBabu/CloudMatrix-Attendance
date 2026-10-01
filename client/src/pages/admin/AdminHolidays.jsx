import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./AdminHoliday.css";

const EMPTY_FORM = {
  name: "",
  date: "",
  description: "",
};

const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClass = (isActive) => {
  return isActive ? "holiday-status active" : "holiday-status inactive";
};

function AdminHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // FETCH HOLIDAYS
  // --------------------------------------------------

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/holidays", {
        params: {
          year,
          includeInactive: true,
        },
      });

      setHolidays(response.data?.holidays || []);
    } catch (err) {
      console.error("Fetch Holidays Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load holidays"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredHolidays = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return holidays.filter((holiday) => {
      const matchesSearch =
        !searchValue ||
        holiday.name?.toLowerCase().includes(searchValue) ||
        holiday.description?.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && holiday.isActive) ||
        (statusFilter === "INACTIVE" && !holiday.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [holidays, search, statusFilter]);

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------

  const totalCount = holidays.length;

  const activeCount = holidays.filter(
    (holiday) => holiday.isActive
  ).length;

  const inactiveCount = holidays.filter(
    (holiday) => !holiday.isActive
  ).length;

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const openCreateModal = () => {
    setEditingHoliday(null);

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setShowModal(true);
  };

  const openEditModal = (holiday) => {
    setEditingHoliday(holiday);

    setForm({
      name: holiday.name || "",
      date: holiday.date
        ? new Date(holiday.date)
            .toISOString()
            .split("T")[0]
        : "",
      description: holiday.description || "",
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingHoliday(null);
    setForm({
      ...EMPTY_FORM,
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // CREATE / UPDATE
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Holiday name is required");
      return;
    }

    if (!form.date) {
      setError("Holiday date is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingHoliday) {
        await api.put(
          `/holidays/${editingHoliday._id}`,
          {
            name: form.name.trim(),
            date: form.date,
            description: form.description.trim(),
          }
        );
      } else {
        await api.post("/holidays", {
          name: form.name.trim(),
          date: form.date,
          description: form.description.trim(),
        });
      }

      closeModal();
      await fetchHolidays();
    } catch (err) {
      console.error("Save Holiday Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to save holiday"
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // DEACTIVATE
  // --------------------------------------------------

  const handleDeactivate = async (holiday) => {
    const confirmed = window.confirm(
      `Deactivate "${holiday.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.patch(
        `/holidays/${holiday._id}/deactivate`
      );

      await fetchHolidays();
    } catch (err) {
      console.error("Deactivate Holiday Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to deactivate holiday"
      );
    }
  };

  // --------------------------------------------------
  // ACTIVATE
  // --------------------------------------------------

  const handleActivate = async (holiday) => {
    const confirmed = window.confirm(
      `Activate "${holiday.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.patch(
        `/holidays/${holiday._id}/activate`
      );

      await fetchHolidays();
    } catch (err) {
      console.error("Activate Holiday Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to activate holiday"
      );
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="holidays-page">
      <div className="holidays-header">
        <div>
          <div className="holidays-eyebrow">
            COMPANY CALENDAR
          </div>

          <h1>Holidays</h1>

          <p>
            Manage company holidays and non-working days.
          </p>
        </div>

        <div className="holidays-header-actions">
          <button
            className="holiday-refresh-btn"
            onClick={fetchHolidays}
            disabled={loading}
          >
            ↻ Refresh
          </button>

          <button
            className="holiday-add-btn"
            onClick={openCreateModal}
          >
            + Add Holiday
          </button>
        </div>
      </div>

      {error && (
        <div className="holiday-error">
          <span>⚠</span>
          <span>{error}</span>

          <button onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {/* STATS */}

      <div className="holiday-stats">
        <div className="holiday-stat-card">
          <div className="holiday-stat-icon">📅</div>

          <div>
            <span>Total Holidays</span>
            <strong>{totalCount}</strong>
          </div>
        </div>

        <div className="holiday-stat-card">
          <div className="holiday-stat-icon">✓</div>

          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="holiday-stat-card">
          <div className="holiday-stat-icon">○</div>

          <div>
            <span>Inactive</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      {/* FILTERS */}

      <div className="holiday-toolbar">
        <div className="holiday-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search holidays..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          value={year}
          onChange={(event) =>
            setYear(Number(event.target.value))
          }
        >
          {Array.from(
            { length: 7 },
            (_, index) =>
              new Date().getFullYear() - 2 + index
          ).map((itemYear) => (
            <option key={itemYear} value={itemYear}>
              {itemYear}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* TABLE */}

      <div className="holiday-card">
        <div className="holiday-card-header">
          <div>
            <h2>{year} Holidays</h2>
            <p>
              {filteredHolidays.length} holiday
              {filteredHolidays.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="holiday-loading">
            <div className="holiday-spinner"></div>
            <p>Loading holidays...</p>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="holiday-empty">
            <div className="holiday-empty-icon">
              📅
            </div>

            <h3>No holidays found</h3>

            <p>
              No holidays match your current filters.
            </p>

            <button
              onClick={openCreateModal}
              className="holiday-empty-btn"
            >
              + Add Holiday
            </button>
          </div>
        ) : (
          <div className="holiday-table-wrapper">
            <table className="holiday-table">
              <thead>
                <tr>
                  <th>HOLIDAY</th>
                  <th>DATE</th>
                  <th>DESCRIPTION</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredHolidays.map((holiday) => (
                  <tr key={holiday._id}>
                    <td>
                      <div className="holiday-name-cell">
                        <div className="holiday-calendar-icon">
                          📅
                        </div>

                        <div>
                          <strong>{holiday.name}</strong>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="holiday-date">
                        {formatDate(holiday.date)}
                      </span>
                    </td>

                    <td>
                      <span className="holiday-description">
                        {holiday.description || "No description"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={getStatusClass(
                          holiday.isActive
                        )}
                      >
                        <span className="holiday-status-dot"></span>
                        {holiday.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="holiday-actions">
                        <button
                          className="holiday-edit-btn"
                          onClick={() =>
                            openEditModal(holiday)
                          }
                        >
                          Edit
                        </button>

                        {holiday.isActive ? (
                          <button
                            className="holiday-deactivate-btn"
                            onClick={() =>
                              handleDeactivate(holiday)
                            }
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className="holiday-activate-btn"
                            onClick={() =>
                              handleActivate(holiday)
                            }
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}

      {showModal && (
        <div
          className="holiday-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="holiday-modal">
            <div className="holiday-modal-header">
              <div>
                <span className="holiday-modal-label">
                  COMPANY CALENDAR
                </span>

                <h2>
                  {editingHoliday
                    ? "Edit Holiday"
                    : "Add Holiday"}
                </h2>

                <p>
                  {editingHoliday
                    ? "Update the holiday details."
                    : "Create a new company holiday."}
                </p>
              </div>

              <button
                className="holiday-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form
              className="holiday-form"
              onSubmit={handleSubmit}
            >
              <div className="holiday-form-group">
                <label>
                  Holiday Name
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Example: Independence Day"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={200}
                />
              </div>

              <div className="holiday-form-group">
                <label>
                  Date
                  <span>*</span>
                </label>

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                />
              </div>

              <div className="holiday-form-group">
                <label>Description</label>

                <textarea
                  name="description"
                  placeholder="Optional holiday description..."
                  value={form.description}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                />

                <small>
                  {form.description.length}/500
                </small>
              </div>

              <div className="holiday-form-actions">
                <button
                  type="button"
                  className="holiday-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="holiday-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingHoliday
                    ? "Update Holiday"
                    : "Create Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHolidays;

