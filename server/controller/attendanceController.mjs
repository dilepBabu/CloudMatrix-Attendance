import Attendance from "../model/Attendance.mjs";
import Employee from "../model/Employee.mjs";
import CompanySettings from "../model/CompanySettings.mjs";
import mongoose from "mongoose";
import WorkReport from "../model/WorkReport.mjs";
import Holiday from "../model/Holiday.mjs";
import Leave from "../model/Leave.mjs";
import RemoteRequest from "../model/RemoteRequest.mjs";
import OvertimeRequest from "../model/OvertimeRequest.mjs";

import {
  getCompanyDateKey,
  getCompanyDateParts,
  getCompanyDayStart,
  getCompanyDayStartFromDate,
  getCompanyDayEndFromDate,
  getCurrentCompanyDayStart,
  getCompanyMonthRange,
  getDaysInMonth,
  getCompanyDayOfWeek,
  parseCompanyDate,
  parseCompanyDateTime,
} from "../utils/dateUtils.mjs";


/* =========================================================
   GPS CONFIGURATION
   ========================================================= */

const MAX_GPS_ACCURACY = 300;


/* =========================================================
   CALCULATE DISTANCE BETWEEN GPS COORDINATES
   ========================================================= */

const calculateDistance = (
  latitude1,
  longitude1,
  latitude2,
  longitude2
) => {
  const earthRadius = 6371000;

  const lat1 =
    (latitude1 * Math.PI) / 180;

  const lat2 =
    (latitude2 * Math.PI) / 180;

  const latitudeDifference =
    ((latitude2 - latitude1) *
      Math.PI) /
    180;

  const longitudeDifference =
    ((longitude2 - longitude1) *
      Math.PI) /
    180;

  const a =
    Math.sin(
      latitudeDifference / 2
    ) *
      Math.sin(
        latitudeDifference / 2
      ) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        longitudeDifference / 2
      ) *
      Math.sin(
        longitudeDifference / 2
      );

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
};


/* =========================================================
   VALIDATE GPS DATA
   ========================================================= */

const validateGpsData = (
  latitude,
  longitude,
  accuracy
) => {
  const parsedLatitude =
    Number(latitude);

  const parsedLongitude =
    Number(longitude);

  const parsedAccuracy =
    Number(accuracy);

  if (
    !Number.isFinite(
      parsedLatitude
    ) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90
  ) {
    return {
      valid: false,
      message:
        "Invalid latitude",
    };
  }

  if (
    !Number.isFinite(
      parsedLongitude
    ) ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    return {
      valid: false,
      message:
        "Invalid longitude",
    };
  }

  if (
    !Number.isFinite(
      parsedAccuracy
    ) ||
    parsedAccuracy < 0
  ) {
    return {
      valid: false,
      message:
        "Valid GPS accuracy is required",
    };
  }

  return {
    valid: true,
    latitude:
      parsedLatitude,
    longitude:
      parsedLongitude,
    accuracy:
      parsedAccuracy,
  };
};


/* =========================================================
   GET APPROVED TEMPORARY REMOTE/WFH REQUEST
   ========================================================= */

const getAttendanceMethod =
  async (
    employee,
    date
  ) => {
    const permanentMethod =
      employee.attendanceMethod;

    if (
      permanentMethod !==
      "OFFICE"
    ) {
      return permanentMethod;
    }

    const dayStart =
      getCompanyDayStartFromDate(
        date
      );

    const dayEnd =
      getCompanyDayEndFromDate(
        date
      );

    const remoteRequest =
      await RemoteRequest.findOne({
        employeeId:
          employee._id,

        date: {
          $gte:
            dayStart,

          $lte:
            dayEnd,
        },

        status:
          "APPROVED",

        requestedMethod:
          "REMOTE",
      });

    if (remoteRequest) {
      return "REMOTE";
    }

    return permanentMethod;
  };


/* =========================================================
   GET APPROVED OVERTIME
   ========================================================= */

const getApprovedOvertime =
  async (
    employeeId,
    date
  ) => {
    const dayStart =
      getCompanyDayStartFromDate(
        date
      );

    const dayEnd =
      getCompanyDayEndFromDate(
        date
      );

    const overtimeRequest =
      await OvertimeRequest.findOne({
        employeeId,

        date: {
          $gte:
            dayStart,

          $lte:
            dayEnd,
        },

        status:
          "APPROVED",
      });

    return overtimeRequest;
  };


/* =========================================================
   GET APPROVED LEAVE

   APPROVED LEAVE > OVERTIME
   ========================================================= */

const getApprovedLeave =
  async (
    employeeId,
    date
  ) => {
    const dayStart =
      getCompanyDayStartFromDate(
        date
      );

    const dayEnd =
      getCompanyDayEndFromDate(
        date
      );

    const leave =
      await Leave.findOne({
        employeeId,

        status:
          "APPROVED",

        startDate: {
          $lte:
            dayEnd,
        },

        endDate: {
          $gte:
            dayStart,
        },
      });

    return leave;
  };


/* =========================================================
   MARK MISSED CHECKOUT

   Night-shift safe.

   An attendance is only marked missed after
   remaining open for more than 24 hours.
   ========================================================= */

const markMissedCheckout =
  async (
    employeeId
  ) => {
    try {
      const now =
        new Date();

      const staleCutoff =
        new Date(
          now.getTime() -
            24 *
              60 *
              60 *
              1000
        );

      await Attendance.updateMany(
        {
          employeeId,

          "checkIn.time": {
            $exists: true,
            $lt:
              staleCutoff,
          },

          "checkOut.time": {
            $exists: false,
          },

          status:
            "PRESENT",
        },
        {
          $set: {
            status:
              "MISSED_CHECKOUT",
          },
        }
      );
    } catch (error) {
      console.error(
        "Mark Missed Checkout Error:",
        error
      );
    }
  };


/* =========================================================
   CHECK HOLIDAY
   ========================================================= */

const isHoliday =
  async (
    date
  ) => {
    const startOfDay =
      getCompanyDayStartFromDate(
        date
      );

    const endOfDay =
      getCompanyDayEndFromDate(
        date
      );

    const holiday =
      await Holiday.findOne({
        date: {
          $gte:
            startOfDay,

          $lte:
            endOfDay,
        },

        isActive:
          true,
      });

    return holiday;
  };


/* =========================================================
   EMPLOYEE CHECK-IN
   ========================================================= */

export const checkIn =
  async (
    req,
    res
  ) => {
    try {

      const {
        latitude,
        longitude,
        accuracy,
      } = req.body;


      /* ===================================================
         FIND EMPLOYEE FIRST
         =================================================== */

      const employee =
        await Employee.findOne({
          userId:
            req.user._id,

          employmentStatus:
            "ACTIVE",
        });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Active employee profile not found",
        });
      }


      /* ===================================================
         CURRENT TIME
         =================================================== */

      const now =
        new Date();


      /* ===================================================
         DETERMINE ATTENDANCE METHOD
         =================================================== */

      const attendanceMethod =
        await getAttendanceMethod(
          employee,
          now
        );


      /* ===================================================
         VALIDATE METHOD
         =================================================== */

      if (
        ![
          "OFFICE",
          "REMOTE",
          "FIELD",
        ].includes(
          attendanceMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance method configured for employee",
        });
      }


      /* ===================================================
         GPS VALIDATION
         
         GPS is required only when OFFICE attendance
         actually needs office-radius validation.

         For REMOTE / FIELD we do not force GPS.
         =================================================== */

      let gps = null;

      if (
        attendanceMethod ===
        "OFFICE"
      ) {
        const gpsValidation =
          validateGpsData(
            latitude,
            longitude,
            accuracy
          );

        if (
          !gpsValidation.valid
        ) {
          return res.status(400).json({
            success: false,
            message:
              gpsValidation.message,
          });
        }

        gps =
          gpsValidation;
      }


      /* ===================================================
         TODAY COMPANY DAY
         =================================================== */

      const startOfDay =
        getCurrentCompanyDayStart();

      const endOfDay =
        getCompanyDayEndFromDate(
          now
        );


      /* ===================================================
         APPROVED LEAVE
         =================================================== */

      const approvedLeave =
        await getApprovedLeave(
          employee._id,
          now
        );

      if (approvedLeave) {
        return res.status(403).json({
          success: false,
          message:
            "Check-in is not allowed because you are on approved leave",

          leave: {
            leaveType:
              approvedLeave.leaveType,

            startDate:
              approvedLeave.startDate,

            endDate:
              approvedLeave.endDate,

            reason:
              approvedLeave.reason,
          },
        });
      }


      /* ===================================================
         HOLIDAY
         =================================================== */

      const holiday =
        await isHoliday(
          now
        );


      /* ===================================================
         OVERTIME
         =================================================== */

      const overtimeRequest =
        await getApprovedOvertime(
          employee._id,
          now
        );

      const hasApprovedOvertime =
        Boolean(
          overtimeRequest
        );


      /* ===================================================
         DAY OF WEEK
         =================================================== */

      const currentDateParts =
        getCompanyDateParts(
          now
        );

      const dayOfWeek =
        getCompanyDayOfWeek(
          currentDateParts.year,
          currentDateParts.month,
          currentDateParts.day
        );

      const isSunday =
        dayOfWeek === 0;


      /* ===================================================
         SUNDAY
         =================================================== */

      if (
        isSunday &&
        !hasApprovedOvertime
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Sunday attendance is not allowed without approved overtime",
        });
      }


      /* ===================================================
         HOLIDAY
         =================================================== */

      if (
        holiday &&
        !hasApprovedOvertime
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Check-in is not allowed on a company holiday without approved overtime",

          holiday: {
            name:
              holiday.name,

            date:
              holiday.date,

            description:
              holiday.description,
          },
        });
      }


      /* ===================================================
         OVERTIME FLAG
         =================================================== */

      const isOvertime =
        hasApprovedOvertime &&
        (
          isSunday ||
          Boolean(
            holiday
          )
        );


      /* ===================================================
         MARK STALE ATTENDANCE
         =================================================== */

      await markMissedCheckout(
        employee._id
      );


      /* ===================================================
         CHECK OPEN ATTENDANCE
         
         This prevents:
         
         Oct 6 7 PM -> check in
         Oct 7 7 PM -> check in again
         
         when Oct 6 attendance is still open.
         =================================================== */

      const openAttendance =
        await Attendance.findOne({
          employeeId:
            employee._id,

          "checkIn.time": {
            $exists: true,
          },

          "checkOut.time": {
            $exists: false,
          },

          status:
            "PRESENT",
        })
          .sort({
            "checkIn.time":
              -1,
          });

      if (openAttendance) {
        return res.status(400).json({
          success: false,

          message:
            "You already have an open attendance. Please check out from your previous shift before checking in again.",

          attendance: {
            id:
              openAttendance._id,

            date:
              openAttendance.date,

            checkIn:
              openAttendance.checkIn,

            status:
              openAttendance.status,
          },
        });
      }


      /* ===================================================
         DUPLICATE TODAY ATTENDANCE
         =================================================== */

      const existingAttendance =
        await Attendance.findOne({
          employeeId:
            employee._id,

          date: {
            $gte:
              startOfDay,

            $lte:
              endOfDay,
          },
        });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          message:
            "You have already checked in today",
        });
      }


      /* ===================================================
         COMPANY SETTINGS
         =================================================== */

      const settings =
        await CompanySettings.findOne();

      if (!settings) {
        return res.status(500).json({
          success: false,
          message:
            "Office location has not been configured",
        });
      }


      /* ===================================================
         OFFICE ATTENDANCE
         =================================================== */

      if (
        attendanceMethod ===
        "OFFICE"
      ) {

        if (
          !settings.officeAttendanceEnabled
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Office attendance is currently disabled",
          });
        }


        /* ===============================================
           GPS ACCURACY
           =============================================== */

        if (
          gps.accuracy >
          MAX_GPS_ACCURACY
        ) {
          return res.status(403).json({
            success: false,

            message:
              "GPS accuracy is too low. Please move to an open area and try again.",

            accuracy:
              Math.round(
                gps.accuracy
              ),

            maximumAllowedAccuracy:
              MAX_GPS_ACCURACY,
          });
        }


        /* ===============================================
           OFFICE DISTANCE
           =============================================== */

        const distance =
          calculateDistance(
            gps.latitude,
            gps.longitude,
            settings
              .officeLocation
              .latitude,
            settings
              .officeLocation
              .longitude
          );

console.log("========== MOBILE GPS CHECK ==========");

console.log({
  userLatitude: gps.latitude,
  userLongitude: gps.longitude,
  gpsAccuracy: gps.accuracy,

  officeLatitude:
    settings.officeLocation.latitude,

  officeLongitude:
    settings.officeLocation.longitude,

  officeRadius:
    settings.officeLocation.radius,

  calculatedDistance: distance,
});

console.log("======================================");
        console.log(
          "CHECK-IN GPS CHECK:",
          {
            userLatitude:
              gps.latitude,

            userLongitude:
              gps.longitude,

            accuracy:
              gps.accuracy,

            officeLatitude:
              settings
                .officeLocation
                .latitude,

            officeLongitude:
              settings
                .officeLocation
                .longitude,

            officeRadius:
              settings
                .officeLocation
                .radius,

            distance,
          }
        );


        if (
          distance >
          settings
            .officeLocation
            .radius
        ) {
          return res.status(403).json({
            success: false,

            message:
              "You are outside the office attendance area",

            distance:
              Math.round(
                distance
              ),

            allowedRadius:
              settings
                .officeLocation
                .radius,
          });
        }
      }


      /* ===================================================
         CREATE ATTENDANCE
         
         For REMOTE / FIELD, GPS fields are simply omitted.
         For OFFICE, GPS is saved.
         =================================================== */

      const attendanceData = {
        employeeId:
          employee._id,

        userId:
          req.user._id,

        date:
          startOfDay,

        checkIn: {
          time:
            now,

          method:
            attendanceMethod,
        },

        status:
          "PRESENT",

        workingMinutes:
          0,

        isOvertime,

        overtimeMinutes:
          0,
      };


      if (
        attendanceMethod ===
        "OFFICE"
      ) {
        attendanceData.checkIn.location =
          {
            latitude:
              gps.latitude,

            longitude:
              gps.longitude,

            accuracy:
              gps.accuracy,
          };
      }


      const attendance =
        await Attendance.create(
          attendanceData
        );


      return res.status(201).json({
        success: true,

        message:
          isOvertime
            ? "Overtime check-in successful"
            : "Check-in successful",

        attendance: {
          id:
            attendance._id,

          employeeId:
            employee.employeeId,

          checkIn:
            attendance.checkIn,

          status:
            attendance.status,

          isOvertime:
            attendance.isOvertime,

          overtimeMinutes:
            attendance.overtimeMinutes,
        },
      });

    } catch (error) {

      console.error(
        "Check-In Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };


/* =========================================================
   EMPLOYEE CHECK-OUT
   ========================================================= */

export const checkOut =
  async (
    req,
    res
  ) => {
    try {

      const {
        latitude,
        longitude,
        accuracy,
      } = req.body;


      /* ===================================================
         FIND EMPLOYEE
         =================================================== */

      const employee =
        await Employee.findOne({
          userId:
            req.user._id,

          employmentStatus:
            "ACTIVE",
        });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Active employee profile not found",
        });
      }


      /* ===================================================
         CURRENT TIME
         =================================================== */

      const now =
        new Date();


      /* ===================================================
         OPEN ATTENDANCE
         
         IMPORTANT:
         Search by check-in time rather than today's date.
         
         This supports:
         
         Oct 6 7 PM
         ->
         Oct 7 3 AM
         =================================================== */

      const openAttendanceCutoff =
        new Date(
          now.getTime() -
            24 *
              60 *
              60 *
              1000
        );


      const attendance =
        await Attendance.findOne({
          employeeId:
            employee._id,

          "checkIn.time": {
            $exists: true,

            $gte:
              openAttendanceCutoff,
          },

          "checkOut.time": {
            $exists: false,
          },

          status:
            "PRESENT",
        })
          .sort({
            "checkIn.time":
              -1,
          });


      if (!attendance) {
        return res.status(400).json({
          success: false,
          message:
            "You do not have an active attendance to check out. Your previous attendance may have been marked as missed checkout.",
        });
      }


      /* ===================================================
         DUPLICATE CHECKOUT
         =================================================== */

      if (
        attendance.checkOut?.time
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You have already checked out",
        });
      }


      /* ===================================================
         SHIFT DATE
         
         IMPORTANT FOR NIGHT SHIFT.
         =================================================== */

      const shiftDate =
        attendance.date;


      /* ===================================================
         APPROVED LEAVE
         =================================================== */

      const approvedLeave =
        await getApprovedLeave(
          employee._id,
          shiftDate
        );

      if (approvedLeave) {
        return res.status(403).json({
          success: false,

          message:
            "Check-out is not allowed because you are on approved leave",

          leave: {
            leaveType:
              approvedLeave.leaveType,

            startDate:
              approvedLeave.startDate,

            endDate:
              approvedLeave.endDate,

            reason:
              approvedLeave.reason,
          },
        });
      }


      /* ===================================================
         HOLIDAY
         =================================================== */

      const holiday =
        await isHoliday(
          shiftDate
        );


      if (
        holiday &&
        !attendance.isOvertime
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Check-out is not allowed on a company holiday without approved overtime",

          holiday: {
            name:
              holiday.name,

            date:
              holiday.date,

            description:
              holiday.description,
          },
        });
      }


      /* ===================================================
         SHIFT DAY
         =================================================== */

      const shiftDateParts =
        getCompanyDateParts(
          shiftDate
        );

      const shiftDayOfWeek =
        getCompanyDayOfWeek(
          shiftDateParts.year,
          shiftDateParts.month,
          shiftDateParts.day
        );

      const isShiftSunday =
        shiftDayOfWeek === 0;


      if (
        isShiftSunday &&
        !attendance.isOvertime
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Sunday attendance requires approved overtime",
        });
      }


      /* ===================================================
         WORK REPORT
         =================================================== */

      const workReport =
        await WorkReport.findOne({
          attendanceId:
            attendance._id,
        });

      if (!workReport) {
        return res.status(400).json({
          success: false,
          message:
            "Please submit your work report before checking out",
        });
      }


      /* ===================================================
         COMPANY SETTINGS
         =================================================== */

      const settings =
        await CompanySettings.findOne();

      if (!settings) {
        return res.status(500).json({
          success: false,
          message:
            "Office location has not been configured",
        });
      }


      /* ===================================================
         ATTENDANCE METHOD
         =================================================== */

      const attendanceMethod =
        attendance.checkIn
          ?.method;


      if (
        ![
          "OFFICE",
          "REMOTE",
          "FIELD",
        ].includes(
          attendanceMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance method recorded for this check-in",
        });
      }


      /* ===================================================
         GPS ONLY FOR OFFICE
         =================================================== */

      let gps = null;

      if (
        attendanceMethod ===
        "OFFICE"
      ) {

        const gpsValidation =
          validateGpsData(
            latitude,
            longitude,
            accuracy
          );

        if (
          !gpsValidation.valid
        ) {
          return res.status(400).json({
            success: false,
            message:
              gpsValidation.message,
          });
        }

        gps =
          gpsValidation;


        /* ===============================================
           OFFICE ATTENDANCE ENABLED
           =============================================== */

        if (
          !settings
            .officeAttendanceEnabled
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Office attendance is currently disabled",
          });
        }


        /* ===============================================
           GPS ACCURACY
           =============================================== */

        if (
          gps.accuracy >
          MAX_GPS_ACCURACY
        ) {
          return res.status(403).json({
            success: false,

            message:
              "GPS accuracy is too low. Please move to an open area and try again.",

            accuracy:
              Math.round(
                gps.accuracy
              ),

            maximumAllowedAccuracy:
              MAX_GPS_ACCURACY,
          });
        }


        /* ===============================================
           OFFICE DISTANCE
           =============================================== */

        const distance =
          calculateDistance(
            gps.latitude,
            gps.longitude,

            settings
              .officeLocation
              .latitude,

            settings
              .officeLocation
              .longitude
          );


        console.log(
          "CHECK-OUT GPS CHECK:",
          {
            userLatitude:
              gps.latitude,

            userLongitude:
              gps.longitude,

            accuracy:
              gps.accuracy,

            officeLatitude:
              settings
                .officeLocation
                .latitude,

            officeLongitude:
              settings
                .officeLocation
                .longitude,

            officeRadius:
              settings
                .officeLocation
                .radius,

            distance,
          }
        );


        if (
          distance >
          settings
            .officeLocation
            .radius
        ) {
          return res.status(403).json({
            success: false,

            message:
              "You are outside the office attendance area",

            distance:
              Math.round(
                distance
              ),

            allowedRadius:
              settings
                .officeLocation
                .radius,
          });
        }
      }


      /* ===================================================
         CALCULATE WORKING MINUTES
         
         Works across midnight automatically.
         =================================================== */

      const checkInTime =
        attendance.checkIn.time;

      const workingMilliseconds =
        now.getTime() -
        new Date(
          checkInTime
        ).getTime();

      const workingMinutes =
        Math.floor(
          workingMilliseconds /
            (1000 * 60)
        );


      /* ===================================================
         OVERTIME
         =================================================== */

      if (
        attendance.isOvertime
      ) {
        attendance.overtimeMinutes =
          workingMinutes;
      } else {
        attendance.overtimeMinutes =
          0;
      }


      /* ===================================================
         CHECKOUT DATA
         =================================================== */

      attendance.checkOut = {
        time:
          now,

        method:
          attendanceMethod,
      };


      if (
        attendanceMethod ===
        "OFFICE"
      ) {
        attendance.checkOut.location =
          {
            latitude:
              gps.latitude,

            longitude:
              gps.longitude,

            accuracy:
              gps.accuracy,
          };
      }


      attendance.workingMinutes =
        workingMinutes;


      await attendance.save();


      return res.status(200).json({
        success: true,

        message:
          attendance.isOvertime
            ? "Overtime check-out successful"
            : "Check-out successful",

        attendance: {
          id:
            attendance._id,

          employeeId:
            employee.employeeId,

          checkIn:
            attendance.checkIn,

          checkOut:
            attendance.checkOut,

          status:
            attendance.status,

          workingMinutes:
            attendance.workingMinutes,

          isOvertime:
            attendance.isOvertime,

          overtimeMinutes:
            attendance.overtimeMinutes,
        },
      });

    } catch (error) {

      console.error(
        "Check-Out Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };


/* =========================================================
   GET MY ATTENDANCE
   ========================================================= */

export const getMyAttendance =
  async (
    req,
    res
  ) => {
    try {

      const employee =
        await Employee.findOne({
          userId:
            req.user._id,

          employmentStatus:
            "ACTIVE",
        });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Active employee profile not found",
        });
      }


      const attendanceRecords =
        await Attendance.find({
          employeeId:
            employee._id,
        })
          .sort({
            date: -1,
          })
          .select(
            "date checkIn checkOut status workingMinutes isOvertime overtimeMinutes createdAt updatedAt"
          );


      return res.status(200).json({
        success: true,

        count:
          attendanceRecords.length,

        attendance:
          attendanceRecords,
      });

    } catch (error) {

      console.error(
        "Get My Attendance Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };


/* =========================================================
   GET MY MONTHLY ATTENDANCE SUMMARY
   ========================================================= */

export const getMyAttendanceSummary =
  async (
    req,
    res
  ) => {
    try {

      const {
        month,
        year,
      } = req.query;


      /* ===================================================
         CURRENT COMPANY DATE
         =================================================== */

      const currentDateParts =
        getCompanyDateParts(
          new Date()
        );

      const currentYear =
        currentDateParts.year;

      const currentMonth =
        currentDateParts.month;

      const currentDay =
        currentDateParts.day;


      const selectedMonth =
        month
          ? Number(month)
          : currentMonth;

      const selectedYear =
        year
          ? Number(year)
          : currentYear;


      /* ===================================================
         VALIDATE MONTH
         =================================================== */

      if (
        !Number.isInteger(
          selectedMonth
        ) ||
        selectedMonth < 1 ||
        selectedMonth > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid month",
        });
      }


      /* ===================================================
         VALIDATE YEAR
         =================================================== */

      if (
        !Number.isInteger(
          selectedYear
        ) ||
        selectedYear < 2000 ||
        selectedYear > 2100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid year",
        });
      }


      /* ===================================================
         EMPLOYEE
         =================================================== */

      const employee =
        await Employee.findOne({
          userId:
            req.user._id,

          employmentStatus:
            "ACTIVE",
        });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Active employee profile not found",
        });
      }


      /* ===================================================
         MONTH RANGE
         =================================================== */

      const {
        start: startOfMonth,
        end: endOfMonth,
      } =
        getCompanyMonthRange(
          selectedYear,
          selectedMonth
        );


      /* ===================================================
         ATTENDANCE
         =================================================== */

      const attendanceRecords =
        await Attendance.find({
          employeeId:
            employee._id,

          date: {
            $gte:
              startOfMonth,

            $lte:
              endOfMonth,
          },
        })
          .sort({
            date: 1,
          });


      /* ===================================================
         HOLIDAYS
         =================================================== */

      const holidays =
        await Holiday.find({
          date: {
            $gte:
              startOfMonth,

            $lte:
              endOfMonth,
          },

          isActive:
            true,
        })
          .sort({
            date: 1,
          });


      /* ===================================================
         APPROVED LEAVES
         =================================================== */

      const approvedLeaves =
        await Leave.find({
          employeeId:
            employee._id,

          status:
            "APPROVED",

          startDate: {
            $lte:
              endOfMonth,
          },

          endDate: {
            $gte:
              startOfMonth,
          },
        })
          .sort({
            startDate: 1,
          });


      /* ===================================================
         APPROVED REMOTE REQUESTS
         =================================================== */

      const approvedRemoteRequests =
        await RemoteRequest.find({
          employeeId:
            employee._id,

          status:
            "APPROVED",

          requestedMethod:
            "REMOTE",

          date: {
            $gte:
              startOfMonth,

            $lte:
              endOfMonth,
          },
        })
          .sort({
            date: 1,
          });


      /* ===================================================
         APPROVED OVERTIME REQUESTS
         =================================================== */

      const approvedOvertimeRequests =
        await OvertimeRequest.find({
          employeeId:
            employee._id,

          status:
            "APPROVED",

          date: {
            $gte:
              startOfMonth,

            $lte:
              endOfMonth,
          },
        })
          .sort({
            date: 1,
          });


      /* ===================================================
         ATTENDANCE MAP
         =================================================== */

      const attendanceMap =
        new Map();

      for (
        const attendance of
        attendanceRecords
      ) {
        const dateKey =
          getCompanyDateKey(
            attendance.date
          );

        attendanceMap.set(
          dateKey,
          attendance
        );
      }


      /* ===================================================
         HOLIDAY MAP
         =================================================== */

      const holidayMap =
        new Map();

      for (
        const holiday of
        holidays
      ) {
        const dateKey =
          getCompanyDateKey(
            holiday.date
          );

        holidayMap.set(
          dateKey,
          holiday
        );
      }


      /* ===================================================
         LEAVE MAP
         =================================================== */

      const leaveMap =
        new Map();

      for (
        const leave of
        approvedLeaves
      ) {
        const leaveStart =
          getCompanyDayStartFromDate(
            leave.startDate
          );

        const leaveEnd =
          getCompanyDayStartFromDate(
            leave.endDate
          );

        let currentLeaveDay =
          new Date(
            leaveStart
          );

        while (
          currentLeaveDay <=
          leaveEnd
        ) {
          const dateKey =
            getCompanyDateKey(
              currentLeaveDay
            );

          leaveMap.set(
            dateKey,
            leave
          );

          currentLeaveDay =
            new Date(
              currentLeaveDay.getTime() +
                24 *
                  60 *
                  60 *
                  1000
            );
        }
      }


      /* ===================================================
         REMOTE MAP
         =================================================== */

      const remoteRequestMap =
        new Map();

      for (
        const request of
        approvedRemoteRequests
      ) {
        const dateKey =
          getCompanyDateKey(
            request.date
          );

        remoteRequestMap.set(
          dateKey,
          request
        );
      }


      /* ===================================================
         OVERTIME MAP
         =================================================== */

      const overtimeRequestMap =
        new Map();

      for (
        const request of
        approvedOvertimeRequests
      ) {
        const dateKey =
          getCompanyDateKey(
            request.date
          );

        overtimeRequestMap.set(
          dateKey,
          request
        );
      }


      /* ===================================================
         DAYS
         =================================================== */

      const daysInMonth =
        getDaysInMonth(
          selectedYear,
          selectedMonth
        );


      let lastDayToProcess =
        daysInMonth;


      if (
        selectedYear >
          currentYear ||
        (
          selectedYear ===
            currentYear &&
          selectedMonth >
            currentMonth
        )
      ) {
        lastDayToProcess =
          0;
      } else if (
        selectedYear ===
          currentYear &&
        selectedMonth ===
          currentMonth
      ) {
        lastDayToProcess =
          currentDay;
      }


      const calendar = [];


      /* ===================================================
         BUILD CALENDAR
         =================================================== */

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {

        const dateKey =
          `${selectedYear}-` +
          `${String(
            selectedMonth
          ).padStart(2, "0")}-` +
          `${String(
            day
          ).padStart(2, "0")}`;


        const attendance =
          attendanceMap.get(
            dateKey
          );

        const holiday =
          holidayMap.get(
            dateKey
          );

        const leave =
          leaveMap.get(
            dateKey
          );

        const remoteRequest =
          remoteRequestMap.get(
            dateKey
          );

        const overtimeRequest =
          overtimeRequestMap.get(
            dateKey
          );


        const dayOfWeek =
          getCompanyDayOfWeek(
            selectedYear,
            selectedMonth,
            day
          );


        let status;


        if (attendance) {
          status =
            attendance.status;
        } else if (
          dayOfWeek === 0
        ) {
          status =
            "WEEKEND";
        } else if (
          holiday
        ) {
          status =
            "HOLIDAY";
        } else if (
          leave
        ) {
          status =
            "ON_LEAVE";
        } else if (
          day >
          lastDayToProcess
        ) {
          status =
            "UPCOMING";
        } else {
          status =
            "ABSENT";
        }


        const calendarDate =
          getCompanyDayStart(
            selectedYear,
            selectedMonth,
            day
          );


        calendar.push({
          date:
            calendarDate,

          dateKey,

          day,

          status,

          attendance:
            attendance ||
            null,

          holiday:
            holiday ||
            null,

          leave:
            leave ||
            null,

          remoteRequest:
            remoteRequest ||
            null,

          overtimeRequest:
            overtimeRequest ||
            null,

          isOvertime:
            attendance?.isOvertime ||
            false,

          overtimeMinutes:
            attendance?.overtimeMinutes ||
            0,

          attendanceMethod:
            attendance
              ?.checkIn
              ?.method ||
            (
              remoteRequest
                ? "REMOTE"
                : employee
                    .attendanceMethod
            ),
        });
      }


      /* ===================================================
         SUMMARY
         =================================================== */

      const summary = {
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        holiday: 0,
        weekend: 0,
        missedCheckout: 0,
        overtime: 0,
        overtimeMinutes: 0,
        upcoming: 0,
      };


      for (
        const day of calendar
      ) {

        switch (
          day.status
        ) {

          case "PRESENT":
            summary.present++;
            break;

          case "ABSENT":
            summary.absent++;
            break;

          case "HALF_DAY":
            summary.halfDay++;
            break;

          case "ON_LEAVE":
            summary.onLeave++;
            break;

          case "HOLIDAY":
            summary.holiday++;
            break;

          case "WEEKEND":
            summary.weekend++;
            break;

          case "MISSED_CHECKOUT":
            summary.missedCheckout++;
            break;

          case "UPCOMING":
            summary.upcoming++;
            break;

          default:
            break;
        }


        if (
          day.isOvertime
        ) {
          summary.overtime++;

          summary.overtimeMinutes +=
            day.overtimeMinutes ||
            0;
        }
      }


      /* ===================================================
         RESPONSE
         =================================================== */

      return res.status(200).json({
        success: true,

        employee: {
          employeeId:
            employee.employeeId,

          name:
            employee.name,

          department:
            employee.department,

          designation:
            employee.designation,

          attendanceMethod:
            employee.attendanceMethod,
        },

        month:
          selectedMonth,

        year:
          selectedYear,

        summary,

        calendar,

        holidays,

        leaves:
          approvedLeaves,

        remoteRequests:
          approvedRemoteRequests,

        overtimeRequests:
          approvedOvertimeRequests,
      });

    } catch (error) {

      console.error(
        "Get My Attendance Summary Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };


/* =========================================================
   GET ALL ATTENDANCE - ADMIN
   ========================================================= */

export const getAllAttendance =
  async (
    req,
    res
  ) => {
    try {

      const {
        date,
        employeeId,
        status,
      } = req.query;

      const filter = {};


      if (date) {

        const parsedDate =
          parseCompanyDate(
            date
          );

        if (!parsedDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid date. Use YYYY-MM-DD",
          });
        }

        filter.date = {
          $gte:
            parsedDate.start,

          $lte:
            parsedDate.end,
        };
      }


      if (employeeId) {

        if (
          !mongoose.Types.ObjectId.isValid(
            employeeId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid employee ID",
          });
        }

        filter.employeeId =
          employeeId;
      }


      if (status) {
        filter.status =
          status.toUpperCase();
      }


      const attendanceRecords =
        await Attendance.find(
          filter
        )
          .populate(
            "employeeId",
            "employeeId name department designation attendanceMethod"
          )
          .sort({
            date: -1,
            "checkIn.time": -1,
          });


      return res.status(200).json({
        success: true,

        count:
          attendanceRecords.length,

        attendance:
          attendanceRecords,
      });

    } catch (error) {

      console.error(
        "Get All Attendance Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };


/* =========================================================
   ADMIN UPDATE CHECKOUT
   ========================================================= */

export const adminUpdateCheckout =
  async (
    req,
    res
  ) => {
    try {

      const {
        checkoutTime,
      } = req.body;

      const {
        id,
      } = req.params;


      if (!checkoutTime) {
        return res.status(400).json({
          success: false,
          message:
            "Checkout time is required",
        });
      }


      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance ID",
        });
      }


      const attendance =
        await Attendance.findById(
          id
        );

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message:
            "Attendance record not found",
        });
      }


      if (
        !attendance.checkIn?.time
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Check-in record not found",
        });
      }


      if (
        attendance.checkOut?.time
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Checkout has already been recorded",
        });
      }


      const parsedCheckoutTime =
        parseCompanyDateTime(
          checkoutTime
        );

      if (!parsedCheckoutTime) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid checkout time",
        });
      }


      const checkInTime =
        new Date(
          attendance.checkIn.time
        );


      if (
        parsedCheckoutTime <=
        checkInTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Checkout time must be after check-in time",
        });
      }


      const workingMilliseconds =
        parsedCheckoutTime.getTime() -
        checkInTime.getTime();


      const workingMinutes =
        Math.floor(
          workingMilliseconds /
            (1000 * 60)
        );


      if (
        attendance.isOvertime
      ) {
        attendance.overtimeMinutes =
          workingMinutes;
      } else {
        attendance.overtimeMinutes =
          0;
      }


      attendance.checkOut = {
        time:
          parsedCheckoutTime,

        method:
          attendance.checkIn.method,
      };


      attendance.workingMinutes =
        workingMinutes;


      attendance.status =
        "PRESENT";


      await attendance.save();


      return res.status(200).json({
        success: true,

        message:
          "Checkout updated successfully",

        attendance,
      });

    } catch (error) {

      console.error(
        "Admin Update Checkout Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };