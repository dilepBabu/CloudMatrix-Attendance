import { useEffect, useMemo, useState } from "react";

import api from "../../services/api";

import "./MyAttendance.css";

/* =========================================================
   MY ATTENDANCE
   CloudMatrix Attendance System

   GPS DEBUG VERSION:
   - High accuracy location first
   - Multiple GPS readings
   - Keeps the most accurate reading
   - Normal browser location fallback
   - Uses watchPosition() to improve mobile accuracy
   - Frontend GPS accuracy limit = 300m
   - Backend performs actual office-radius validation
   - Shows GPS information directly on screen
   - Shows backend distance/radius when available

   EXISTING LOGIC PRESERVED:
   - Existing UI
   - Work report
   - Check-in API
   - Check-out API
   - Attendance history
   - Pagination
   - Filters
   - Night-shift backend compatibility
   ========================================================= */


/* =========================================================
   DATE HELPERS
   ========================================================= */

const getDateKey = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
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
    UPCOMING: "Upcoming",
  };

  return (
    statusMap[normalized] ||
    String(status).replaceAll("_", " ")
  );
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
  if (normalized.includes("upcoming")) return "upcoming";

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

  return (
    methodMap[normalized] ||
    String(method).replaceAll("_", " ")
  );
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
  if (
    minutes === null ||
    minutes === undefined
  ) {
    return "0 min";
  }

  const totalMinutes = Math.max(
    0,
    Number(minutes) || 0
  );

  const hours = Math.floor(
    totalMinutes / 60
  );

  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }

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
      "GPS accuracy is too low. Please move outside or near a window and try again."
    );
  }

  if (error.code === "GEOLOCATION_NOT_SUPPORTED") {
    return (
      "Location services are not supported by this browser."
    );
  }

  if (error.code === 1) {
    return (
      "Location permission was denied. Please allow location access for this website and try again."
    );
  }

  if (error.code === 2) {
    return (
      "Your device could not determine your location. Turn ON GPS/Location and try again."
    );
  }

  if (error.code === 3) {
    return (
      "Location request timed out. Please turn ON GPS/Location and try again."
    );
  }

  if (error.message) {
    return error.message;
  }

  return "Unable to get your location. Please try again.";
};


/* =========================================================
   GPS CONFIGURATION
   ========================================================= */

const MAX_GPS_ACCURACY = 300;


/* =========================================================
   GPS HELPER
   =========================================================

   GPS STRATEGY:

   1. Start high-accuracy location.
   2. Collect multiple location readings.
   3. Keep the reading with the best accuracy.
   4. If accuracy <= 50m, finish immediately.
   5. If high accuracy does not provide a good result,
      start normal browser location fallback.
   6. After 30 seconds, use the best reading if accuracy
      is <= 300m.
   7. Otherwise return GPS_ACCURACY_LOW.

   DEBUG:
   - onGpsUpdate callback sends every useful reading
     to the React component.
   ========================================================= */

const getBestLocation = (onGpsUpdate) => {
  return new Promise((resolve, reject) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      reject({
        code: "GEOLOCATION_NOT_SUPPORTED",
        message:
          "Location services are not supported by this browser.",
      });

      return;
    }

    let finished = false;

    let bestPosition = null;

    let highAccuracyWatchId = null;

    let fallbackWatchId = null;

    let highAccuracyTimeout = null;

    let finalTimeout = null;


    /* =====================================================
       CLEANUP
       ===================================================== */

    const cleanup = () => {
      if (
        highAccuracyWatchId !== null
      ) {
        navigator.geolocation.clearWatch(
          highAccuracyWatchId
        );

        highAccuracyWatchId = null;
      }

      if (
        fallbackWatchId !== null
      ) {
        navigator.geolocation.clearWatch(
          fallbackWatchId
        );

        fallbackWatchId = null;
      }

      if (
        highAccuracyTimeout !== null
      ) {
        clearTimeout(
          highAccuracyTimeout
        );

        highAccuracyTimeout = null;
      }

      if (
        finalTimeout !== null
      ) {
        clearTimeout(
          finalTimeout
        );

        finalTimeout = null;
      }
    };


    /* =====================================================
       FINISH WITH LOCATION
       ===================================================== */

    const finish = (position) => {
      if (finished) return;

      if (!position?.coords) {
        return;
      }

      const latitude =
        Number(
          position.coords.latitude
        );

      const longitude =
        Number(
          position.coords.longitude
        );

      const accuracy =
        Number(
          position.coords.accuracy
        );

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        ) ||
        !Number.isFinite(
          accuracy
        )
      ) {
        return;
      }

      if (
        accuracy >
        MAX_GPS_ACCURACY
      ) {
        return;
      }

      finished = true;

      cleanup();

      console.log(
        "FINAL GPS LOCATION:",
        {
          latitude,
          longitude,
          accuracy,
        }
      );

      if (onGpsUpdate) {
        onGpsUpdate({
          latitude,
          longitude,
          accuracy,
          source: "FINAL",
        });
      }

      resolve({
        latitude,
        longitude,
        accuracy,
      });
    };


    /* =====================================================
       FINISH USING BEST AVAILABLE LOCATION
       ===================================================== */

    const finishWithBestLocation = () => {
      if (finished) return;

      if (
        bestPosition
      ) {
        const accuracy =
          Number(
            bestPosition.coords
              .accuracy
          );

        if (
          Number.isFinite(
            accuracy
          ) &&
          accuracy <=
            MAX_GPS_ACCURACY
        ) {
          finish(
            bestPosition
          );

          return;
        }
      }

      cleanup();

      finished = true;

      reject({
        code:
          "GPS_ACCURACY_LOW",

        message:
          "Unable to get an accurate mobile location. Please turn ON GPS/Location, move near a window or outside, and try again.",
      });
    };


    /* =====================================================
       UPDATE BEST GPS READING
       ===================================================== */

    const updateBestPosition = (
      position
    ) => {
      if (finished) return;

      if (!position?.coords) {
        return;
      }

      const latitude =
        Number(
          position.coords.latitude
        );

      const longitude =
        Number(
          position.coords.longitude
        );

      const accuracy =
        Number(
          position.coords.accuracy
        );

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        ) ||
        !Number.isFinite(
          accuracy
        )
      ) {
        return;
      }

      console.log(
        "GPS READING:",
        {
          latitude,
          longitude,
          accuracy,
        }
      );


      /* ===================================================
         SHOW GPS READING ON SCREEN
         =================================================== */

      if (onGpsUpdate) {
        onGpsUpdate({
          latitude,
          longitude,
          accuracy,
          source:
            accuracy <= 50
              ? "HIGH ACCURACY"
              : "GPS READING",
        });
      }


      /* ===================================================
         KEEP MOST ACCURATE READING
         =================================================== */

      if (
        !bestPosition ||
        accuracy <
          Number(
            bestPosition.coords
              .accuracy
          )
      ) {
        bestPosition =
          position;

        console.log(
          "NEW BEST GPS READING:",
          {
            latitude,
            longitude,
            accuracy,
          }
        );

        if (onGpsUpdate) {
          onGpsUpdate({
            latitude,
            longitude,
            accuracy,
            source:
              "BEST READING",
          });
        }
      }


      /* ===================================================
         VERY GOOD LOCATION
         =================================================== */

      if (
        accuracy <= 50
      ) {
        finish(
          position
        );
      }
    };


    /* =====================================================
       NORMAL GPS FALLBACK
       ===================================================== */

    const startFallback = () => {
      if (finished) return;

      if (
        fallbackWatchId !== null
      ) {
        return;
      }

      console.log(
        "STARTING NORMAL MOBILE GPS FALLBACK..."
      );

      if (onGpsUpdate) {
        onGpsUpdate((previous) => ({
          ...previous,
          source:
            "NORMAL GPS FALLBACK",
        }));
      }

      fallbackWatchId =
        navigator.geolocation.watchPosition(
          (position) => {
            updateBestPosition(
              position
            );
          },

          (error) => {
            console.error(
              "NORMAL GPS ERROR:",
              error
            );
          },

          {
            enableHighAccuracy:
              false,

            maximumAge:
              10000,

            timeout:
              15000,
          }
        );
    };


    /* =====================================================
       HIGH ACCURACY GPS
       ===================================================== */

    console.log(
      "STARTING HIGH ACCURACY MOBILE GPS..."
    );

    if (onGpsUpdate) {
      onGpsUpdate({
        source:
          "STARTING HIGH ACCURACY GPS",
      });
    }

    highAccuracyWatchId =
      navigator.geolocation.watchPosition(
        (position) => {
          updateBestPosition(
            position
          );
        },

        (error) => {
          console.error(
            "HIGH ACCURACY GPS ERROR:",
            error
          );

          if (onGpsUpdate) {
            onGpsUpdate({
              source:
                "HIGH ACCURACY GPS ERROR",
              gpsError:
                error?.message ||
                "Unable to get high accuracy GPS",
            });
          }

          startFallback();
        },

        {
          enableHighAccuracy:
            true,

          maximumAge:
            0,

          timeout:
            10000,
        }
      );


    /* =====================================================
       START NORMAL FALLBACK AFTER 15 SECONDS
       ===================================================== */

    highAccuracyTimeout =
      setTimeout(() => {
        startFallback();
      }, 15000);


    /* =====================================================
       FINAL RESULT AFTER 30 SECONDS
       ===================================================== */

    finalTimeout =
      setTimeout(() => {
        finishWithBestLocation();
      }, 30000);
  });
};


/* =========================================================
   COMPONENT
   ========================================================= */

const MyAttendance = () => {
  const [attendance, setAttendance] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("success");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [methodFilter, setMethodFilter] =
    useState("ALL");

  const [currentPage, setCurrentPage] =
    useState(1);

  const recordsPerPage = 8;

  const [showWorkReport, setShowWorkReport] =
    useState(false);

  const [workDescription, setWorkDescription] =
    useState("");

  const [workReportLoading, setWorkReportLoading] =
    useState(false);

  const [workReportExists, setWorkReportExists] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(new Date());


  /* =========================================================
     GPS DEBUG STATE
     ========================================================= */

  const [gpsDebug, setGpsDebug] =
    useState(null);


  /* =========================================================
     TODAY
     ========================================================= */

  const todayKey =
    getDateKey(new Date());

  const todayAttendance =
    attendance.find(
      (record) =>
        getDateKey(record.date) ===
        todayKey
    ) || null;


  /*
   * Backend can create today's attendance
   * record before actual check-in.
   *
   * Therefore checkIn.time is the actual
   * indicator.
   */

  const hasCheckedIn =
    !!todayAttendance?.checkIn?.time;

  const hasCheckedOut =
    !!todayAttendance?.checkOut?.time;

  const isCheckedIn =
    hasCheckedIn &&
    !hasCheckedOut;

  const isCheckedOut =
    hasCheckedIn &&
    hasCheckedOut;


  /* =========================================================
     LIVE WORKING TIME
     ========================================================= */

  const liveWorkingMinutes =
    useMemo(() => {
      if (
        !todayAttendance?.checkIn?.time
      ) {
        return (
          todayAttendance?.workingMinutes ||
          0
        );
      }

      if (
        todayAttendance?.checkOut?.time
      ) {
        return (
          todayAttendance?.workingMinutes ||
          0
        );
      }

      const checkInTime =
        new Date(
          todayAttendance.checkIn.time
        ).getTime();

      if (
        Number.isNaN(
          checkInTime
        )
      ) {
        return 0;
      }

      const now =
        currentTime.getTime();

      return Math.max(
        0,
        Math.floor(
          (now - checkInTime) /
            60000
        )
      );
    }, [
      todayAttendance,
      currentTime,
    ]);


  /* =========================================================
     MESSAGE
     ========================================================= */

  const showMessage = (
    text,
    type = "success"
  ) => {
    setMessage(text);

    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 4000);
  };


  /* =========================================================
     FETCH ATTENDANCE
     ========================================================= */

  const fetchAttendance =
    async () => {
      try {
        setLoading(true);

        const response =
          await api.get(
            "/attendance/my"
          );

        if (
          response?.data?.attendance
        ) {
          setAttendance(
            response.data.attendance
          );
        } else if (
          response?.data?.records
        ) {
          setAttendance(
            response.data.records
          );
        } else if (
          Array.isArray(
            response?.data
          )
        ) {
          setAttendance(
            response.data
          );
        } else {
          setAttendance([]);
        }
      } catch (error) {
        console.error(
          "Fetch attendance error:",
          error
        );

        showMessage(
          error?.response?.data
            ?.message ||
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

  const fetchTodayWorkReport =
    async () => {
      try {
        const response =
          await api.get(
            "/work-reports/my"
          );

        const report =
          response?.data
            ?.workReport ||
          response?.data?.report ||
          response?.data?.data ||
          null;

        if (report) {
          setWorkReportExists(
            true
          );

          setWorkDescription(
            report.description ||
              ""
          );

          return report;
        }

        setWorkReportExists(
          false
        );

        setWorkDescription("");

        return null;
      } catch (error) {
        /*
         * 404 means no work report
         * has been created today.
         */

        if (
          error?.response
            ?.status === 404
        ) {
          setWorkReportExists(
            false
          );

          setWorkDescription("");

          return null;
        }

        console.error(
          "Fetch work report error:",
          error
        );

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
    const timer =
      setInterval(() => {
        setCurrentTime(
          new Date()
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, []);


  /* =========================================================
     CHECK-IN
     ========================================================= */

  const handleCheckIn =
    async () => {
      if (actionLoading) return;

      if (
        typeof navigator ===
          "undefined" ||
        !navigator.geolocation
      ) {
        showMessage(
          "Your browser does not support location services.",
          "error"
        );

        return;
      }

      try {
        setActionLoading(true);

        setMessage("");

        setGpsDebug({
          source:
            "REQUESTING MOBILE/LAPTOP GPS...",
        });

        showMessage(
          "Getting your location... Please allow location access if your browser asks.",
          "info"
        );

        console.log(
          "Starting check-in GPS..."
        );

        const position =
          await getBestLocation(
            (gps) => {
              if (
                typeof gps ===
                "function"
              ) {
                setGpsDebug(
                  gps
                );
              } else {
                setGpsDebug(
                  gps
                );
              }
            }
          );

        const latitude =
          Number(
            position.latitude
          );

        const longitude =
          Number(
            position.longitude
          );

        const accuracy =
          Number(
            position.accuracy
          );

        console.log(
          "CHECK-IN LOCATION READY:",
          {
            latitude,
            longitude,
            accuracy,
          }
        );

        setGpsDebug(
          (previous) => ({
            ...(previous || {}),
            latitude,
            longitude,
            accuracy,
            source:
              "LOCATION READY - SENDING TO BACKEND",
            result:
              "WAITING FOR BACKEND",
          })
        );

        if (
          !Number.isFinite(
            latitude
          ) ||
          !Number.isFinite(
            longitude
          ) ||
          !Number.isFinite(
            accuracy
          )
        ) {
          throw new Error(
            "Invalid location received from browser."
          );
        }

        if (
          accuracy >
          MAX_GPS_ACCURACY
        ) {
          throw {
            code:
              "GPS_ACCURACY_LOW",

            accuracy,

            message:
              `GPS accuracy is about ${Math.round(
                accuracy
              )}m. Please move near a window or outside and try again.`,
          };
        }

        showMessage(
          "Location found. Checking you in...",
          "info"
        );

        const response =
          await api.post(
            "/attendance/check-in",
            {
              latitude,
              longitude,
              accuracy,
            }
          );

        console.log(
          "CHECK-IN RESPONSE:",
          response?.data
        );

        setGpsDebug(
          (previous) => ({
            ...(previous || {}),
            latitude,
            longitude,
            accuracy,
            result:
              "INSIDE OFFICE / CHECK-IN ACCEPTED",
            backendDistance:
              response?.data
                ?.distance ??
              previous?.backendDistance,
            officeRadius:
              response?.data
                ?.allowedRadius ??
              previous?.officeRadius,
          })
        );

        showMessage(
          response?.data
            ?.message ||
            "Check-in successful",
          "success"
        );

        await fetchAttendance();
      } catch (error) {
        console.error(
          "CHECK-IN ERROR:",
          error
        );

        if (
          error?.code ===
            "GPS_ACCURACY_LOW" ||
          error?.code === 1 ||
          error?.code === 2 ||
          error?.code === 3 ||
          error?.code ===
            "GEOLOCATION_NOT_SUPPORTED"
        ) {
          showMessage(
            getGpsErrorMessage(
              error
            ),
            "error"
          );

          setGpsDebug(
            (previous) => ({
              ...(previous || {}),
              result:
                "GPS ERROR",
              gpsError:
                getGpsErrorMessage(
                  error
                ),
            })
          );

          return;
        }

        const backendMessage =
          error?.response
            ?.data?.message;

        if (backendMessage) {
          const backendData =
            error?.response
              ?.data;

          setGpsDebug(
            (previous) => ({
              ...(previous || {}),
              result:
                "BACKEND REJECTED LOCATION",
              backendMessage,
              backendDistance:
                backendData?.distance ??
                previous?.backendDistance,
              officeRadius:
                backendData?.allowedRadius ??
                previous?.officeRadius,
            })
          );

          showMessage(
            backendMessage,
            "error"
          );

          return;
        }

        setGpsDebug(
          (previous) => ({
            ...(previous || {}),
            result:
              "CHECK-IN FAILED",
            backendMessage:
              error?.message ||
              "Unknown error",
          })
        );

        showMessage(
          error?.message ||
            "Check-in failed. Please try again.",
          "error"
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };


  /* =========================================================
     CHECK-OUT CLICK
     ========================================================= */

  const handleCheckOutClick =
    async () => {
      if (actionLoading) return;

      if (
        !isCheckedIn ||
        isCheckedOut
      ) {
        return;
      }

      try {
        setActionLoading(true);

        const report =
          await fetchTodayWorkReport();

        if (report) {
          setWorkReportExists(
            true
          );

          setWorkDescription(
            report.description ||
              ""
          );
        } else {
          setWorkReportExists(
            false
          );

          setWorkDescription("");
        }

        setShowWorkReport(
          true
        );
      } catch (error) {
        console.error(
          "Checkout preparation error:",
          error
        );

        showMessage(
          "Unable to prepare checkout. Please try again.",
          "error"
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };


  /* =========================================================
     WORK REPORT + CHECK-OUT
     ========================================================= */

  const handleWorkReportAndCheckOut =
    async () => {
      const description =
        workDescription.trim();

      if (!description) {
        showMessage(
          "Please enter your work report.",
          "error"
        );

        return;
      }

      if (
        description.length < 10
      ) {
        showMessage(
          "Work report should contain at least 10 characters.",
          "error"
        );

        return;
      }

      if (
        typeof navigator ===
          "undefined" ||
        !navigator.geolocation
      ) {
        showMessage(
          "Your browser does not support location services.",
          "error"
        );

        return;
      }

      try {
        setWorkReportLoading(
          true
        );


        /* ===================================================
           SAVE / UPDATE WORK REPORT
           =================================================== */

        if (workReportExists) {
          await api.put(
            "/work-reports/my",
            {
              description,
            }
          );
        } else {
          await api.post(
            "/work-reports",
            {
              description,
            }
          );
        }

        setWorkReportExists(
          true
        );

        showMessage(
          "Work report saved. Getting your location...",
          "info"
        );


        /* ===================================================
           RESET GPS DEBUG
           =================================================== */

        setGpsDebug({
          source:
            "REQUESTING GPS FOR CHECK-OUT...",
        });


        /* ===================================================
           GET GPS
           =================================================== */

        const position =
          await getBestLocation(
            (gps) => {
              if (
                typeof gps ===
                "function"
              ) {
                setGpsDebug(
                  gps
                );
              } else {
                setGpsDebug(
                  gps
                );
              }
            }
          );

        const latitude =
          Number(
            position.latitude
          );

        const longitude =
          Number(
            position.longitude
          );

        const accuracy =
          Number(
            position.accuracy
          );

        console.log(
          "CHECK-OUT LOCATION READY:",
          {
            latitude,
            longitude,
            accuracy,
          }
        );

        setGpsDebug(
          (previous) => ({
            ...(previous || {}),
            latitude,
            longitude,
            accuracy,
            source:
              "LOCATION READY - SENDING TO BACKEND",
            result:
              "WAITING FOR BACKEND",
          })
        );

        if (
          !Number.isFinite(
            latitude
          ) ||
          !Number.isFinite(
            longitude
          ) ||
          !Number.isFinite(
            accuracy
          )
        ) {
          throw new Error(
            "Invalid location received from browser."
          );
        }

        if (
          accuracy >
          MAX_GPS_ACCURACY
        ) {
          throw {
            code:
              "GPS_ACCURACY_LOW",

            accuracy,

            message:
              `GPS accuracy is about ${Math.round(
                accuracy
              )}m. Please move near a window or outside and try again.`,
          };
        }

        showMessage(
          "Location found. Checking you out...",
          "info"
        );


        /* ===================================================
           CHECK OUT
           =================================================== */

        const response =
          await api.post(
            "/attendance/check-out",
            {
              latitude,
              longitude,
              accuracy,
            }
          );

        console.log(
          "CHECK-OUT RESPONSE:",
          response?.data
        );

        setGpsDebug(
          (previous) => ({
            ...(previous || {}),
            latitude,
            longitude,
            accuracy,
            result:
              "INSIDE OFFICE / CHECK-OUT ACCEPTED",
            backendDistance:
              response?.data
                ?.distance ??
              previous?.backendDistance,
            officeRadius:
              response?.data
                ?.allowedRadius ??
              previous?.officeRadius,
          })
        );

        showMessage(
          response?.data
            ?.message ||
            "Check-out successful",
          "success"
        );

        setShowWorkReport(
          false
        );

        setWorkDescription("");

        await fetchAttendance();

        await fetchTodayWorkReport();
      } catch (error) {
        console.error(
          "CHECK-OUT ERROR:",
          error
        );

        if (
          error?.code ===
            "GPS_ACCURACY_LOW" ||
          error?.code === 1 ||
          error?.code === 2 ||
          error?.code === 3 ||
          error?.code ===
            "GEOLOCATION_NOT_SUPPORTED"
        ) {
          showMessage(
            getGpsErrorMessage(
              error
            ),
            "error"
          );

          setGpsDebug(
            (previous) => ({
              ...(previous || {}),
              result:
                "GPS ERROR",
              gpsError:
                getGpsErrorMessage(
                  error
                ),
            })
          );

          return;
        }

        const backendMessage =
          error?.response
            ?.data?.message;

        if (backendMessage) {
          const backendData =
            error?.response
              ?.data;

          setGpsDebug(
            (previous) => ({
              ...(previous || {}),
              result:
                "BACKEND REJECTED LOCATION",
              backendMessage,
              backendDistance:
                backendData?.distance ??
                previous?.backendDistance,
              officeRadius:
                backendData?.allowedRadius ??
                previous?.officeRadius,
            })
          );

          showMessage(
            backendMessage,
            "error"
          );

          return;
        }

        setGpsDebug(
          (previous) => ({
            ...(previous || {}),
            result:
              "CHECK-OUT FAILED",
            backendMessage:
              error?.message ||
              "Unknown error",
          })
        );

        showMessage(
          error?.message ||
            "Check-out failed. Please try again.",
          "error"
        );
      } finally {
        setWorkReportLoading(
          false
        );
      }
    };


  /* =========================================================
     FILTERING
     ========================================================= */

  const filteredAttendance =
    useMemo(() => {
      return attendance.filter(
        (record) => {
          const status =
            String(
              record?.status ||
                ""
            ).toUpperCase();

          const method =
            String(
              getAttendanceMethod(
                record
              ) || ""
            ).toUpperCase();

          const statusMatches =
            statusFilter ===
              "ALL" ||
            status ===
              statusFilter;

          const methodMatches =
            methodFilter ===
              "ALL" ||
            method ===
              methodFilter;

          return (
            statusMatches &&
            methodMatches
          );
        }
      );
    }, [
      attendance,
      statusFilter,
      methodFilter,
    ]);


  /* =========================================================
     PAGINATION
     ========================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredAttendance.length /
          recordsPerPage
      )
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const paginatedAttendance =
    useMemo(() => {
      const startIndex =
        (safeCurrentPage - 1) *
        recordsPerPage;

      return filteredAttendance.slice(
        startIndex,
        startIndex +
          recordsPerPage
      );
    }, [
      filteredAttendance,
      safeCurrentPage,
    ]);


  useEffect(() => {
    setCurrentPage(1);
  }, [
    statusFilter,
    methodFilter,
  ]);


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

  const closeWorkReportModal =
    () => {
      if (
        workReportLoading
      ) {
        return;
      }

      setShowWorkReport(
        false
      );
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

          <div className="attendance-eyebrow">
            ATTENDANCE
          </div>

          <h1>
            My Attendance
          </h1>

          <p>
            Track your daily attendance, working hours and
            attendance history.
          </p>

        </div>

        <div className="attendance-current-date">

          <span className="current-date-label">
            TODAY
          </span>

          <strong>
            {formatLongDate(
              currentTime
            )}
          </strong>

          <span>
            {currentTime.toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              }
            )}
          </span>

        </div>

      </div>


      {/* =====================================================
          MESSAGE
          ===================================================== */}

      {message && (
        <div
          className={`attendance-message ${messageType}`}
        >
          <span className="message-icon">

            {messageType ===
            "error"
              ? "!"
              : messageType ===
                "info"
              ? "i"
              : "✓"}

          </span>

          <span>
            {message}
          </span>

        </div>
      )}


      {/* =====================================================
          GPS DEBUG PANEL
          
          IMPORTANT:
          This uses inline styles only.
          Your existing CSS is NOT changed.
          ===================================================== */}

      {gpsDebug && (
        <div
          style={{
            marginBottom: "20px",
            padding: "18px",
            background: "#f5f9ff",
            border: "1px solid #cfe3ff",
            borderRadius: "12px",
            fontFamily:
              "Arial, sans-serif",
            fontSize: "14px",
            lineHeight: "1.8",
            color: "#17324d",
            boxSizing: "border-box",
            width: "100%",
          }}
        >

          <div
            style={{
              fontWeight: "700",
              fontSize: "15px",
              marginBottom: "10px",
              color: "#0066b3",
            }}
          >
            📍 GPS LOCATION DEBUG
          </div>


          {/* SOURCE */}

          {gpsDebug.source && (
            <div>
              <strong>
                Source:
              </strong>{" "}
              {gpsDebug.source}
            </div>
          )}


          {/* LATITUDE */}

          {Number.isFinite(
            Number(
              gpsDebug.latitude
            )
          ) && (
            <div>
              <strong>
                Latitude:
              </strong>{" "}
              {Number(
                gpsDebug.latitude
              ).toFixed(8)}
            </div>
          )}


          {/* LONGITUDE */}

          {Number.isFinite(
            Number(
              gpsDebug.longitude
            )
          ) && (
            <div>
              <strong>
                Longitude:
              </strong>{" "}
              {Number(
                gpsDebug.longitude
              ).toFixed(8)}
            </div>
          )}


          {/* ACCURACY */}

          {Number.isFinite(
            Number(
              gpsDebug.accuracy
            )
          ) && (
            <div>
              <strong>
                GPS Accuracy:
              </strong>{" "}
              {Math.round(
                Number(
                  gpsDebug.accuracy
                )
              )}{" "}
              m
            </div>
          )}


          {/* BACKEND DISTANCE */}

          {Number.isFinite(
            Number(
              gpsDebug.backendDistance
            )
          ) && (
            <div>
              <strong>
                Distance From Office:
              </strong>{" "}
              {Math.round(
                Number(
                  gpsDebug.backendDistance
                )
              )}{" "}
              m
            </div>
          )}


          {/* OFFICE RADIUS */}

          {Number.isFinite(
            Number(
              gpsDebug.officeRadius
            )
          ) && (
            <div>
              <strong>
                Allowed Office Radius:
              </strong>{" "}
              {Math.round(
                Number(
                  gpsDebug.officeRadius
                )
              )}{" "}
              m
            </div>
          )}


          {/* RESULT */}

          {gpsDebug.result && (
            <div
              style={{
                marginTop: "8px",
                fontWeight: "700",
              }}
            >
              <strong>
                Result:
              </strong>{" "}
              {gpsDebug.result}
            </div>
          )}


          {/* BACKEND MESSAGE */}

          {gpsDebug.backendMessage && (
            <div
              style={{
                marginTop: "5px",
                fontWeight: "600",
              }}
            >
              <strong>
                Backend:
              </strong>{" "}
              {gpsDebug.backendMessage}
            </div>
          )}


          {/* GPS ERROR */}

          {gpsDebug.gpsError && (
            <div
              style={{
                marginTop: "5px",
                fontWeight: "600",
              }}
            >
              <strong>
                GPS Error:
              </strong>{" "}
              {gpsDebug.gpsError}
            </div>
          )}


          {/* IMPORTANT EXPLANATION */}

          {Number.isFinite(
            Number(
              gpsDebug.backendDistance
            )
          ) &&
            Number.isFinite(
              Number(
                gpsDebug.officeRadius
              )
            ) && (
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop:
                    "1px solid #d9e8f8",
                  fontSize: "13px",
                  color: "#4b6175",
                }}
              >
                Backend comparison:{" "}
                <strong>
                  {Math.round(
                    Number(
                      gpsDebug.backendDistance
                    )
                  )}m
                </strong>{" "}
                from office vs{" "}
                <strong>
                  {Math.round(
                    Number(
                      gpsDebug.officeRadius
                    )
                  )}m
                </strong>{" "}
                allowed.
              </div>
            )}

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

            <h2>
              {formatDate(
                currentTime
              )}
            </h2>

          </div>

          <div
            className={`today-status-badge ${
              todayAttendance
                ? getStatusClass(
                    todayAttendance.status
                  )
                : "pending"
            }`}
          >

            <span className="status-dot"></span>

            {todayAttendance?.status
              ? formatStatus(
                  todayAttendance.status
                )
              : "Not Checked In"}

          </div>

        </div>


        <div className="today-attendance-body">

          <div className="today-time-grid">

            <div className="today-time-item">

              <span className="today-time-label">
                CHECK IN
              </span>

              <strong>
                {todayAttendance?.checkIn
                  ?.time
                  ? formatTime(
                      todayAttendance
                        .checkIn.time
                    )
                  : "--:--"}
              </strong>

            </div>


            <div className="today-time-item">

              <span className="today-time-label">
                CHECK OUT
              </span>

              <strong>
                {todayAttendance?.checkOut
                  ?.time
                  ? formatTime(
                      todayAttendance
                        .checkOut.time
                    )
                  : "--:--"}
              </strong>

            </div>


            <div className="today-time-item">

              <span className="today-time-label">
                WORKING TIME
              </span>

              <strong>
                {formatMinutes(
                  liveWorkingMinutes
                )}
              </strong>

            </div>


            <div className="today-time-item">

              <span className="today-time-label">
                METHOD
              </span>

              <strong className="method-value">

                {getMethodIcon(
                  getAttendanceMethod(
                    todayAttendance
                  )
                )}

                {formatMethod(
                  getAttendanceMethod(
                    todayAttendance
                  )
                )}

              </strong>

            </div>

          </div>


          <div className="today-attendance-actions">

            {!hasCheckedIn && (
              <button
                type="button"
                className="check-in-button"
                onClick={
                  handleCheckIn
                }
                disabled={
                  actionLoading
                }
              >

                {actionLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Getting Location...
                  </>
                ) : (
                  <>
                    <span>
                      ✓
                    </span>
                    Check In
                  </>
                )}

              </button>
            )}


            {isCheckedIn && (
              <button
                type="button"
                className="check-out-button"
                onClick={
                  handleCheckOutClick
                }
                disabled={
                  actionLoading
                }
              >

                {actionLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Please Wait...
                  </>
                ) : (
                  <>
                    <span>
                      ↗
                    </span>
                    Check Out
                  </>
                )}

              </button>
            )}


            {isCheckedOut && (
              <div className="checked-out-message">

                <span>
                  ✓
                </span>

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

            <h2>
              Attendance Records
            </h2>

          </div>

          <span className="attendance-count">

            {filteredAttendance.length} record
            {filteredAttendance.length !==
            1
              ? "s"
              : ""}

          </span>

        </div>


        <div className="attendance-filters">

          <div className="filter-group">

            <label htmlFor="status-filter">
              Status
            </label>

            <select
              id="status-filter"
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
            >

              <option value="ALL">
                All Status
              </option>

              <option value="PRESENT">
                Present
              </option>

              <option value="ABSENT">
                Absent
              </option>

              <option value="LEAVE">
                Leave
              </option>

              <option value="ON_LEAVE">
                On Leave
              </option>

              <option value="HOLIDAY">
                Holiday
              </option>

              <option value="WEEKEND">
                Weekend
              </option>

              <option value="MISSED_CHECKOUT">
                Missed Checkout
              </option>

              <option value="HALF_DAY">
                Half Day
              </option>

              <option value="OVERTIME">
                Overtime
              </option>

            </select>

          </div>


          <div className="filter-group">

            <label htmlFor="method-filter">
              Method
            </label>

            <select
              id="method-filter"
              value={
                methodFilter
              }
              onChange={(event) =>
                setMethodFilter(
                  event.target
                    .value
                )
              }
            >

              <option value="ALL">
                All Methods
              </option>

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


          <button
            type="button"
            className="clear-filters-button"
            onClick={
              clearFilters
            }
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

          <span>
            Loading attendance...
          </span>

        </div>
      )}


      {/* =====================================================
          EMPTY
          ===================================================== */}

      {!loading &&
        filteredAttendance.length ===
          0 && (
          <div className="empty-attendance">

            <div className="empty-attendance-icon">
              ◎
            </div>

            <h3>
              No attendance records found
            </h3>

            <p>
              There are no attendance records matching
              the selected filters.
            </p>

            {(statusFilter !==
              "ALL" ||
              methodFilter !==
                "ALL") && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>
            )}

          </div>
        )}


      {/* =====================================================
          RECORD LIST
          ===================================================== */}

      {!loading &&
        paginatedAttendance.length >
          0 && (
          <div className="attendance-record-list">

            {paginatedAttendance.map(
              (
                record,
                index
              ) => {
                const recordStatus =
                  record?.status ||
                  "UNKNOWN";

                const recordMethod =
                  getAttendanceMethod(
                    record
                  );

                return (
                  <article
                    className="attendance-record"
                    key={
                      record?._id ||
                      record?.id ||
                      index
                    }
                  >

                    <div className="record-date">

                      <strong>
                        {formatDate(
                          record.date
                        )}
                      </strong>

                      <span>
                        {formatShortDay(
                          record.date
                        )}
                      </span>

                    </div>


                    <div className="record-status">

                      <span
                        className={`record-status-badge ${getStatusClass(
                          recordStatus
                        )}`}
                      >
                        {formatStatus(
                          recordStatus
                        )}
                      </span>

                    </div>


                    <div className="record-time">

                      <div>

                        <span>
                          IN
                        </span>

                        <strong>
                          {record?.checkIn
                            ?.time
                            ? formatTime(
                                record
                                  .checkIn
                                  .time
                              )
                            : "--:--"}
                        </strong>

                      </div>


                      <div>

                        <span>
                          OUT
                        </span>

                        <strong>
                          {record?.checkOut
                            ?.time
                            ? formatTime(
                                record
                                  .checkOut
                                  .time
                              )
                            : "--:--"}
                        </strong>

                      </div>

                    </div>


                    <div className="record-duration">

                      <span>
                        WORKING
                      </span>

                      <strong>
                        {formatMinutes(
                          record?.workingMinutes ||
                            0
                        )}
                      </strong>

                    </div>


                    <div className="record-method">

                      <span>
                        {getMethodIcon(
                          recordMethod
                        )}
                      </span>

                      <strong>
                        {formatMethod(
                          recordMethod
                        )}
                      </strong>

                      {record?.isOvertime && (
                        <small>
                          Overtime
                        </small>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}


      {/* =====================================================
          PAGINATION
          ===================================================== */}

      {!loading &&
        filteredAttendance.length >
          recordsPerPage && (
          <div className="attendance-pagination">

            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
              }
              disabled={
                safeCurrentPage ===
                1
              }
            >
              ← Previous
            </button>


            <div className="pagination-pages">

              {Array.from(
                {
                  length:
                    totalPages,
                },
                (
                  _,
                  index
                ) =>
                  index + 1
              ).map(
                (page) => (
                  <button
                    type="button"
                    key={page}
                    className={
                      page ===
                      safeCurrentPage
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setCurrentPage(
                        page
                      )
                    }
                  >
                    {page}
                  </button>
                )
              )}

            </div>


            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
              }
              disabled={
                safeCurrentPage ===
                totalPages
              }
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
          onClick={
            closeWorkReportModal
          }
        >

          <div
            className="work-report-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <span className="modal-eyebrow">
                  CHECK OUT
                </span>

                <h2>
                  Today's Work Report
                </h2>

                <p>
                  Please describe the work you
                  completed today before checking out.
                </p>

              </div>


              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeWorkReportModal
                }
                disabled={
                  workReportLoading
                }
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
                value={
                  workDescription
                }
                onChange={(
                  event
                ) =>
                  setWorkDescription(
                    event.target
                      .value
                  )
                }
                placeholder="Example: Completed attendance frontend, fixed mobile GPS issue and tested check-in/check-out..."
                rows={7}
                disabled={
                  workReportLoading
                }
              />


              <div className="work-report-helper">

                <span>
                  Minimum 10 characters
                </span>

                <span>
                  {
                    workDescription.trim()
                      .length
                  }{" "}
                  characters
                </span>

              </div>

            </div>


            <div className="modal-footer">

              <button
                type="button"
                className="modal-cancel-button"
                onClick={
                  closeWorkReportModal
                }
                disabled={
                  workReportLoading
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="modal-checkout-button"
                onClick={
                  handleWorkReportAndCheckOut
                }
                disabled={
                  workReportLoading
                }
              >

                {workReportLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Save Report & Check Out
                    <span>
                      →
                    </span>
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