
import { useEffect, useState } from "react";
import api from "../../services/api";
import "./AdminSettings.css";

const AdminSettings = () => {
  const [form, setForm] = useState({
    latitude: "",
    longitude: "",
    radius: "",
    address: "",
    officeAttendanceEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load existing company settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/settings");

      const settings = response.data.settings;

      setForm({
        latitude: settings?.officeLocation?.latitude ?? "",
        longitude: settings?.officeLocation?.longitude ?? "",
        radius: settings?.officeLocation?.radius ?? "",
        address: settings?.officeLocation?.address ?? "",
        officeAttendanceEnabled:
          settings?.officeAttendanceEnabled ?? true,
      });
    } catch (err) {
      // 404 simply means settings have not been configured yet.
      if (err.response?.status !== 404) {
        setError(
          err.response?.data?.message ||
            "Failed to load company settings"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Manual field changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // Get current browser/device location automatically
  const getCurrentLocation = () => {
    setMessage("");
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setForm((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));

        setMessage(
          "Current location detected successfully. You can still edit the coordinates manually."
        );

        setGettingLocation(false);
      },
      (locationError) => {
        console.error(
          "Get Location Error:",
          locationError
        );

        let errorMessage =
          "Unable to get your current location.";

        if (locationError.code === 1) {
          errorMessage =
            "Location permission was denied. Please allow location access in your browser and try again.";
        } else if (locationError.code === 2) {
          errorMessage =
            "Your current location could not be determined. Please try again or enter the coordinates manually.";
        } else if (locationError.code === 3) {
          errorMessage =
            "Location request timed out. Please try again or enter the coordinates manually.";
        }

        setError(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleToggle = () => {
    setForm((prev) => ({
      ...prev,
      officeAttendanceEnabled:
        !prev.officeAttendanceEnabled,
    }));

    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radius = Number(form.radius);

    // Frontend validation
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setError("Please enter a valid latitude.");
      return;
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Please enter a valid longitude.");
      return;
    }

    if (!Number.isFinite(radius) || radius <= 0) {
      setError("Radius must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.put("/settings/office", {
        latitude,
        longitude,
        radius,
        address: form.address.trim(),
        officeAttendanceEnabled:
          form.officeAttendanceEnabled,
      });

      const settings = response.data.settings;

      setForm({
        latitude:
          settings.officeLocation.latitude,
        longitude:
          settings.officeLocation.longitude,
        radius:
          settings.officeLocation.radius,
        address:
          settings.officeLocation.address || "",
        officeAttendanceEnabled:
          settings.officeAttendanceEnabled,
      });

      setMessage(
        response.data.message ||
          "Office settings updated successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update office settings."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          Loading company settings...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <span className="settings-eyebrow">
            ADMIN SETTINGS
          </span>

          <h1>Company Settings</h1>

          <p>
            Configure your office location and attendance
            rules.
          </p>
        </div>
      </div>

      {message && (
        <div className="settings-alert settings-success">
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="settings-alert settings-error">
          <span>!</span>
          <span>{error}</span>
        </div>
      )}

      <form
        className="settings-card"
        onSubmit={handleSubmit}
      >
        {/* OFFICE LOCATION */}
        <div className="settings-card-header">
          <div className="settings-icon">📍</div>

          <div>
            <h2>Office Location</h2>

            <p>
              Automatically detect the office location or
              enter the coordinates manually.
            </p>
          </div>
        </div>

        <div className="settings-divider" />

        {/* LOCATION BUTTON */}
        <div className="location-detect-area">
          <div>
            <h3>Automatically Detect Location</h3>

            <p>
              Use your device's GPS/location to fill the
              latitude and longitude automatically.
            </p>
          </div>

          <button
            type="button"
            className="detect-location-btn"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <>
                <span className="location-spinner" />
                Detecting...
              </>
            ) : (
              <>
                📍 Use Current Location
              </>
            )}
          </button>
        </div>

        <div className="location-or">
          <span>OR EDIT MANUALLY</span>
        </div>

        {/* MANUAL LOCATION */}
        <div className="settings-grid">
          <div className="settings-field">
            <label htmlFor="latitude">
              Latitude
            </label>

            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={handleChange}
              placeholder="Example: 11.016800"
            />

            <span className="settings-help">
              Range: -90 to 90
            </span>
          </div>

          <div className="settings-field">
            <label htmlFor="longitude">
              Longitude
            </label>

            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={handleChange}
              placeholder="Example: 76.955800"
            />

            <span className="settings-help">
              Range: -180 to 180
            </span>
          </div>

          <div className="settings-field settings-field-full">
            <label htmlFor="address">
              Office Address
            </label>

            <textarea
              id="address"
              name="address"
              rows="3"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your complete office address"
            />
          </div>
        </div>

        {/* RADIUS */}
        <div className="settings-section">
          <div className="settings-section-title">
            <span>🎯</span>

            <div>
              <h3>Attendance Radius</h3>

              <p>
                Employees must be within this distance from
                the office to check in.
              </p>
            </div>
          </div>

          <div className="radius-input-wrapper">
            <input
              name="radius"
              type="number"
              min="1"
              step="1"
              value={form.radius}
              onChange={handleChange}
              placeholder="100"
            />

            <span>meters</span>
          </div>

          <div className="radius-info">
            <span>💡</span>

            <p>
              Example: <strong>100 meters</strong> means an
              employee must be within 100m of the configured
              office location.
            </p>
          </div>
        </div>

        {/* OFFICE ATTENDANCE */}
        <div className="settings-section attendance-toggle-section">
          <div className="settings-section-title">
            <span>🛡️</span>

            <div>
              <h3>Office Attendance</h3>

              <p>
                Enable or disable GPS-based office
                attendance.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={`settings-toggle ${
              form.officeAttendanceEnabled
                ? "active"
                : ""
            }`}
            onClick={handleToggle}
            aria-pressed={
              form.officeAttendanceEnabled
            }
          >
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>

            <span className="toggle-text">
              {form.officeAttendanceEnabled
                ? "Enabled"
                : "Disabled"}
            </span>
          </button>
        </div>

        {/* SAVE */}
        <div className="settings-footer">
          <button
            type="submit"
            className="settings-save-btn"
            disabled={saving}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <span>✓</span>
                Save Office Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;