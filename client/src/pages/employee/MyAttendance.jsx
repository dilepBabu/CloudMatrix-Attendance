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

/*
 * CSS uses:
 * .present
 * .absent
 * .leave
 * .holiday
 * .weekend
 * .missed
 * .half-day
 * .overtime
 * .unknown
 */

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

      /*
       * Excellent GPS.
       * Finish immediately.
       */

      if (accuracy <= 50) {
        finish(position);
      }
    };

    const handleError = (
      error
    ) => {
      if (finished) return;

      /*
       * Do not immediately reject during
       * the first high-accuracy attempt.
       *
       * We allow the fallback to run.
       */

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

    /*
     * Normal GPS fallback.
     */

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

    /*
     * Final timeout.
     */

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

  /*
   * Keep the attendance ID for which
   * checkout was opened.
   *
   * This is important for overnight
   * attendance and prevents a stale
   * report from being used for another
   * attendance.
   */

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

  /* =======================================================
     GPS DEBUG UPDATE
     ======================================================= */

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
     FETCH TODAY WORK REPORT

     IMPORTANT FIX:

     This callback intentionally has an
     EMPTY dependency array.

     currentTime changes every second.
     If currentTime is placed inside the
     dependency array, this function is
     recreated every second.

     That causes the initial useEffect to
     run every second and reset the textarea.

     We therefore use new Date() INSIDE this
     function whenever it actually needs
     today's date.
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

          /*
           * Backend may return:
           *
           * {
           *   success: true,
           *   workReports: [...]
           * }
           *
           * OR:
           *
           * {
           *   success: true,
           *   workReport: {...}
           * }
           */

          let report = null;

          if (
            Array.isArray(
              data?.workReports
            )
          ) {
            /*
             * IMPORTANT:
             *
             * Use a fresh Date here instead
             * of currentTime.
             *
             * This prevents the textarea
             * from being reset every second.
             */

            const todayKey =
              getDateKey(
                new Date()
              );

            /*
             * Prefer today's report.
             */

            const todayReports =
              data.workReports
                .filter(
                  (item) =>
                    getDateKey(
                      item?.date
                    ) ===
                    todayKey
                )
                .sort(
                  (a, b) => {
                    return (
                      new Date(
                        b?.createdAt ||
                          b?.date ||
                          0
                      ).getTime() -
                      new Date(
                        a?.createdAt ||
                          a?.date ||
                          0
                      ).getTime()
                    );
                  }
                );

            report =
              todayReports[0] ||
              null;

            /*
             * If there is exactly one report
             * and it was not matched by date,
             * use it as the returned report.
             *
             * This keeps compatibility with
             * your existing backend response.
             */

            if (
              !report &&
              data.workReports.length ===
                1
            ) {
              report =
                data.workReports[0];
            }
          } else {
            /*
             * Backend returned a single report.
             */

            report =
              data?.workReport ||
              data?.report ||
              null;
          }

          /*
           * Report exists.
           */

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

          /*
           * No report exists.
           */

          setWorkReportExists(
            false
          );

          setWorkReportDescription(
            ""
          );

          return null;
        } catch (error) {
          /*
           * 404 simply means no report
           * exists yet.
           */

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

          return null;
        }
      },

      /*
       * IMPORTANT:
       *
       * DO NOT ADD currentTime HERE.
       *
       * It must stay [].
       */

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

     OVERNIGHT SHIFT SUPPORT

     Example:

     Oct 7 7:00 PM
     ->
     Oct 8 3:00 AM

     The attendance DATE remains
     Oct 7, but it is still the active
     attendance until checkout.
     ======================================================= */

  const activeAttendance =
    useMemo(() => {
      const todayKey =
        getDateKey(
          currentTime
        );

      /* ---------------------------------------------------
         Today's attendance
         --------------------------------------------------- */

      const todayAttendance =
        attendance.find(
          (record) =>
            getDateKey(
              record?.date
            ) === todayKey
        ) || null;

      /* ---------------------------------------------------
         Today's OPEN attendance
         --------------------------------------------------- */

      if (
        todayAttendance
          ?.checkIn?.time &&
        !todayAttendance
          ?.checkOut?.time
      ) {
        return todayAttendance;
      }

      /* ---------------------------------------------------
         Find latest OPEN attendance
         within previous 24 hours.
         --------------------------------------------------- */

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
            (a, b) => {
              return (
                new Date(
                  b.checkIn.time
                ).getTime() -
                new Date(
                  a.checkIn.time
                ).getTime()
              );
            }
          )[0] || null;

      /* ---------------------------------------------------
         Open overnight attendance wins.
         --------------------------------------------------- */

      if (
        openAttendance
      ) {
        return openAttendance;
      }

      /* ---------------------------------------------------
         Otherwise today's record.
         --------------------------------------------------- */

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

      /* Already checked out */

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

      /* Still checked in */

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

      /* Search */

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

      /* Status */

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

      /* Method */

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

      /* Newest first */

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
     RESET PAGE WHEN FILTER CHANGES
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

      try {
        setActionLoading(
          true
        );

        setMessage("");
        setMessageType("");

        /*
         * Save exactly which attendance
         * we are checking out.
         *
         * This is important for overnight
         * shifts.
         */

        setCheckoutAttendanceId(
          activeAttendance?._id ||
            activeAttendance?.id ||
            null
        );

        /*
         * Load existing report.
         *
         * If one already exists, its
         * description is loaded.
         *
         * If none exists, textarea stays
         * empty.
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
     WORK REPORT + CHECK OUT
     ======================================================= */

  const handleWorkReportAndCheckout =
    async () => {
      if (
        workReportLoading
      ) {
        return;
      }

      /*
       * Always use the attendance that
       * was selected when the modal opened.
       */

      const currentAttendanceId =
        checkoutAttendanceId ||
        activeAttendance?._id ||
        activeAttendance?.id ||
        null;

      try {
        setWorkReportLoading(
          true
        );

        setMessage("");
        setMessageType("");

        /* =================================================
           1. VALIDATE ATTENDANCE
           ================================================= */

        if (
          !currentAttendanceId
        ) {
          setMessage(
            "Unable to identify the active attendance. Please refresh the page and try again."
          );

          setMessageType(
            "error"
          );

          return;
        }

        /*
         * Make sure the selected attendance
         * is still open.
         */

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
          ) ||
          activeAttendance;

        if (
          !selectedAttendance
        ) {
          setMessage(
            "Active attendance could not be found. Please refresh the page and try again."
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

          return;
        }

        /* =================================================
           2. VALIDATE WORK REPORT
           ================================================= */

        const description =
          workReportDescription.trim();

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

        /* =================================================
           3. SAVE WORK REPORT
           ================================================= */

        let reportResponse;

        if (
          workReportExists
        ) {
          /*
           * Existing report:
           * update it.
           */

          reportResponse =
            await api.put(
              "/work-reports/my",
              {
                description,
              }
            );
        } else {
          /*
           * No report:
           * create it.
           */

          reportResponse =
            await api.post(
              "/work-reports",
              {
                description,
              }
            );
        }

        /*
         * Do not continue to checkout if
         * backend did not confirm success.
         */

        if (
          !reportResponse?.data
            ?.success
        ) {
          throw new Error(
            reportResponse?.data
              ?.message ||
              "Unable to save work report."
          );
        }

        setWorkReportExists(
          true
        );

        /* =================================================
           4. VERIFY REPORT WAS SAVED
           ================================================= */

        let savedReport =
          null;

        try {
          const verifyResponse =
            await api.get(
              "/work-reports/my"
            );

          const verifyData =
            verifyResponse?.data;

          const reports =
            Array.isArray(
              verifyData?.workReports
            )
              ? verifyData.workReports
              : [];

          /*
           * First try to find report
           * using attendanceId.
           */

          savedReport =
            reports.find(
              (report) =>
                String(
                  report?.attendanceId
                    ?._id ||
                    report?.attendanceId ||
                    ""
                ) ===
                String(
                  currentAttendanceId
                )
            ) || null;

          /*
           * If backend returns a single
           * report instead of an array,
           * use it.
           */

          if (
            !savedReport &&
            verifyData?.workReport
          ) {
            const singleReport =
              verifyData.workReport;

            const reportAttendanceId =
              singleReport
                ?.attendanceId?._id ||
              singleReport
                ?.attendanceId ||
              null;

            if (
              !reportAttendanceId ||
              String(
                reportAttendanceId
              ) ===
                String(
                  currentAttendanceId
                )
            ) {
              savedReport =
                singleReport;
            }
          }
        } catch (verifyError) {
          /*
           * Do NOT fail checkout just
           * because verification GET
           * has a problem.
           *
           * Backend checkout itself
           * verifies the report.
           */

          console.warn(
            "WORK REPORT VERIFICATION WARNING:",
            verifyError
          );
        }

        /*
         * Keep the report description
         * in state.
         */

        setWorkReportDescription(
          description
        );

        /* =================================================
           5. CHECK ATTENDANCE METHOD
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
          "CHECKOUT ATTENDANCE:",
          selectedAttendance
        );

        console.log(
          "CHECKOUT ATTENDANCE ID:",
          currentAttendanceId
        );

        console.log(
          "CHECKOUT METHOD:",
          attendanceMethod
        );

        /* =================================================
           6. GPS ONLY FOR OFFICE
           ================================================= */

        let checkoutPayload =
          {};

        /*
         * REMOTE and FIELD do NOT require
         * GPS in your backend.
         *
         * Only OFFICE requires GPS.
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
            "CHECK-OUT GPS:",
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
        } else {
          /*
           * Remote / Field:
           * no GPS required.
           */

          setGpsDebug({
            source:
              `CHECKOUT METHOD ${attendanceMethod} - GPS NOT REQUIRED`,
          });
        }

        /* =================================================
           7. CHECK OUT
           ================================================= */

        console.log(
          "CHECKOUT REQUEST PAYLOAD:",
          checkoutPayload
        );

        const response =
          await api.post(
            "/attendance/check-out",
            checkoutPayload
          );

        const data =
          response?.data;

        /*
         * Backend must explicitly confirm
         * checkout success.
         */

        if (
          !data?.success
        ) {
          throw new Error(
            data?.message ||
              "Checkout failed."
          );
        }

        /* =================================================
           8. SUCCESS
           ================================================= */

        setMessage(
          data?.message ||
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
         * Refresh attendance first.
         */

        await fetchAttendance();

        /*
         * Refresh report after checkout.
         */

        await fetchTodayWorkReport();
      } catch (error) {
        console.error(
          "WORK REPORT + CHECKOUT ERROR:",
          error
        );

        /*
         * If report save succeeded but
         * checkout failed because of GPS,
         * leave the report saved.
         *
         * User can click Submit & Check Out
         * again.
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

        /*
         * Backend GPS rejection details.
         */

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
     CLOSE WORK REPORT MODAL
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

        {/* Current date / clock */}

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

        {/* HEADER */}

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

        {/* BODY */}

        <div className="today-attendance-body">

          {/* TIME GRID */}

          <div className="today-time-grid">

            {/* CHECK IN */}

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

            {/* CHECK OUT */}

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

            {/* WORKING TIME */}

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

            {/* METHOD */}

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

          {/* ACTION BUTTONS */}

          <div className="today-attendance-actions">

            {/* CHECK IN */}

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

            {/* CHECK OUT */}

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

            {/* COMPLETED */}

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

        {/* FILTER HEADER */}

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

        {/* FILTERS */}

        <div className="attendance-filters">

          {/* SEARCH */}

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

          {/* STATUS */}

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

          {/* METHOD */}

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

          {/* CLEAR */}

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

                  {/* DATE */}

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

                  {/* STATUS */}

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

                  {/* CHECK IN / CHECK OUT */}

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

                  {/* WORKING TIME */}

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

                  {/* METHOD */}

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

          {/* PREVIOUS */}

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

          {/* PAGE NUMBERS */}

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

          {/* NEXT */}

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

            {/* MODAL HEADER */}

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

              {/* CLOSE */}

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

            {/* MODAL BODY */}

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

            {/* MODAL FOOTER */}

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