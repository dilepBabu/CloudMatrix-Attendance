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

// =========================================================
// Calculate distance between two GPS coordinates
// =========================================================

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
    ((latitude2 - latitude1) * Math.PI) /
    180;

  const longitudeDifference =
    ((longitude2 - longitude1) * Math.PI) /
    180;

  const a =
    Math.sin(latitudeDifference / 2) *
      Math.sin(latitudeDifference / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
};

// =========================================================
// Get approved temporary remote/WFH request for a date
// =========================================================

const getAttendanceMethod = async (
  employee,
  date
) => {
  const permanentMethod =
    employee.attendanceMethod;

  if (
    permanentMethod !== "OFFICE"
  ) {
    return permanentMethod;
  }

  const dayStart =
    getCompanyDayStartFromDate(date);

  const dayEnd =
    getCompanyDayEndFromDate(date);

  const remoteRequest =
    await RemoteRequest.findOne({
      employeeId: employee._id,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
      status: "APPROVED",
      requestedMethod: "REMOTE",
    });

  if (remoteRequest) {
    return "REMOTE";
  }

  return permanentMethod;
};

// =========================================================
// Get approved overtime request for a date
// =========================================================

const getApprovedOvertime = async (
  employeeId,
  date
) => {
  const dayStart =
    getCompanyDayStartFromDate(date);

  const dayEnd =
    getCompanyDayEndFromDate(date);

  const overtimeRequest =
    await OvertimeRequest.findOne({
      employeeId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
      status: "APPROVED",
    });

  return overtimeRequest;
};

// =========================================================
// Get approved leave for a date
//
// IMPORTANT:
// Approved leave has higher priority than overtime.
// =========================================================

const getApprovedLeave = async (
  employeeId,
  date
) => {
  const dayStart =
    getCompanyDayStartFromDate(date);

  const dayEnd =
    getCompanyDayEndFromDate(date);

  const leave =
    await Leave.findOne({
      employeeId,
      status: "APPROVED",
      startDate: {
        $lte: dayEnd,
      },
      endDate: {
        $gte: dayStart,
      },
    });

  return leave;
};

// =========================================================
// Mark genuinely stale incomplete attendance as
// MISSED_CHECKOUT
//
// IMPORTANT NIGHT-SHIFT RULE:
//
// We do NOT mark an attendance as missed merely because
// its calendar date is yesterday.
//
// Example:
//
// Oct 6 7:00 PM -> Check-in
// Oct 7 3:00 AM -> still a valid open overnight shift
//
// Therefore the attendance only becomes MISSED_CHECKOUT
// after it has remained open for more than 24 hours.
//
// This protects legitimate overnight attendance.
// =========================================================

const markMissedCheckout = async (
  employeeId
) => {
  try {
    const now = new Date();

    // Maximum allowed open attendance window.
    //
    // 24 hours allows:
    //
    // Oct 6 7 PM
    //        ↓
    // Oct 7 3 AM
    //
    // without incorrectly marking it as missed.
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
          $lt: staleCutoff,
        },

        "checkOut.time": {
          $exists: false,
        },

        status: "PRESENT",
      },
      {
        $set: {
          status: "MISSED_CHECKOUT",
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

// =========================================================
// Check whether a date is a holiday
// =========================================================

const isHoliday = async (date) => {
  const startOfDay =
    getCompanyDayStartFromDate(date);

  const endOfDay =
    getCompanyDayEndFromDate(date);

  const holiday =
    await Holiday.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      isActive: true,
    });

  return holiday;
};

// =========================================================
// Employee Check-In
// =========================================================

export const checkIn = async (
  req,
  res
) => {
  try {
    const {
      latitude,
      longitude,
      accuracy,
    } = req.body;

    // -----------------------------------------------------
    // Validate GPS coordinates
    // -----------------------------------------------------

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Location is required for check-in",
      });
    }

    if (
      accuracy === undefined ||
      typeof accuracy !== "number" ||
      !Number.isFinite(accuracy) ||
      accuracy < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid GPS accuracy is required",
      });
    }

    // -----------------------------------------------------
    // Find employee profile
    // -----------------------------------------------------

    const employee =
      await Employee.findOne({
        userId: req.user._id,
        employmentStatus: "ACTIVE",
      });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Active employee profile not found",
      });
    }

    // -----------------------------------------------------
    // Get current exact timestamp
    // -----------------------------------------------------

    const now = new Date();

    // -----------------------------------------------------
    // Get today's company calendar day
    // -----------------------------------------------------

    const startOfDay =
      getCurrentCompanyDayStart();

    const endOfDay =
      getCompanyDayEndFromDate(now);

    // -----------------------------------------------------
    // Check approved leave FIRST
    //
    // IMPORTANT:
    // APPROVED LEAVE > APPROVED OVERTIME
    //
    // Even if Sunday/holiday overtime is approved,
    // approved leave must block attendance.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Check holiday
    // -----------------------------------------------------

    const holiday =
      await isHoliday(now);

    // -----------------------------------------------------
    // Check approved overtime
    // -----------------------------------------------------

    const overtimeRequest =
      await getApprovedOvertime(
        employee._id,
        now
      );

    const hasApprovedOvertime =
      Boolean(overtimeRequest);

    // -----------------------------------------------------
    // Determine day of week
    //
    // 0 = Sunday
    // -----------------------------------------------------

    const currentDateParts =
      getCompanyDateParts(now);

    const dayOfWeek =
      getCompanyDayOfWeek(
        currentDateParts.year,
        currentDateParts.month,
        currentDateParts.day
      );

    const isSunday =
      dayOfWeek === 0;

    // -----------------------------------------------------
    // Sunday restriction
    //
    // Sunday attendance requires approved overtime.
    //
    // Approved leave was already checked above.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Holiday restriction
    //
    // Holiday attendance requires approved overtime.
    //
    // Approved leave was already checked above.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Determine whether this attendance is overtime
    //
    // Approved overtime on Sunday or holiday = overtime.
    // -----------------------------------------------------

    const isOvertime =
      hasApprovedOvertime &&
      (
        isSunday ||
        Boolean(holiday)
      );

    // -----------------------------------------------------
    // Mark ONLY genuinely stale open attendance
    //
    // IMPORTANT:
    // We no longer use:
    //
    // attendance.date < today
    //
    // because that breaks night shifts.
    //
    // Only attendance open for more than 24 hours
    // becomes MISSED_CHECKOUT.
    // -----------------------------------------------------

    await markMissedCheckout(
      employee._id
    );

    // -----------------------------------------------------
    // Check whether employee currently has an OPEN
    // attendance.
    //
    // This is the important protection against:
    //
    // Oct 6 7 PM -> Check-in
    // Oct 7 7 PM -> another Check-in
    //
    // if the first attendance is still open.
    // -----------------------------------------------------

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

        status: "PRESENT",
      })
        .sort({
          "checkIn.time": -1,
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

    // -----------------------------------------------------
    // Check duplicate attendance for TODAY
    //
    // A CLOSED attendance from yesterday does NOT block
    // today's check-in.
    //
    // A closed attendance from today DOES block another
    // check-in today.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Get company settings
    // -----------------------------------------------------

    const settings =
      await CompanySettings.findOne();

    if (!settings) {
      return res.status(500).json({
        success: false,
        message:
          "Office location has not been configured",
      });
    }

    // -----------------------------------------------------
    // Determine actual attendance method
    // -----------------------------------------------------

    const attendanceMethod =
      await getAttendanceMethod(
        employee,
        now
      );

    // -----------------------------------------------------
    // Safety validation
    // -----------------------------------------------------

    if (
      ![
        "OFFICE",
        "REMOTE",
        "FIELD",
      ].includes(attendanceMethod)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance method configured for employee",
      });
    }

    let checkInMethod =
      attendanceMethod;

    // -----------------------------------------------------
    // OFFICE attendance
    //
    // Existing GPS validation preserved.
    // -----------------------------------------------------

    if (
      attendanceMethod === "OFFICE"
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

      if (accuracy > 300) {
        return res.status(403).json({
          success: false,
          message:
            "GPS accuracy is too low. Please move to an open area and try again.",
          accuracy:
            Math.round(accuracy),
          maximumAllowedAccuracy: 300,
        });
      }

      const distance =
        calculateDistance(
          latitude,
          longitude,
          settings.officeLocation.latitude,
          settings.officeLocation.longitude
        );

      if (
        distance >
        settings.officeLocation.radius
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are outside the office attendance area",
          distance:
            Math.round(distance),
          allowedRadius:
            settings.officeLocation.radius,
        });
      }

      checkInMethod =
        "OFFICE";
    }

    // -----------------------------------------------------
    // REMOTE attendance
    // -----------------------------------------------------

    if (
      attendanceMethod === "REMOTE"
    ) {
      checkInMethod =
        "REMOTE";
    }

    // -----------------------------------------------------
    // FIELD attendance
    // -----------------------------------------------------

    if (
      attendanceMethod === "FIELD"
    ) {
      checkInMethod =
        "FIELD";
    }

    // -----------------------------------------------------
    // Create attendance
    //
    // IMPORTANT:
    //
    // date = shift START date.
    //
    // This does NOT change for overnight attendance.
    //
    // Example:
    //
    // Oct 6 7 PM -> Oct 7 3 AM
    //
    // date = Oct 6
    // -----------------------------------------------------

    const attendance =
      await Attendance.create({
        employeeId:
          employee._id,

        userId:
          req.user._id,

        date:
          startOfDay,

        checkIn: {
          time:
            now,

          location: {
            latitude,
            longitude,
            accuracy,
          },

          method:
            checkInMethod,
        },

        status:
          "PRESENT",

        workingMinutes:
          0,

        isOvertime,

        overtimeMinutes:
          0,
      });

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
      message: "Server error",
    });
  }
};

// =========================================================
// Employee Check-Out
// =========================================================

export const checkOut = async (
  req,
  res
) => {
  try {
    const {
      latitude,
      longitude,
      accuracy,
    } = req.body;

    // -----------------------------------------------------
    // Validate GPS coordinates
    // -----------------------------------------------------

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Location is required for check-out",
      });
    }

    if (
      accuracy === undefined ||
      typeof accuracy !== "number" ||
      !Number.isFinite(accuracy) ||
      accuracy < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid GPS accuracy is required",
      });
    }

    // -----------------------------------------------------
    // Find employee
    // -----------------------------------------------------

    const employee =
      await Employee.findOne({
        userId: req.user._id,
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

    // -----------------------------------------------------
    // Current timestamp
    // -----------------------------------------------------

    const now =
      new Date();

    // -----------------------------------------------------
    // IMPORTANT NIGHT-SHIFT LOGIC
    //
    // Do NOT search only today's attendance.
    //
    // Search for the latest OPEN attendance whose
    // check-in occurred within the last 24 hours.
    //
    // This supports:
    //
    // Same-day:
    // 9 AM -> 6 PM
    //
    // Overnight:
    // Oct 6 7 PM -> Oct 7 3 AM
    //
    // while preventing very old forgotten attendance
    // from being checked out indefinitely.
    // -----------------------------------------------------

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

        status: "PRESENT",
      })
        .sort({
          "checkIn.time": -1,
        });

    // -----------------------------------------------------
    // Employee must have an open attendance
    // -----------------------------------------------------

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message:
          "You do not have an active attendance to check out. Your previous attendance may have been marked as missed checkout.",
      });
    }

    // -----------------------------------------------------
    // Prevent duplicate check-out
    //
    // Normally the query above only returns open records,
    // but this protection remains for safety.
    // -----------------------------------------------------

    if (
      attendance.checkOut?.time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You have already checked out",
      });
    }

    // -----------------------------------------------------
    // IMPORTANT:
    //
    // For checkout restrictions, use the ATTENDANCE DATE.
    //
    // NOT the current checkout date.
    //
    // Example:
    //
    // Oct 6 7 PM -> check-in
    // Oct 7 3 AM -> check-out
    //
    // Shift date = Oct 6
    //
    // Therefore leave / holiday / Sunday rules are
    // evaluated for Oct 6.
    // -----------------------------------------------------

    const shiftDate =
      attendance.date;

    // -----------------------------------------------------
    // APPROVED LEAVE CHECK
    //
    // IMPORTANT:
    // APPROVED LEAVE has higher priority than overtime.
    //
    // Check against the shift-start date.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Check holiday using SHIFT DATE
    // -----------------------------------------------------

    const holiday =
      await isHoliday(
        shiftDate
      );

    // -----------------------------------------------------
    // Holiday check-out restriction
    //
    // Existing overtime attendance can check out.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Sunday check-out restriction
    //
    // IMPORTANT:
    // Use the SHIFT DATE, not today's date.
    //
    // This prevents:
    //
    // Saturday 7 PM -> Sunday 3 AM
    //
    // from incorrectly becoming a Sunday attendance.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Work report is required
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Get company settings
    // -----------------------------------------------------

    const settings =
      await CompanySettings.findOne();

    if (!settings) {
      return res.status(500).json({
        success: false,
        message:
          "Office location has not been configured",
      });
    }

    // -----------------------------------------------------
    // Checkout uses the method recorded during check-in
    // -----------------------------------------------------

    const attendanceMethod =
      attendance.checkIn?.method;

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

    let checkOutMethod =
      attendanceMethod;

    // -----------------------------------------------------
    // OFFICE attendance
    //
    // Existing GPS validation preserved.
    // -----------------------------------------------------

    if (
      attendanceMethod === "OFFICE"
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

      if (accuracy > 300) {
        return res.status(403).json({
          success: false,
          message:
            "GPS accuracy is too low. Please move to an open area and try again.",
          accuracy:
            Math.round(accuracy),
          maximumAllowedAccuracy:
            300,
        });
      }

      const distance =
        calculateDistance(
          latitude,
          longitude,
          settings.officeLocation.latitude,
          settings.officeLocation.longitude
        );

      console.log(
        "CHECK-OUT GPS CHECK:",
        {
          userLatitude:
            latitude,

          userLongitude:
            longitude,

          accuracy,

          officeLatitude:
            settings.officeLocation.latitude,

          officeLongitude:
            settings.officeLocation.longitude,

          officeRadius:
            settings.officeLocation.radius,

          distance,
        }
      );

      if (
        distance >
        settings.officeLocation.radius
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are outside the office attendance area",

          distance:
            Math.round(distance),

          allowedRadius:
            settings.officeLocation.radius,
        });
      }

      checkOutMethod =
        "OFFICE";
    }

    // -----------------------------------------------------
    // REMOTE attendance
    // -----------------------------------------------------

    if (
      attendanceMethod === "REMOTE"
    ) {
      checkOutMethod =
        "REMOTE";
    }

    // -----------------------------------------------------
    // FIELD attendance
    // -----------------------------------------------------

    if (
      attendanceMethod === "FIELD"
    ) {
      checkOutMethod =
        "FIELD";
    }

    // -----------------------------------------------------
    // Calculate working time
    //
    // IMPORTANT:
    //
    // Use actual timestamps.
    //
    // This automatically handles midnight.
    //
    // Example:
    //
    // Oct 6 7 PM
    // Oct 7 3 AM
    //
    // = 480 minutes
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Calculate overtime
    //
    // For approved Sunday/holiday overtime,
    // all worked time is overtime.
    // -----------------------------------------------------

    if (
      attendance.isOvertime
    ) {
      attendance.overtimeMinutes =
        workingMinutes;
    } else {
      attendance.overtimeMinutes =
        0;
    }

    // -----------------------------------------------------
    // Update attendance
    //
    // IMPORTANT:
    //
    // attendance.date is NOT changed.
    //
    // For overnight:
    //
    // date     = Oct 6
    // checkIn  = Oct 6 7 PM
    // checkOut = Oct 7 3 AM
    // -----------------------------------------------------

    attendance.checkOut = {
      time:
        now,

      location: {
        latitude,
        longitude,
        accuracy,
      },

      method:
        checkOutMethod,
    };

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
      message: "Server error",
    });
  }
};

// =========================================================
// Get My Attendance
// =========================================================

export const getMyAttendance =
  async (req, res) => {
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
        message: "Server error",
      });
    }
  };

// =========================================================
// Get My Monthly Attendance Summary
// =========================================================

export const getMyAttendanceSummary =
  async (req, res) => {
    try {
      const {
        month,
        year,
      } = req.query;

      // ---------------------------------------------------
      // Current company date
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Validate month
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Validate year
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Find employee
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Get selected month range
      // ---------------------------------------------------

      const {
        start: startOfMonth,
        end: endOfMonth,
      } =
        getCompanyMonthRange(
          selectedYear,
          selectedMonth
        );

      // ---------------------------------------------------
      // Get attendance records
      // ---------------------------------------------------

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
        }).sort({
          date: 1,
        });

      // ---------------------------------------------------
      // Get holidays
      // ---------------------------------------------------

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
        }).sort({
          date: 1,
        });

      // ---------------------------------------------------
      // Get approved leaves
      // ---------------------------------------------------

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
        }).sort({
          startDate: 1,
        });

      // ---------------------------------------------------
      // Get approved temporary WFH requests
      // ---------------------------------------------------

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
        }).sort({
          date: 1,
        });

      // ---------------------------------------------------
      // Get approved overtime requests
      // ---------------------------------------------------

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
        }).sort({
          date: 1,
        });

      // ---------------------------------------------------
      // Create attendance map
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Create holiday map
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Create approved leave map
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Create approved WFH map
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Create approved overtime map
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Number of days in month
      // ---------------------------------------------------

      const daysInMonth =
        getDaysInMonth(
          selectedYear,
          selectedMonth
        );

      // ---------------------------------------------------
      // Determine last day to process
      // ---------------------------------------------------

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
      }
      else if (
        selectedYear ===
          currentYear &&
        selectedMonth ===
          currentMonth
      ) {
        lastDayToProcess =
          currentDay;
      }

      const calendar = [];

      // ---------------------------------------------------
      // Build calendar
      // ---------------------------------------------------

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

        // -------------------------------------------------
        // Actual attendance gets priority.
        //
        // This preserves overtime attendance on Sunday/
        // holiday as actual attendance.
        // -------------------------------------------------

        if (
          attendance
        ) {
          status =
            attendance.status;
        }
        else if (
          dayOfWeek === 0
        ) {
          status =
            "WEEKEND";
        }
        else if (
          holiday
        ) {
          status =
            "HOLIDAY";
        }
        else if (
          leave
        ) {
          status =
            "ON_LEAVE";
        }
        else if (
          day >
          lastDayToProcess
        ) {
          status =
            "UPCOMING";
        }
        else {
          status =
            "ABSENT";
        }

        // -------------------------------------------------
        // Store company calendar date
        // -------------------------------------------------

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
            attendance?.checkIn?.method ||
            (
              remoteRequest
                ? "REMOTE"
                : employee.attendanceMethod
            ),
        });
      }

      // ---------------------------------------------------
      // Calculate summary counts
      // ---------------------------------------------------

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
        }

        if (
          day.isOvertime
        ) {
          summary.overtime++;

          summary.overtimeMinutes +=
            day.overtimeMinutes || 0;
        }
      }

      // ---------------------------------------------------
      // Response
      // ---------------------------------------------------

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
        message: "Server error",
      });
    }
  };

// =========================================================
// Get All Attendance - Admin
// =========================================================

export const getAllAttendance =
  async (req, res) => {
    try {
      const {
        date,
        employeeId,
        status,
      } = req.query;

      const filter = {};

      // ---------------------------------------------------
      // Filter by calendar date
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Filter by employee MongoDB ObjectId
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Filter by attendance status
      // ---------------------------------------------------

      if (status) {
        filter.status =
          status.toUpperCase();
      }

      // ---------------------------------------------------
      // Get attendance records
      // ---------------------------------------------------

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
        message: "Server error",
      });
    }
  };

// =========================================================
// Admin Update Checkout
// =========================================================

export const adminUpdateCheckout =
  async (req, res) => {
    try {
      const {
        checkoutTime,
      } = req.body;

      const {
        id,
      } = req.params;

      // ---------------------------------------------------
      // Validate checkout time
      // ---------------------------------------------------

      if (!checkoutTime) {
        return res.status(400).json({
          success: false,
          message:
            "Checkout time is required",
        });
      }

      // ---------------------------------------------------
      // Validate attendance ID
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Find attendance
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Check-in must exist
      // ---------------------------------------------------

      if (
        !attendance.checkIn?.time
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Check-in record not found",
        });
      }

      // ---------------------------------------------------
      // Prevent duplicate checkout
      // ---------------------------------------------------

      if (
        attendance.checkOut?.time
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Checkout has already been recorded",
        });
      }

      // ---------------------------------------------------
      // Parse checkout datetime
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Check checkout is after check-in
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Calculate working time
      // ---------------------------------------------------

      const workingMilliseconds =
        parsedCheckoutTime.getTime() -
        checkInTime.getTime();

      const workingMinutes =
        Math.floor(
          workingMilliseconds /
            (1000 * 60)
        );

      // ---------------------------------------------------
      // Overtime minutes
      //
      // If the original attendance was overtime,
      // all worked time is overtime.
      // ---------------------------------------------------

      if (
        attendance.isOvertime
      ) {
        attendance.overtimeMinutes =
          workingMinutes;
      } else {
        attendance.overtimeMinutes =
          0;
      }

      // ---------------------------------------------------
      // Update attendance
      // ---------------------------------------------------

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
        message: "Server error",
      });
    }
  };