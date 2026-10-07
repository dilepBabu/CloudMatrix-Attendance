import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../services/api";
import "./MyAttendance.css";

/* =========================================================
   DATE HELPERS
   ========================================================= */

const getDateKey = (date) => {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const formatDate = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDay = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-IN", {
    weekday: "long",
  });
};

const formatShortDay = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-IN", {
    weekday: "short",
  });
};

const formatTime = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatLongDate = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

/* =========================================================
   STATUS HELPERS
   ========================================================= */

const formatStatus = (status) => {
  if (!status) return "Not Marked";

  const normalized = String(status)
    .toLowerCase()
    .replace(/\s+/g, "_");

  switch (normalized) {
    case "present":
      return "Present";

    case "absent":
      return "Absent";

    case "onleave":
    case "on_leave":
    case "leave":
      return "On Leave";

    case "halfday":
    case "half_day":
      return "Half Day";

    case "overtime":
      return "Overtime";

    case "holiday":
      return "Holiday";

    case "weekend":
      return "Weekend";

    case "missed_checkout":
    case "missedcheckout":
      return "Missed Checkout";

    default:
      return status;
  }
};

const getStatusClass = (status) => {
  if (!status) return "unknown";

  const normalized = String(status)
    .toLowerCase()
    .replace(/\s+/g, "_");

  switch (normalized) {
    case "present":
      return "present";

    case "absent":
      return "absent";

    case "onleave":
    case "on_leave":
    case "leave":
      return "leave";

    case "halfday":
    case "half_day":
      return "half-day";

    case "overtime":
      return "overtime";

    case "holiday":
      return "holiday";

    case "weekend":
      return "weekend";

    case "missed_checkout":
    case "missedcheckout":
      return "missed";

    default:
      return "unknown";
  }
};

/* =========================================================
   ATTENDANCE METHOD HELPERS
   ========================================================= */

const getAttendanceMethod = (record) => {
  if (!record) return null;

  return (
    record.attendanceMethod ||
    record.method ||
    record.checkIn?.method ||
    record.checkOut?.method ||
    null
  );
};

const formatMethod = (method) => {
  if (!method) return "-";

  const normalized = String(method).toUpperCase();

  switch (normalized) {
    case "OFFICE":
      return "Office";

    case "REMOTE":
      return "Remote";

    case "FIELD":
      return "Field";

    default:
      return method;
  }
};

const getMethodIcon = (method) => {
  if (!method) return "📍";

  const normalized = String(method).toUpperCase();

  switch (normalized) {
    case "OFFICE":
      return "🏢";

    case "REMOTE":
      return "🏠";

    case "FIELD":
      return "🚗";

    default:
      return "📍";
  }
};

/* =========================================================
   WORKING TIME
   ========================================================= */

const formatMinutes = (minutes) => {
  if (
    minutes === null ||
    minutes === undefined ||
    Number.isNaN(Number(minutes))
  ) {
    return "0h 0m";
  }

  const totalMinutes = Math.max(
    0,
    Number(minutes)
  );

  const hours = Math.floor(
    totalMinutes / 60
  );

  const mins = totalMinutes % 60;

  return `${hours}h ${mins}m`;
};

/* =========================================================
   GPS
   ========================================================= */

const MAX_GPS_ACCURACY = 300;

const getGpsErrorMessage = (error) => {
  if (!error) {
    return "Unable to get your location.";
  }

  switch (error.code) {
    case 1:
      return "Location permission was denied. Please allow location access.";

    case 2:
      return "Your location could not be determined. Please try again.";

    case 3:
      return "Location request timed out. Please try again.";

    default:
      return (
        error.message ||
        "Unable to get your location."
      );
  }
};

/* =========================================================
   BEST GPS LOCATION
   ========================================================= */

const getBestLocation = (onGpsUpdate = null) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "Geolocation is not supported by this browser/device."
        )
      );

      return;
    }

    let watchId = null;
    let fallbackStarted = false;
    let finished = false;
    let bestPosition = null;

    const HIGH_ACCURACY_TIMEOUT = 30000;
    const FALLBACK_DELAY = 15000;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(
          watchId
        );

        watchId = null;
      }
    };

    const finish = (position) => {
      if (finished) return;

      finished = true;

      cleanup();

      if (!position) {
        reject(
          new Error(
            "Unable to get a valid GPS location. Please try again."
          )
        );

        return;
      }

      const latitude =
        position?.coords?.latitude;

      const longitude =
        position?.coords?.longitude;

      const accuracy =
        position?.coords?.accuracy;

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(accuracy)
      ) {
        reject(
          new Error(
            "Invalid GPS location received. Please try again."
          )
        );

        return;
      }

      if (
        accuracy >
        MAX_GPS_ACCURACY
      ) {
        reject(
          new Error(
            `GPS accuracy is too low (${Math.round(
              accuracy
            )}m). Please move outdoors or enable precise location and try again.`
          )
        );

        return;
      }

      if (onGpsUpdate) {
        onGpsUpdate({
          source:
            "LOCATION READY - SENDING TO BACKEND",

          latitude,

          longitude,

          accuracy:
            Math.round(
              accuracy
            ),
        });
      }

      resolve({
        latitude,
        longitude,
        accuracy,
      });
    };

    const handlePosition = (
      position
    ) => {
      if (finished) return;

      const accuracy =
        position?.coords?.accuracy;

      if (
        !Number.isFinite(
          accuracy
        )
      ) {
        return;
      }

      if (
        !bestPosition ||
        accuracy <
          bestPosition.coords
            .accuracy
      ) {
        bestPosition =
          position;

        if (onGpsUpdate) {
          onGpsUpdate({
            source:
              "GPS READING",

            latitude:
              position.coords
                .latitude,

            longitude:
              position.coords
                .longitude,

            accuracy:
              Math.round(
                accuracy
              ),
          });
        }
      }

      if (accuracy <= 50) {
        finish(position);
      }
    };

    const handleError = (
      error
    ) => {
      if (finished) return;

      if (fallbackStarted) {
        if (bestPosition) {
          finish(bestPosition);
        } else {
          reject(
            new Error(
              getGpsErrorMessage(
                error
              )
            )
          );
        }
      }
    };

    try {
      watchId =
        navigator.geolocation.watchPosition(
          handlePosition,
          handleError,
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout:
              HIGH_ACCURACY_TIMEOUT,
          }
        );
    } catch (error) {
      reject(error);
      return;
    }

    setTimeout(() => {
      if (finished) return;

      fallbackStarted = true;

      if (onGpsUpdate) {
        onGpsUpdate(
          (
            previous
          ) => ({
            ...(previous ||
              {}),

            source:
              "NORMAL GPS FALLBACK",
          })
        );
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (finished) return;

          const accuracy =
            position?.coords
              ?.accuracy;

          if (
            Number.isFinite(
              accuracy
            ) &&
            (!bestPosition ||
              accuracy <
                bestPosition
                  .coords
                  .accuracy)
          ) {
            bestPosition =
              position;
          }

          if (bestPosition) {
            finish(
              bestPosition
            );
          } else {
            finish(position);
          }
        },

        (error) => {
          if (finished) return;

          if (bestPosition) {
            finish(
              bestPosition
            );
          } else {
            reject(
              new Error(
                getGpsErrorMessage(
                  error
                )
              )
            );
          }
        },

        {
          enableHighAccuracy:
            false,

          maximumAge: 10000,

          timeout: 15000,
        }
      );
    }, FALLBACK_DELAY);

    setTimeout(() => {
      if (finished) return;

      if (bestPosition) {
        finish(
          bestPosition
        );
      } else {
        reject(
          new Error(
            "Unable to get your location. Please try again."
          )
        );
      }
    }, HIGH_ACCURACY_TIMEOUT);
  });
};

/* =========================================================
   COMPONENT
   ========================================================= */

const MyAttendance = () => {
  /* =======================================================
     ATTENDANCE STATE
     ======================================================= */

  const [
    attendance,
    setAttendance,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState("");

  /* =======================================================
     FILTER STATE
     ======================================================= */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    methodFilter,
    setMethodFilter,
  ] = useState("ALL");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const recordsPerPage = 10;

  /* =======================================================
     WORK REPORT STATE
     ======================================================= */

  const [
    showWorkReportModal,
    setShowWorkReportModal,
  ] = useState(false);

  const [
    workReportDescription,
    setWorkReportDescription,
  ] = useState("");

  const [
    workReportLoading,
    setWorkReportLoading,
  ] = useState(false);

  const [
    workReportExists,
    setWorkReportExists,
  ] = useState(false);

  const [
    checkoutAttendanceId,
    setCheckoutAttendanceId,
  ] = useState(null);

  /* =======================================================
     CURRENT TIME
     ======================================================= */

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    new Date()
  );

  /* =======================================================
     GPS DEBUG
     ======================================================= */

  const [
    gpsDebug,
    setGpsDebug,
  ] = useState(null);

  const updateGpsDebug =
    useCallback(
      (gps) => {
        setGpsDebug(
          (previous) => {
            if (
              typeof gps ===
              "function"
            ) {
              return gps(
                previous
              );
            }

            return {
              ...(previous ||
                {}),

              ...(gps || {}),
            };
          }
        );
      },
      []
    );

  /* =======================================================
     FETCH ATTENDANCE
     ======================================================= */

  const fetchAttendance =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const response =
            await api.get(
              "/attendance/my"
            );

          const data =
            response?.data;

          let records = [];

          if (
            Array.isArray(data)
          ) {
            records = data;
          } else if (
            Array.isArray(
              data?.attendance
            )
          ) {
            records =
              data.attendance;
          } else if (
            Array.isArray(
              data?.records
            )
          ) {
            records =
              data.records;
          }

          setAttendance(
            records
          );

          return records;
        } catch (error) {
          console.error(
            "FETCH ATTENDANCE ERROR:",
            error
          );

          setMessage(
            error?.response
              ?.data?.message ||
              "Failed to load attendance."
          );

          setMessageType(
            "error"
          );

          return [];
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* =======================================================
     FETCH WORK REPORT
     ======================================================= */

  const fetchTodayWorkReport =
    useCallback(
      async () => {
        try {
          const response =
            await api.get(
              "/work-reports/my"
            );

          const data =
            response?.data;

          let reports = [];

          if (
            Array.isArray(
              data?.workReports
            )
          ) {
            reports =
              data.workReports;
          } else if (
            Array.isArray(data)
          ) {
            reports = data;
          } else if (
            data?.workReport
          ) {
            reports = [
              data.workReport,
            ];
          } else if (
            data?.report
          ) {
            reports = [
              data.report,
            ];
          }

          if (
            reports.length ===
            0
          ) {
            setWorkReportExists(
              false
            );

            setWorkReportDescription(
              ""
            );

            return null;
          }

          const todayKey =
            getDateKey(
              new Date()
            );

          /*
           * Prefer report for today's
           * attendance date.
           */

          const todayReport =
            reports.find(
              (report) =>
                getDateKey(
                  report?.date
                ) === todayKey
            );

          const report =
            todayReport ||
            reports[0];

          if (
            report &&
            report.description !==
              undefined
          ) {
            setWorkReportExists(
              true
            );

            setWorkReportDescription(
              report.description ||
                ""
            );

            return report;
          }

          setWorkReportExists(
            false
          );

          setWorkReportDescription(
            ""
          );

          return null;
        } catch (error) {
          if (
            error?.response
              ?.status === 404
          ) {
            setWorkReportExists(
              false
            );

            setWorkReportDescription(
              ""
            );

            return null;
          }

          console.error(
            "FETCH WORK REPORT ERROR:",
            error
          );

          /*
           * Important:
           *
           * Do not erase the user's
           * textarea if this request fails.
           */

          return null;
        }
      },
      []
    );

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    fetchAttendance();
    fetchTodayWorkReport();
  }, [
    fetchAttendance,
    fetchTodayWorkReport,
  ]);

  /* =======================================================
     LIVE CLOCK
     ======================================================= */

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

  /* =======================================================
     ACTIVE ATTENDANCE
     ======================================================= */

  const activeAttendance =
    useMemo(() => {
      const todayKey =
        getDateKey(
          currentTime
        );

      const todayAttendance =
        attendance.find(
          (record) =>
            getDateKey(
              record?.date
            ) === todayKey
        ) || null;

      if (
        todayAttendance
          ?.checkIn?.time &&
        !todayAttendance
          ?.checkOut?.time
      ) {
        return todayAttendance;
      }

      const now =
        currentTime.getTime();

      const OPEN_ATTENDANCE_WINDOW =
        24 * 60 * 60 * 1000;

      const openAttendance =
        attendance
          .filter(
            (record) => {
              if (
                !record?.checkIn
                  ?.time
              ) {
                return false;
              }

              if (
                record?.checkOut
                  ?.time
              ) {
                return false;
              }

              const checkInTime =
                new Date(
                  record.checkIn
                    .time
                ).getTime();

              if (
                Number.isNaN(
                  checkInTime
                )
              ) {
                return false;
              }

              const elapsed =
                now -
                checkInTime;

              return (
                elapsed >= 0 &&
                elapsed <=
                  OPEN_ATTENDANCE_WINDOW
              );
            }
          )
          .sort(
            (a, b) =>
              new Date(
                b.checkIn.time
              ).getTime() -
              new Date(
                a.checkIn.time
              ).getTime()
          )[0] || null;

      if (
        openAttendance
      ) {
        return openAttendance;
      }

      return (
        todayAttendance ||
        null
      );
    }, [
      attendance,
      currentTime,
    ]);

  /* =======================================================
     CURRENT ATTENDANCE STATE
     ======================================================= */

  const hasCheckedIn =
    !!activeAttendance
      ?.checkIn?.time;

  const hasCheckedOut =
    !!activeAttendance
      ?.checkOut?.time;

  const isCheckedIn =
    hasCheckedIn &&
    !hasCheckedOut;

  const isCheckedOut =
    hasCheckedIn &&
    hasCheckedOut;

  /* =======================================================
     LIVE WORKING MINUTES
     ======================================================= */

  const liveWorkingMinutes =
    useMemo(() => {
      if (
        !activeAttendance
          ?.checkIn?.time
      ) {
        return 0;
      }

      const checkInTime =
        new Date(
          activeAttendance
            .checkIn.time
        ).getTime();

      if (
        Number.isNaN(
          checkInTime
        )
      ) {
        return 0;
      }

      if (
        activeAttendance
          ?.checkOut?.time
      ) {
        if (
          activeAttendance
            .workingMinutes !==
            undefined &&
          activeAttendance
            .workingMinutes !==
            null
        ) {
          return Number(
            activeAttendance
              .workingMinutes
          );
        }

        const checkOutTime =
          new Date(
            activeAttendance
              .checkOut.time
          ).getTime();

        if (
          !Number.isNaN(
            checkOutTime
          )
        ) {
          return Math.floor(
            (checkOutTime -
              checkInTime) /
              60000
          );
        }

        return 0;
      }

      const now =
        currentTime.getTime();

      if (
        now <= checkInTime
      ) {
        return 0;
      }

      return Math.floor(
        (now - checkInTime) /
          60000
      );
    }, [
      activeAttendance,
      currentTime,
    ]);

  /* =======================================================
     FILTERED ATTENDANCE
     ======================================================= */

  const filteredAttendance =
    useMemo(() => {
      let records = [
        ...attendance,
      ];

      if (search.trim()) {
        const searchValue =
          search
            .trim()
            .toLowerCase();

        records =
          records.filter(
            (record) => {
              const date =
                formatDate(
                  record?.date
                ).toLowerCase();

              const day =
                formatDay(
                  record?.date
                ).toLowerCase();

              const status =
                formatStatus(
                  record?.status
                ).toLowerCase();

              const method =
                formatMethod(
                  getAttendanceMethod(
                    record
                  )
                ).toLowerCase();

              return (
                date.includes(
                  searchValue
                ) ||
                day.includes(
                  searchValue
                ) ||
                status.includes(
                  searchValue
                ) ||
                method.includes(
                  searchValue
                )
              );
            }
          );
      }

      if (
        statusFilter !==
        "ALL"
      ) {
        records =
          records.filter(
            (record) => {
              const recordStatus =
                String(
                  record?.status ||
                    ""
                )
                  .toUpperCase()
                  .replace(
                    /\s+/g,
                    "_"
                  );

              return (
                recordStatus ===
                statusFilter
              );
            }
          );
      }

      if (
        methodFilter !==
        "ALL"
      ) {
        records =
          records.filter(
            (record) => {
              const method =
                String(
                  getAttendanceMethod(
                    record
                  ) || ""
                ).toUpperCase();

              return (
                method ===
                methodFilter
              );
            }
          );
      }

      records.sort(
        (a, b) => {
          const dateA =
            new Date(
              a?.date || 0
            ).getTime();

          const dateB =
            new Date(
              b?.date || 0
            ).getTime();

          return (
            dateB - dateA
          );
        }
      );

      return records;
    }, [
      attendance,
      search,
      statusFilter,
      methodFilter,
    ]);

  /* =======================================================
     PAGINATION
     ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredAttendance.length /
          recordsPerPage
      )
    );

  const paginatedAttendance =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        recordsPerPage;

      return filteredAttendance.slice(
        start,
        start +
          recordsPerPage
      );
    }, [
      filteredAttendance,
      currentPage,
    ]);

  /* =======================================================
     RESET PAGE
     ======================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    methodFilter,
  ]);

  /* =======================================================
     CHECK IN
     ======================================================= */

  const handleCheckIn =
    async () => {
      if (actionLoading) {
        return;
      }

      try {
        setActionLoading(
          true
        );

        setMessage("");
        setMessageType("");

        setGpsDebug({
          source:
            "REQUESTING GPS LOCATION...",
        });

        const gps =
          await getBestLocation(
            updateGpsDebug
          );

        console.log(
          "CHECK-IN GPS:",
          gps
        );

        const response =
          await api.post(
            "/attendance/check-in",
            {
              latitude:
                gps.latitude,

              longitude:
                gps.longitude,

              accuracy:
                gps.accuracy,
            }
          );

        const data =
          response?.data;

        if (
          data?.success === false
        ) {
          throw new Error(
            data?.message ||
              "Check-in failed."
          );
        }

        setMessage(
          data?.message ||
            "Check-in successful."
        );

        setMessageType(
          "success"
        );

        await fetchAttendance();

        await fetchTodayWorkReport();
      } catch (error) {
        console.error(
          "CHECK-IN ERROR:",
          error
        );

        const errorMessage =
          error?.response
            ?.data?.message ||
          error?.message ||
          "Check-in failed.";

        setMessage(
          errorMessage
        );

        setMessageType(
          "error"
        );

        if (
          error?.response
            ?.data?.distance !==
            undefined ||
          error?.response
            ?.data
            ?.allowedRadius !==
            undefined
        ) {
          setGpsDebug(
            (previous) => ({
              ...(previous ||
                {}),

              source:
                "BACKEND REJECTED LOCATION",

              backendDistance:
                error.response
                  .data
                  .distance,

              backendAllowedRadius:
                error.response
                  .data
                  .allowedRadius,
            })
          );
        }
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     CHECK OUT CLICK
     ======================================================= */

  const handleCheckOutClick =
    async () => {
      if (actionLoading) {
        return;
      }

      if (!isCheckedIn) {
        setMessage(
          "No active attendance found for checkout."
        );

        setMessageType(
          "error"
        );

        return;
      }

      const attendanceId =
        activeAttendance?._id ||
        activeAttendance?.id;

      if (!attendanceId) {
        setMessage(
          "Unable to identify the attendance record. Please refresh the page and try again."
        );

        setMessageType(
          "error"
        );

        return;
      }

      try {
        setActionLoading(
          true
        );

        setMessage("");
        setMessageType("");

        /*
         * Store EXACT attendance ID.
         */

        setCheckoutAttendanceId(
          String(
            attendanceId
          )
        );

        /*
         * Load existing report.
         *
         * This does NOT perform checkout.
         */

        await fetchTodayWorkReport();

        setShowWorkReportModal(
          true
        );
      } catch (error) {
        console.error(
          "CHECKOUT PREPARATION ERROR:",
          error
        );

        setMessage(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to prepare checkout."
        );

        setMessageType(
          "error"
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     WORK REPORT + CHECKOUT
     ======================================================= */

  const handleWorkReportAndCheckout =
    async () => {
      if (
        workReportLoading
      ) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * Use the attendance ID captured
       * when the checkout button was clicked.
       */

      const currentAttendanceId =
        checkoutAttendanceId;

      if (!currentAttendanceId) {
        setMessage(
          "Attendance ID is missing. Please close this window, refresh the page, and try again."
        );

        setMessageType(
          "error"
        );

        return;
      }

      const selectedAttendance =
        attendance.find(
          (record) =>
            String(
              record?._id ||
                record?.id ||
                ""
            ) ===
            String(
              currentAttendanceId
            )
        ) || null;

      if (!selectedAttendance) {
        setMessage(
          "The selected attendance record could not be found. Please refresh the page and try again."
        );

        setMessageType(
          "error"
        );

        return;
      }

      if (
        !selectedAttendance
          ?.checkIn?.time
      ) {
        setMessage(
          "No valid check-in was found for this attendance."
        );

        setMessageType(
          "error"
        );

        return;
      }

      if (
        selectedAttendance
          ?.checkOut?.time
      ) {
        setMessage(
          "This attendance has already been checked out."
        );

        setMessageType(
          "error"
        );

        setShowWorkReportModal(
          false
        );

        setCheckoutAttendanceId(
          null
        );

        return;
      }

      const description =
        workReportDescription.trim();

      /* =====================================================
         VALIDATE DESCRIPTION
         ===================================================== */

      if (!description) {
        setMessage(
          "Please enter your work report before checkout."
        );

        setMessageType(
          "error"
        );

        return;
      }

      if (
        description.length < 10
      ) {
        setMessage(
          "Work report must contain at least 10 characters."
        );

        setMessageType(
          "error"
        );

        return;
      }

      if (
        description.length > 2000
      ) {
        setMessage(
          "Work report cannot exceed 2000 characters."
        );

        setMessageType(
          "error"
        );

        return;
      }

      try {
        setWorkReportLoading(
          true
        );

        setMessage("");
        setMessageType("");

        /* =================================================
           STEP 1
           SAVE WORK REPORT
           ================================================= */

        let reportResponse;

        if (
          workReportExists
        ) {
          console.log(
            "UPDATING EXISTING WORK REPORT"
          );

          reportResponse =
            await api.put(
              "/work-reports/my",
              {
                description,
              }
            );
        } else {
          console.log(
            "CREATING NEW WORK REPORT"
          );

          reportResponse =
            await api.post(
              "/work-reports",
              {
                description,
              }
            );
        }

        console.log(
          "WORK REPORT RESPONSE:",
          reportResponse?.data
        );

        if (
          !reportResponse?.data
            ?.success
        ) {
          throw new Error(
            reportResponse?.data
              ?.message ||
              "Work report could not be saved."
          );
        }

        /*
         * Keep local state.
         */

        setWorkReportExists(
          true
        );

        setWorkReportDescription(
          description
        );

        /* =================================================
           STEP 2
           DETERMINE ATTENDANCE METHOD
           ================================================= */

        const attendanceMethod =
          String(
            selectedAttendance
              ?.checkIn?.method ||
              getAttendanceMethod(
                selectedAttendance
              ) ||
              ""
          ).toUpperCase();

        console.log(
          "ATTENDANCE ID:",
          currentAttendanceId
        );

        console.log(
          "ATTENDANCE METHOD:",
          attendanceMethod
        );

        /* =================================================
           STEP 3
           PREPARE CHECKOUT PAYLOAD
           ================================================= */

        let checkoutPayload =
          {};

        /*
         * OFFICE:
         * GPS required.
         */

        if (
          attendanceMethod ===
          "OFFICE"
        ) {
          setGpsDebug({
            source:
              "REQUESTING GPS LOCATION FOR CHECKOUT...",
          });

          const gps =
            await getBestLocation(
              updateGpsDebug
            );

          console.log(
            "CHECKOUT GPS:",
            gps
          );

          checkoutPayload = {
            latitude:
              gps.latitude,

            longitude:
              gps.longitude,

            accuracy:
              gps.accuracy,
          };
        }

        /*
         * REMOTE:
         * No GPS.
         */

        else if (
          attendanceMethod ===
          "REMOTE"
        ) {
          setGpsDebug({
            source:
              "REMOTE ATTENDANCE - GPS NOT REQUIRED FOR CHECKOUT",
          });
        }

        /*
         * FIELD:
         * No GPS.
         */

        else if (
          attendanceMethod ===
          "FIELD"
        ) {
          setGpsDebug({
            source:
              "FIELD ATTENDANCE - GPS NOT REQUIRED FOR CHECKOUT",
          });
        }

        /*
         * Unknown method:
         *
         * Let backend decide.
         */

        else {
          setGpsDebug({
            source:
              "ATTENDANCE METHOD NOT FOUND - SENDING CHECKOUT REQUEST",
          });
        }

        /* =================================================
           STEP 4
           CHECKOUT
           ================================================= */

        console.log(
          "CHECKOUT PAYLOAD:",
          checkoutPayload
        );

        const checkoutResponse =
          await api.post(
            "/attendance/check-out",
            checkoutPayload
          );

        console.log(
          "CHECKOUT RESPONSE:",
          checkoutResponse?.data
        );

        const checkoutData =
          checkoutResponse?.data;

        if (
          checkoutData?.success ===
          false
        ) {
          throw new Error(
            checkoutData?.message ||
              "Checkout failed."
          );
        }

        /* =================================================
           STEP 5
           SUCCESS
           ================================================= */

        setMessage(
          checkoutData?.message ||
            "Work report submitted and checkout completed successfully."
        );

        setMessageType(
          "success"
        );

        setShowWorkReportModal(
          false
        );

        setCheckoutAttendanceId(
          null
        );

        /*
         * Refresh attendance.
         */

        await fetchAttendance();

        /*
         * Refresh work report.
         */

        await fetchTodayWorkReport();
      } catch (error) {
        console.error(
          "WORK REPORT + CHECKOUT ERROR:",
          error
        );

        /*
         * IMPORTANT:
         *
         * If work report was already saved
         * and GPS/checkout failed, DO NOT
         * delete/clear the report.
         *
         * User can simply press
         * Submit & Check Out again.
         */

        const errorMessage =
          error?.response
            ?.data?.message ||
          error?.message ||
          "Checkout failed.";

        setMessage(
          errorMessage
        );

        setMessageType(
          "error"
        );

        if (
          error?.response
            ?.data?.distance !==
            undefined ||
          error?.response
            ?.data
            ?.allowedRadius !==
            undefined
        ) {
          setGpsDebug(
            (previous) => ({
              ...(previous ||
                {}),

              source:
                "BACKEND REJECTED LOCATION",

              backendDistance:
                error.response
                  .data
                  .distance,

              backendAllowedRadius:
                error.response
                  .data
                  .allowedRadius,
            })
          );
        }
      } finally {
        setWorkReportLoading(
          false
        );
      }
    };

  /* =======================================================
     CLOSE MODAL
     ======================================================= */

  const handleCloseWorkReportModal =
    () => {
      if (
        workReportLoading
      ) {
        return;
      }

      setShowWorkReportModal(
        false
      );

      setCheckoutAttendanceId(
        null
      );
    };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="my-attendance-page">

      {/* =================================================
          PAGE HEADER
          ================================================= */}

      <div className="attendance-page-header">

        <div>
          <span className="attendance-eyebrow">
            ATTENDANCE
          </span>

          <h1>
            My Attendance
          </h1>

          <p>
            Track your attendance and
            working hours.
          </p>
        </div>

        <div className="attendance-current-date">

          <span className="current-date-label">
            CURRENT DATE
          </span>

          <strong>
            {formatLongDate(
              currentTime
            )}
          </strong>

          <span>
            {formatTime(
              currentTime
            )}
          </span>

        </div>

      </div>

      {/* =================================================
          MESSAGE
          ================================================= */}

      {message && (
        <div
          className={`attendance-message ${messageType}`}
        >
          <span className="message-icon">
            {messageType ===
            "success"
              ? "✓"
              : messageType ===
                "error"
              ? "!"
              : "i"}
          </span>

          <span>
            {message}
          </span>
        </div>
      )}

      {/* =================================================
          GPS DEBUG
          ================================================= */}

      {gpsDebug && (
        <div
          style={{
            marginBottom:
              "20px",

            padding:
              "14px 16px",

            border:
              "1px solid #dce8f3",

            borderRadius:
              "12px",

            background:
              "#f8fbff",

            color:
              "#667085",

            fontSize:
              "11px",

            lineHeight:
              "1.7",
          }}
        >
          <strong
            style={{
              display:
                "block",

              marginBottom:
                "5px",

              color:
                "#1479d1",

              fontSize:
                "10px",

              letterSpacing:
                "1px",
            }}
          >
            GPS LOCATION DEBUG
          </strong>

          {gpsDebug.source && (
            <div>
              Source:{" "}
              {gpsDebug.source}
            </div>
          )}

          {gpsDebug.latitude !==
            undefined && (
            <div>
              Latitude:{" "}
              {Number(
                gpsDebug.latitude
              ).toFixed(8)}
            </div>
          )}

          {gpsDebug.longitude !==
            undefined && (
            <div>
              Longitude:{" "}
              {Number(
                gpsDebug.longitude
              ).toFixed(8)}
            </div>
          )}

          {gpsDebug.accuracy !==
            undefined && (
            <div>
              GPS Accuracy:{" "}
              {Math.round(
                Number(
                  gpsDebug.accuracy
                )
              )}
              m
            </div>
          )}

          {gpsDebug.distance !==
            undefined && (
            <div>
              Distance From Office:{" "}
              {Math.round(
                Number(
                  gpsDebug.distance
                )
              )}
              m
            </div>
          )}

          {gpsDebug.allowedRadius !==
            undefined && (
            <div>
              Allowed Office Radius:{" "}
              {Math.round(
                Number(
                  gpsDebug.allowedRadius
                )
              )}
              m
            </div>
          )}

          {gpsDebug.backendDistance !==
            undefined && (
            <div>
              Backend Distance:{" "}
              {Math.round(
                Number(
                  gpsDebug.backendDistance
                )
              )}
              m
            </div>
          )}

          {gpsDebug.backendAllowedRadius !==
            undefined && (
            <div>
              Backend Allowed Radius:{" "}
              {Math.round(
                Number(
                  gpsDebug.backendAllowedRadius
                )
              )}
              m
            </div>
          )}
        </div>
      )}

      {/* =================================================
          TODAY ATTENDANCE CARD
          ================================================= */}

      <div className="today-attendance-card">

        <div className="today-attendance-header">

          <div>
            <span className="today-section-label">
              TODAY'S ATTENDANCE
            </span>

            <h2>
              {activeAttendance
                ? formatLongDate(
                    activeAttendance.date
                  )
                : formatLongDate(
                    currentTime
                  )}
            </h2>
          </div>

          <div
            className={`today-status-badge ${
              activeAttendance
                ? getStatusClass(
                    activeAttendance.status
                  )
                : "pending"
            }`}
          >
            <span className="status-dot" />

            {activeAttendance
              ? formatStatus(
                  activeAttendance.status
                )
              : "Not Marked"}
          </div>

        </div>

        <div className="today-attendance-body">

          <div className="today-time-grid">

            <div className="today-time-item">

              <span className="today-time-label">
                CHECK IN
              </span>

              <strong>
                {activeAttendance
                  ?.checkIn?.time
                  ? formatTime(
                      activeAttendance
                        .checkIn.time
                    )
                  : "-"}
              </strong>

            </div>

            <div className="today-time-item">

              <span className="today-time-label">
                CHECK OUT
              </span>

              <strong>
                {activeAttendance
                  ?.checkOut?.time
                  ? formatTime(
                      activeAttendance
                        .checkOut.time
                    )
                  : "-"}
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

                <span>
                  {getMethodIcon(
                    getAttendanceMethod(
                      activeAttendance
                    )
                  )}
                </span>

                <span>
                  {formatMethod(
                    getAttendanceMethod(
                      activeAttendance
                    )
                  )}
                </span>

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
                {actionLoading && (
                  <span className="button-spinner" />
                )}

                {actionLoading
                  ? "Processing..."
                  : "Check In"}
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
                {actionLoading && (
                  <span className="button-spinner" />
                )}

                {actionLoading
                  ? "Processing..."
                  : "Check Out"}
              </button>
            )}

            {isCheckedOut && (
              <div className="checked-out-message">

                <span>
                  ✓
                </span>

                <span>
                  Attendance completed
                  for this shift.
                </span>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* =================================================
          FILTER CARD
          ================================================= */}

      <div className="attendance-filters-card">

        <div className="attendance-filters-header">

          <div>
            <span className="attendance-section-label">
              HISTORY
            </span>

            <h2>
              Attendance History
            </h2>
          </div>

          <span className="attendance-count">
            {
              filteredAttendance.length
            }{" "}
            {
              filteredAttendance.length ===
              1
                ? "Record"
                : "Records"
            }
          </span>

        </div>

        <div className="attendance-filters">

          <div className="filter-group">

            <label>
              Search
            </label>

            <input
              type="text"
              value={
                search
              }
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search attendance..."
              style={{
                minWidth: 180,
                maxWidth:
                  "100%",

                padding:
                  "9px 11px",

                border:
                  "1px solid #e0e5ed",

                borderRadius: 9,

                outline:
                  "none",

                background:
                  "#ffffff",

                color:
                  "#667085",

                fontFamily:
                  "inherit",

                fontSize: 11,
              }}
            />

          </div>

          <div className="filter-group">

            <label>
              Status
            </label>

            <select
              value={
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >
              <option value="ALL">
                All
              </option>

              <option value="PRESENT">
                Present
              </option>

              <option value="ABSENT">
                Absent
              </option>

              <option value="ON_LEAVE">
                On Leave
              </option>

              <option value="HALF_DAY">
                Half Day
              </option>

              <option value="OVERTIME">
                Overtime
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

            </select>

          </div>

          <div className="filter-group">

            <label>
              Method
            </label>

            <select
              value={
                methodFilter
              }
              onChange={(e) =>
                setMethodFilter(
                  e.target.value
                )
              }
            >
              <option value="ALL">
                All
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
            onClick={() => {
              setSearch("");
              setStatusFilter(
                "ALL"
              );
              setMethodFilter(
                "ALL"
              );
            }}
          >
            Clear Filters
          </button>

        </div>

      </div>

      {/* =================================================
          ATTENDANCE CONTENT
          ================================================= */}

      {loading ? (

        <div className="attendance-loading">

          <span className="loading-spinner" />

          <span>
            Loading attendance...
          </span>

        </div>

      ) : paginatedAttendance.length ===
        0 ? (

        <div className="empty-attendance">

          <div className="empty-attendance-icon">
            📅
          </div>

          <h3>
            No attendance records found
          </h3>

          <p>
            No attendance records match
            your current search and
            filter settings.
          </p>

          {(search ||
            statusFilter !==
              "ALL" ||
            methodFilter !==
              "ALL") && (

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "ALL"
                );
                setMethodFilter(
                  "ALL"
                );
              }}
            >
              Clear Filters
            </button>

          )}

        </div>

      ) : (

        <div className="attendance-record-list">

          {paginatedAttendance.map(
            (record) => {

              const method =
                getAttendanceMethod(
                  record
                );

              const workingMinutes =
                record?.workingMinutes ??
                record?.totalWorkingMinutes ??
                0;

              return (
                <div
                  className="attendance-record"
                  key={
                    record?._id ||
                    record?.id ||
                    `${record?.date}-${record?.checkIn?.time}`
                  }
                >

                  <div className="record-date">

                    <strong>
                      {formatDate(
                        record?.date
                      )}
                    </strong>

                    <span>
                      {formatShortDay(
                        record?.date
                      )}
                    </span>

                  </div>

                  <div className="record-status">

                    <span
                      className={`record-status-badge ${getStatusClass(
                        record?.status
                      )}`}
                    >
                      {formatStatus(
                        record?.status
                      )}
                    </span>

                  </div>

                  <div className="record-time">

                    <div>
                      <span>
                        CHECK IN
                      </span>

                      <strong>
                        {record
                          ?.checkIn
                          ?.time
                          ? formatTime(
                              record
                                .checkIn
                                .time
                            )
                          : "-"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        CHECK OUT
                      </span>

                      <strong>
                        {record
                          ?.checkOut
                          ?.time
                          ? formatTime(
                              record
                                .checkOut
                                .time
                            )
                          : "-"}
                      </strong>
                    </div>

                  </div>

                  <div className="record-duration">

                    <span>
                      WORKING TIME
                    </span>

                    <strong>
                      {formatMinutes(
                        workingMinutes
                      )}
                    </strong>

                  </div>

                  <div className="record-method">

                    <span>
                      {getMethodIcon(
                        method
                      )}
                    </span>

                    <strong>
                      {formatMethod(
                        method
                      )}
                    </strong>

                  </div>

                </div>
              );
            }
          )}

        </div>

      )}

      {/* =================================================
          PAGINATION
          ================================================= */}

      {filteredAttendance.length >
        recordsPerPage && (

        <div className="attendance-pagination">

          <button
            type="button"
            disabled={
              currentPage ===
              1
            }
            onClick={() =>
              setCurrentPage(
                (page) =>
                  Math.max(
                    1,
                    page - 1
                  )
              )
            }
          >
            Previous
          </button>

          <div className="pagination-pages">

            {Array.from(
              {
                length:
                  totalPages,
              },
              (_, index) => {

                const page =
                  index + 1;

                return (
                  <button
                    key={page}
                    type="button"
                    className={
                      currentPage ===
                      page
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
                );
              }
            )}

          </div>

          <button
            type="button"
            disabled={
              currentPage ===
              totalPages
            }
            onClick={() =>
              setCurrentPage(
                (page) =>
                  Math.min(
                    totalPages,
                    page + 1
                  )
              )
            }
          >
            Next
          </button>

        </div>

      )}

      {/* =================================================
          WORK REPORT MODAL
          ================================================= */}

      {showWorkReportModal && (

        <div className="work-report-modal-overlay">

          <div className="work-report-modal">

            <div className="modal-header">

              <div>

                <span className="modal-eyebrow">
                  CHECKOUT
                </span>

                <h2>
                  Work Report
                </h2>

                <p>
                  Submit your work report
                  before checkout.
                </p>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  handleCloseWorkReportModal
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

              <label>
                Work Description
              </label>

              <textarea
                value={
                  workReportDescription
                }
                onChange={(e) =>
                  setWorkReportDescription(
                    e.target.value
                  )
                }
                placeholder="Describe the work you completed today..."
                rows={6}
                disabled={
                  workReportLoading
                }
              />

              <div className="work-report-helper">

                <span>
                  Work report is required
                  before checkout.
                </span>

                <span>
                  {
                    workReportDescription.length
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
                  handleCloseWorkReportModal
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
                  handleWorkReportAndCheckout
                }
                disabled={
                  workReportLoading
                }
              >

                {workReportLoading && (
                  <span className="button-spinner" />
                )}

                {workReportLoading
                  ? "Processing..."
                  : "Submit & Check Out"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default MyAttendance;