import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./MyAttendance.css";

/* =========================================================
   MY ATTENDANCE
   CloudMatrix Attendance System

   IMPORTANT:
   - Existing UI structure preserved
   - Existing Work Report logic preserved
   - Existing API endpoints preserved
   - Laptop GPS continues to work
   - Mobile GPS gets better fallback handling
   ========================================================= */

/* =========================================================
   DATE HELPERS
   ========================================================= */

const getDateKey = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDay = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
  });
};

const formatShortDay = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
  });
};

const formatTime = (dateValue) => {
  if (!dateValue) return "--:--";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatLongDate = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/* =========================================================
   STATUS HELPERS
   ========================================================= */

const formatStatus = (status) => {
  if (!status) return "Unknown";

  const normalized = String(status).toUpperCase();

  const statusMap = {
    PRESENT: "Present",
    ABSENT: "Absent",
    LEAVE: "On Leave",
    ON_LEAVE: "On Leave",
    HOLIDAY: "Holiday",
    WEEKEND: "Weekend",
    MISSED_CHECKOUT: "Missed Checkout",
    HALF_DAY: "Half Day",
    OVERTIME: "Overtime",
  };

  return statusMap[normalized] || status.replaceAll("_", " ");
};

const getStatusClass = (status) => {
  if (!status) return "unknown";

  const normalized = String(status).toLowerCase();

  if (normalized.includes("present")) return "present";
  if (normalized.includes("absent")) return "absent";
  if (normalized.includes("leave")) return "leave";
  if (normalized.includes("holiday")) return "holiday";
  if (normalized.includes("weekend")) return "weekend";
  if (normalized.includes("missed")) return "missed";
  if (normalized.includes("half")) return "half-day";
  if (normalized.includes("overtime")) return "overtime";

  return "unknown";
};

/* =========================================================
   ATTENDANCE METHOD HELPERS
   ========================================================= */

const getAttendanceMethod = (record) => {
  if (!record) return null;

  return (
    record.method ||
    record.attendanceMethod ||
    record.checkIn?.method ||
    record.checkOut?.method ||
    null
  );
};

const formatMethod = (method) => {
  if (!method) return "-";

  const normalized = String(method).toUpperCase();

  const methodMap = {
    OFFICE: "Office",
    REMOTE: "Remote",
    FIELD: "Field",
  };

  return methodMap[normalized] || method.replaceAll("_", " ");
};

const getMethodIcon = (method) => {
  if (!method) return "•";

  const normalized = String(method).toUpperCase();

  if (normalized === "OFFICE") return "⌂";
  if (normalized === "REMOTE") return "⌁";
  if (normalized === "FIELD") return "◉";

  return "•";
};

/* =========================================================
   WORKING TIME
   ========================================================= */

const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return "0 min";

  const totalMinutes = Math.max(0, Number(minutes) || 0);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) return `${mins} min`;

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
};

/* =========================================================
   GPS ERROR MESSAGE
   ========================================================= */

const getGpsErrorMessage = (error) => {
  if (!error) {
    return "Unable to get your location. Please try again.";
  }

  if (error.code === "GPS_ACCURACY_LOW") {
    return (
      error.message ||
      "Your GPS accuracy is too low. Please move outside or near a window and try again."
    );
  }

  if (error.code === 1) {
    return "Location permission was denied. Please allow location access for this website and try again.";
  }

  if (error.code === 2) {
    return "Your device could not determine your location. Turn ON GPS/Location and try again.";
  }

  if (error.code === 3) {
    return "Location request timed out. Please turn ON GPS/Location and try again.";
  }

  if (error.code === "NOT_SECURE") {
    return error.message;
  }

  if (error.message) {
    return error.message;
  }

  return "Unable to get your location. Please try again.";
};

/* =========================================================
   GPS HELPER
   MOBILE GPS FIX ONLY
   ========================================================= */

const getBestLocation = () => {
  return new Promise((resolve, reject) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      reject({
        code: "GEOLOCATION_NOT_SUPPORTED",
        message:
          "Geolocation is not supported by this browser.",
      });
      return;
    }

    /*
     * Browser security check.
     *
     * Do not silently continue when the browser itself blocks
     * geolocation because the page is not secure.
     *
     * localhost is allowed by browsers, but a phone opening
     * the PC using an IP address such as:
     *
     * http://192.168.x.x:5173
     *
     * is normally not considered a secure context.
     */
    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false
    ) {
      reject({
        code: "NOT_SECURE",
        message:
          "Location access requires HTTPS on your phone. Open this application using HTTPS and allow location access.",
      });
      return;
    }

    let finished = false;
    let watchId = null;
    let timeoutId = null;
    let firstRequestFinished = false;

    const positions = [];

    /* -------------------------------------------------------
       CLEANUP
       ------------------------------------------------------- */

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    /* -------------------------------------------------------
       SUCCESS
       ------------------------------------------------------- */

    const finishSuccess = (position) => {
      if (finished) return;

      if (!position?.coords) {
        return;
      }

      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(accuracy)
      ) {
        return;
      }

      /*
       * Keep backend's 50m requirement.
       */
      if (accuracy > 50) {
        return;
      }

      finished = true;
      cleanup();

      resolve({
        latitude,
        longitude,
        accuracy,
      });
    };

    /* -------------------------------------------------------
       ERROR
       ------------------------------------------------------- */

    const finishError = (error) => {
      if (finished) return;

      finished = true;
      cleanup();

      reject(error);
    };

    /* -------------------------------------------------------
       BEST POSITION
       ------------------------------------------------------- */

    const selectBestPosition = () => {
      if (!positions.length) {
        finishError({
          code: 3,
          message:
            "Unable to get your location. Please turn ON GPS/Location and try again.",
        });

        return;
      }

      const validPositions = positions.filter((position) => {
        if (!position?.coords) return false;

        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy);

        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          Number.isFinite(accuracy)
        );
      });

      if (!validPositions.length) {
        finishError({
          code: "GPS_ACCURACY_LOW",
          message:
            "Unable to determine a valid GPS location. Please try again.",
        });

        return;
      }

      const bestPosition = validPositions.reduce(
        (best, current) => {
          if (!best) return current;

          return Number(current.coords.accuracy) <
            Number(best.coords.accuracy)
            ? current
            : best;
        },
        null
      );

      const accuracy = Number(
        bestPosition.coords.accuracy
      );

      /*
       * Backend requires maximum accuracy of 50m.
       */
      if (accuracy > 50) {
        finishError({
          code: "GPS_ACCURACY_LOW",
          accuracy,
          message: `GPS accuracy is about ${Math.round(
            accuracy
          )}m. Please move outside or near a window, keep Location/GPS ON, and try again.`,
        });

        return;
      }

      finishSuccess(bestPosition);
    };

    /* =======================================================
       MOBILE FIX
       First request current location.
       ======================================================= */

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (finished) return;

        firstRequestFinished = true;

        positions.push(position);

        const accuracy = Number(
          position?.coords?.accuracy
        );

        console.log("GPS current position:", {
          latitude: position?.coords?.latitude,
          longitude: position?.coords?.longitude,
          accuracy,
        });

        /*
         * If mobile immediately gives a good GPS reading,
         * use it immediately.
         */
        if (
          Number.isFinite(accuracy) &&
          accuracy <= 50
        ) {
          finishSuccess(position);
        }
      },
      (error) => {
        if (finished) return;

        firstRequestFinished = true;

        console.error(
          "GPS current position error:",
          error
        );

        /*
         * Permission denied cannot be fixed by watchPosition.
         */
        if (error?.code === 1) {
          finishError(error);
        }

        /*
         * For timeout / unavailable location, continue with
         * watchPosition because mobile GPS may still recover.
         */
      },
      {
        enableHighAccuracy: true,

        /*
         * Do not use an old cached position.
         */
        maximumAge: 0,

        /*
         * Mobile devices sometimes need longer to wake GPS.
         */
        timeout: 20000,
      }
    );

    /* =======================================================
       MOBILE FIX
       Watch position continuously.

       This gives Android/iPhone GPS time to improve from:
       100m -> 70m -> 45m

       We only accept <= 50m.
       ======================================================= */

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (finished) return;

        positions.push(position);

        /*
         * Keep memory small.
         */
        if (positions.length > 10) {
          positions.shift();
        }

        const latitude = Number(
          position?.coords?.latitude
        );

        const longitude = Number(
          position?.coords?.longitude
        );

        const accuracy = Number(
          position?.coords?.accuracy
        );

        console.log("GPS watch reading:", {
          latitude,
          longitude,
          accuracy,
          readingNumber: positions.length,
        });

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          !Number.isFinite(accuracy)
        ) {
          return;
        }

        /*
         * The moment a valid <=50m reading is received,
         * finish immediately.
         */
        if (accuracy <= 50) {
          finishSuccess(position);
          return;
        }

        /*
         * Do not fail after 5 readings.
         *
         * Mobile GPS may initially return:
         * 100m
         * 90m
         * 75m
         * 62m
         * 55m
         *
         * It may become <=50m after additional readings.
         */
      },
      (error) => {
        if (finished) return;

        console.error("GPS watch error:", error);

        /*
         * Permission denied is final.
         */
        if (error?.code === 1) {
          finishError(error);
        }

        /*
         * Error 2 / 3:
         *
         * Do not immediately reject.
         * The currentPosition request or another GPS
         * reading may still succeed.
         */
      },
      {
        enableHighAccuracy: true,

        /*
         * Force fresh GPS/network reading.
         */
        maximumAge: 0,

        /*
         * Give each mobile GPS reading enough time.
         */
        timeout: 20000,
      }
    );

    /* =======================================================
       FINAL TIMEOUT
       ======================================================= */

    timeoutId = setTimeout(() => {
      if (finished) return;

      /*
       * At this point choose the best reading we received.
       *
       * If it is <=50m -> success.
       *
       * If it is >50m -> GPS_ACCURACY_LOW.
       */
      selectBestPosition();
    }, 45000);
  });
};

/* =========================================================
   COMPONENT
   ========================================================= */

const MyAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 8;

  const [showWorkReport, setShowWorkReport] = useState(false);
  const [workDescription, setWorkDescription] = useState("");
  const [workReportLoading, setWorkReportLoading] = useState(false);
  const [workReportExists, setWorkReportExists] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  /* =========================================================
     TODAY
     ========================================================= */

  const todayKey = getDateKey(new Date());

  const todayAttendance =
    attendance.find((record) => getDateKey(record.date) === todayKey) || null;

  /*
   * Backend can create today's attendance record before actual
   * check-in. Therefore checkIn.time is the actual indicator.
   */
  const hasCheckedIn = !!todayAttendance?.checkIn?.time;

  const hasCheckedOut = !!todayAttendance?.checkOut?.time;

  const isCheckedIn = hasCheckedIn && !hasCheckedOut;

  const isCheckedOut = hasCheckedIn && hasCheckedOut;

  /* =========================================================
     LIVE WORKING TIME
     ========================================================= */

  const liveWorkingMinutes = useMemo(() => {
    if (!todayAttendance?.checkIn?.time) {
      return todayAttendance?.workingMinutes || 0;
    }

    if (todayAttendance?.checkOut?.time) {
      return todayAttendance?.workingMinutes || 0;
    }

    const checkInTime = new Date(todayAttendance.checkIn.time).getTime();

    if (Number.isNaN(checkInTime)) return 0;

    const now = currentTime.getTime();

    return Math.max(0, Math.floor((now - checkInTime) / 60000));
  }, [todayAttendance, currentTime]);

  /* =========================================================
     MESSAGE
     ========================================================= */

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  /* =========================================================
     FETCH ATTENDANCE
     ========================================================= */

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const response = await api.get("/attendance/my");

      if (response?.data?.attendance) {
        setAttendance(response.data.attendance);
      } else if (response?.data?.records) {
        setAttendance(response.data.records);
      } else if (Array.isArray(response?.data)) {
        setAttendance(response.data);
      } else {
        setAttendance([]);
      }
    } catch (error) {
      console.error("Fetch attendance error:", error);

      showMessage(
        error?.response?.data?.message ||
          "Unable to load attendance records.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FETCH TODAY WORK REPORT
     ========================================================= */

  const fetchTodayWorkReport = async () => {
    try {
      const response = await api.get("/work-reports/my");

      const report =
        response?.data?.workReport ||
        response?.data?.report ||
        response?.data?.data ||
        null;

      if (report) {
        setWorkReportExists(true);
        setWorkDescription(report.description || "");
        return report;
      }

      setWorkReportExists(false);
      setWorkDescription("");

      return null;
    } catch (error) {
      /*
       * 404 means employee has not created today's report.
       */
      if (error?.response?.status === 404) {
        setWorkReportExists(false);
        setWorkDescription("");
        return null;
      }

      console.error("Fetch work report error:", error);

      return null;
    }
  };

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    fetchAttendance();
    fetchTodayWorkReport();
  }, []);

  /* =========================================================
     LIVE CLOCK
     ========================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =========================================================
     CHECK-IN
     ========================================================= */

  const handleCheckIn = async () => {
    if (actionLoading) return;

    if (!navigator.geolocation) {
      showMessage(
        "Your browser does not support location services.",
        "error"
      );
      return;
    }

    try {
      setActionLoading(true);

      showMessage(
        "Getting your accurate location... Please wait.",
        "info"
      );

      const position = await getBestLocation();

      const { latitude, longitude, accuracy } = position;

      console.log("Check-in GPS:", {
        latitude,
        longitude,
        accuracy,
      });

      const response = await api.post("/attendance/check-in", {
        latitude,
        longitude,
        accuracy,
      });

      showMessage(
        response?.data?.message || "Check-in successful",
        "success"
      );

      await fetchAttendance();
    } catch (error) {
      console.error("Check-in error:", error);

      const gpsError = error;

      if (
        gpsError?.code === "GPS_ACCURACY_LOW" ||
        gpsError?.code === "NOT_SECURE" ||
        gpsError?.code === 1 ||
        gpsError?.code === 2 ||
        gpsError?.code === 3
      ) {
        showMessage(getGpsErrorMessage(gpsError), "error");
      } else {
        showMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Check-in failed. Please try again.",
          "error"
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     CHECK-OUT CLICK
     ========================================================= */

  const handleCheckOutClick = async () => {
    if (actionLoading) return;

    if (!isCheckedIn || isCheckedOut) {
      return;
    }

    try {
      setActionLoading(true);

      const report = await fetchTodayWorkReport();

      if (report) {
        setWorkReportExists(true);
        setWorkDescription(report.description || "");
      } else {
        setWorkReportExists(false);
        setWorkDescription("");
      }

      setShowWorkReport(true);
    } catch (error) {
      console.error("Checkout preparation error:", error);

      showMessage(
        "Unable to prepare checkout. Please try again.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     WORK REPORT + CHECK-OUT
     ========================================================= */

  const handleWorkReportAndCheckOut = async () => {
    const description = workDescription.trim();

    if (!description) {
      showMessage("Please enter your work report.", "error");
      return;
    }

    if (description.length < 10) {
      showMessage(
        "Work report should contain at least 10 characters.",
        "error"
      );
      return;
    }

    if (!navigator.geolocation) {
      showMessage(
        "Your browser does not support location services.",
        "error"
      );
      return;
    }

    try {
      setWorkReportLoading(true);

      /*
       * Save/update work report FIRST.
       */
      if (workReportExists) {
        await api.put("/work-reports/my", {
          description,
        });
      } else {
        await api.post("/work-reports", {
          description,
        });
      }

      setWorkReportExists(true);

      showMessage(
        "Work report saved. Getting your location...",
        "info"
      );

      /*
       * Get GPS AFTER work report is saved.
       */
      const position = await getBestLocation();

      const { latitude, longitude, accuracy } = position;

      console.log("Check-out GPS:", {
        latitude,
        longitude,
        accuracy,
      });

      /*
       * Existing backend endpoint preserved.
       */
      const response = await api.post("/attendance/check-out", {
        latitude,
        longitude,
        accuracy,
      });

      showMessage(
        response?.data?.message || "Check-out successful",
        "success"
      );

      setShowWorkReport(false);
      setWorkDescription("");

      await fetchAttendance();
      await fetchTodayWorkReport();
    } catch (error) {
      console.error("Check-out error:", error);

      const gpsError = error;

      if (
        gpsError?.code === "GPS_ACCURACY_LOW" ||
        gpsError?.code === "NOT_SECURE" ||
        gpsError?.code === 1 ||
        gpsError?.code === 2 ||
        gpsError?.code === 3
      ) {
        showMessage(getGpsErrorMessage(gpsError), "error");
      } else {
        showMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Check-out failed. Please try again.",
          "error"
        );
      }
    } finally {
      setWorkReportLoading(false);
    }
  };

  /* =========================================================
     FILTERING
     ========================================================= */

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const status = String(record?.status || "").toUpperCase();
      const method = String(
        getAttendanceMethod(record) || ""
      ).toUpperCase();

      const statusMatches =
        statusFilter === "ALL" || status === statusFilter;

      const methodMatches =
        methodFilter === "ALL" || method === methodFilter;

      return statusMatches && methodMatches;
    });
  }, [attendance, statusFilter, methodFilter]);

  /* =========================================================
     PAGINATION
     ========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttendance.length / recordsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedAttendance = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * recordsPerPage;

    return filteredAttendance.slice(
      startIndex,
      startIndex + recordsPerPage
    );
  }, [filteredAttendance, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, methodFilter]);

  /* =========================================================
     CLEAR FILTERS
     ========================================================= */

  const clearFilters = () => {
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setCurrentPage(1);
  };

  /* =========================================================
     CLOSE WORK REPORT MODAL
     ========================================================= */

  const closeWorkReportModal = () => {
    if (workReportLoading) return;

    setShowWorkReport(false);
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="my-attendance-page">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="attendance-page-header">
        <div>
          <div className="attendance-eyebrow">ATTENDANCE</div>

          <h1>My Attendance</h1>

          <p>
            Track your daily attendance, working hours and
            attendance history.
          </p>
        </div>

        <div className="attendance-current-date">
          <span className="current-date-label">TODAY</span>

          <strong>{formatLongDate(currentTime)}</strong>

          <span>
            {currentTime.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </span>
        </div>
      </div>

      {/* =====================================================
          MESSAGE
          ===================================================== */}

      {message && (
        <div className={`attendance-message ${messageType}`}>
          <span className="message-icon">
            {messageType === "error"
              ? "!"
              : messageType === "info"
              ? "i"
              : "✓"}
          </span>

          <span>{message}</span>
        </div>
      )}

      {/* =====================================================
          TODAY ATTENDANCE
          ===================================================== */}

      <section className="today-attendance-card">
        <div className="today-attendance-header">
          <div>
            <span className="today-section-label">
              TODAY'S ATTENDANCE
            </span>

            <h2>{formatDate(currentTime)}</h2>
          </div>

          <div
            className={`today-status-badge ${
              todayAttendance
                ? getStatusClass(todayAttendance.status)
                : "pending"
            }`}
          >
            <span className="status-dot"></span>

            {todayAttendance?.status
              ? formatStatus(todayAttendance.status)
              : "Not Checked In"}
          </div>
        </div>

        <div className="today-attendance-body">
          <div className="today-time-grid">
            <div className="today-time-item">
              <span className="today-time-label">CHECK IN</span>

              <strong>
                {todayAttendance?.checkIn?.time
                  ? formatTime(todayAttendance.checkIn.time)
                  : "--:--"}
              </strong>
            </div>

            <div className="today-time-item">
              <span className="today-time-label">CHECK OUT</span>

              <strong>
                {todayAttendance?.checkOut?.time
                  ? formatTime(todayAttendance.checkOut.time)
                  : "--:--"}
              </strong>
            </div>

            <div className="today-time-item">
              <span className="today-time-label">WORKING TIME</span>

              <strong>
                {formatMinutes(liveWorkingMinutes)}
              </strong>
            </div>

            <div className="today-time-item">
              <span className="today-time-label">METHOD</span>

              <strong className="method-value">
                {getMethodIcon(
                  getAttendanceMethod(todayAttendance)
                )}

                {formatMethod(
                  getAttendanceMethod(todayAttendance)
                )}
              </strong>
            </div>
          </div>

          <div className="today-attendance-actions">
            {!hasCheckedIn && (
              <button
                type="button"
                className="check-in-button"
                onClick={handleCheckIn}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Getting Location...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Check In
                  </>
                )}
              </button>
            )}

            {isCheckedIn && (
              <button
                type="button"
                className="check-out-button"
                onClick={handleCheckOutClick}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Please Wait...
                  </>
                ) : (
                  <>
                    <span>↗</span>
                    Check Out
                  </>
                )}
              </button>
            )}

            {isCheckedOut && (
              <div className="checked-out-message">
                <span>✓</span>
                Attendance completed for today
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          FILTERS
          ===================================================== */}

      <section className="attendance-filters-card">
        <div className="attendance-filters-header">
          <div>
            <span className="attendance-section-label">
              ATTENDANCE HISTORY
            </span>

            <h2>Attendance Records</h2>
          </div>

          <span className="attendance-count">
            {filteredAttendance.length} record
            {filteredAttendance.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="attendance-filters">
          <div className="filter-group">
            <label htmlFor="status-filter">Status</label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">Leave</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="WEEKEND">Weekend</option>
              <option value="MISSED_CHECKOUT">
                Missed Checkout
              </option>
              <option value="HALF_DAY">Half Day</option>
              <option value="OVERTIME">Overtime</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="method-filter">Method</label>

            <select
              id="method-filter"
              value={methodFilter}
              onChange={(event) =>
                setMethodFilter(event.target.value)
              }
            >
              <option value="ALL">All Methods</option>
              <option value="OFFICE">Office</option>
              <option value="REMOTE">Remote</option>
              <option value="FIELD">Field</option>
            </select>
          </div>

          <button
            type="button"
            className="clear-filters-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* =====================================================
          LOADING
          ===================================================== */}

      {loading && (
        <div className="attendance-loading">
          <span className="loading-spinner"></span>
          <span>Loading attendance...</span>
        </div>
      )}

      {/* =====================================================
          EMPTY
          ===================================================== */}

      {!loading && filteredAttendance.length === 0 && (
        <div className="empty-attendance">
          <div className="empty-attendance-icon">◎</div>

          <h3>No attendance records found</h3>

          <p>
            There are no attendance records matching the
            selected filters.
          </p>

          {(statusFilter !== "ALL" || methodFilter !== "ALL") && (
            <button
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* =====================================================
          RECORD LIST
          ===================================================== */}

      {!loading && paginatedAttendance.length > 0 && (
        <div className="attendance-record-list">
          {paginatedAttendance.map((record, index) => {
            const recordStatus = record?.status || "UNKNOWN";
            const recordMethod = getAttendanceMethod(record);

            return (
              <article
                className="attendance-record"
                key={record?._id || record?.id || index}
              >
                <div className="record-date">
                  <strong>
                    {formatDate(record.date)}
                  </strong>

                  <span>
                    {formatShortDay(record.date)}
                  </span>
                </div>

                <div className="record-status">
                  <span
                    className={`record-status-badge ${getStatusClass(
                      recordStatus
                    )}`}
                  >
                    {formatStatus(recordStatus)}
                  </span>
                </div>

                <div className="record-time">
                  <div>
                    <span>IN</span>

                    <strong>
                      {record?.checkIn?.time
                        ? formatTime(record.checkIn.time)
                        : "--:--"}
                    </strong>
                  </div>

                  <div>
                    <span>OUT</span>

                    <strong>
                      {record?.checkOut?.time
                        ? formatTime(record.checkOut.time)
                        : "--:--"}
                    </strong>
                  </div>
                </div>

                <div className="record-duration">
                  <span>WORKING</span>

                  <strong>
                    {formatMinutes(
                      record?.workingMinutes || 0
                    )}
                  </strong>
                </div>

                <div className="record-method">
                  <span>
                    {getMethodIcon(recordMethod)}
                  </span>

                  <strong>
                    {formatMethod(recordMethod)}
                  </strong>

                  {record?.isOvertime && (
                    <small>Overtime</small>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================
          PAGINATION
          ===================================================== */}

      {!loading && filteredAttendance.length > recordsPerPage && (
        <div className="attendance-pagination">
          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.max(1, page - 1))
            }
            disabled={safeCurrentPage === 1}
          >
            ← Previous
          </button>

          <div className="pagination-pages">
            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (
              <button
                type="button"
                key={page}
                className={
                  page === safeCurrentPage ? "active" : ""
                }
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, page + 1)
              )
            }
            disabled={safeCurrentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* =====================================================
          WORK REPORT MODAL
          ===================================================== */}

      {showWorkReport && (
        <div
          className="work-report-modal-overlay"
          onClick={closeWorkReportModal}
        >
          <div
            className="work-report-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">
                  CHECK OUT
                </span>

                <h2>Today's Work Report</h2>

                <p>
                  Please describe the work you completed today
                  before checking out.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeWorkReportModal}
                disabled={workReportLoading}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label htmlFor="work-description">
                Work Description
              </label>

              <textarea
                id="work-description"
                value={workDescription}
                onChange={(event) =>
                  setWorkDescription(event.target.value)
                }
                placeholder="Example: Completed attendance frontend, fixed mobile GPS issue and tested check-in/check-out..."
                rows={7}
                disabled={workReportLoading}
              />

              <div className="work-report-helper">
                <span>Minimum 10 characters</span>

                <span>
                  {workDescription.trim().length} characters
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeWorkReportModal}
                disabled={workReportLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-checkout-button"
                onClick={handleWorkReportAndCheckOut}
                disabled={workReportLoading}
              >
                {workReportLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Save Report & Check Out
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAttendance;