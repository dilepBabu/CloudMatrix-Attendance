import Attendance from "../model/Attendance.mjs";
import Employee from "../model/Employee.mjs";
import Leave from "../model/Leave.mjs";
import Holiday from "../model/Holiday.mjs";

import {
  getCompanyDateKey,
  getCompanyDateParts,
  getCompanyDayStart,
  getCompanyMonthRange,
  getDaysInMonth,
  getCompanyDayOfWeek,
} from "../utils/dateUtils.mjs";

// =========================================================
// Helper: Round percentage
// =========================================================

const roundPercentage = (value) => {
  return Number(value.toFixed(2));
};

// =========================================================
// Helper: Create YYYY-MM-DD date key
// =========================================================

const createDateKey = (year, month, day) => {
  return (
    `${year}-` +
    `${String(month).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`
  );
};

// =========================================================
// Helper: Create employee statistics object
// =========================================================

const createEmployeeStats = (employee) => {
  return {
    employeeId: employee.employeeId,
    name: employee.name,
    department: employee.department || "Not Assigned",
    designation: employee.designation || "Not Assigned",
    attendanceMethod: employee.attendanceMethod,
    present: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    missedCheckout: 0,
    attendanceScore: 0,
    attendancePercentage: 0,
  };
};

// =========================================================
// Helper: Create department statistics object
// =========================================================

const createDepartmentStats = (department) => {
  return {
    department,
    totalEmployees: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    missedCheckout: 0,
    attendanceScore: 0,
    attendancePercentage: 0,
  };
};

// =========================================================
// Get Dashboard Summary - Today
// Admin only
// =========================================================

export const getDashboardSummary = async (req, res) => {
  try {
    // -----------------------------------------------------
    // Current company date
    // -----------------------------------------------------

    const currentDate = new Date();

    const currentDateKey =
      getCompanyDateKey(currentDate);

    const {
      year,
      month,
      day,
    } = getCompanyDateParts(currentDate);

    const todayDateKey = currentDateKey;

    // -----------------------------------------------------
    // Find active employees
    // -----------------------------------------------------

    const employees = await Employee.find({
      employmentStatus: "ACTIVE",
    }).select(
      "_id employeeId name department designation attendanceMethod"
    );

    const totalEmployees = employees.length;

    // -----------------------------------------------------
    // Active employee IDs
    // -----------------------------------------------------

    const activeEmployeeIds = new Set(
      employees.map((employee) =>
        String(employee._id)
      )
    );

    // -----------------------------------------------------
    // Today's date range
    // -----------------------------------------------------

    const todayStart = getCompanyDayStart(
      year,
      month,
      day
    );

    const tomorrowDay = day + 1;

    let tomorrowStart;

    if (
      tomorrowDay >
      getDaysInMonth(year, month)
    ) {
      if (month === 12) {
        tomorrowStart = getCompanyDayStart(
          year + 1,
          1,
          1
        );
      } else {
        tomorrowStart = getCompanyDayStart(
          year,
          month + 1,
          1
        );
      }
    } else {
      tomorrowStart = getCompanyDayStart(
        year,
        month,
        tomorrowDay
      );
    }

    // -----------------------------------------------------
    // Today's attendance
    // -----------------------------------------------------

    const attendanceRecords =
      await Attendance.find({
        date: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
      }).populate(
        "employeeId",
        "employeeId name department designation attendanceMethod"
      );

    // -----------------------------------------------------
    // Today's approved leaves
    // -----------------------------------------------------

    const approvedLeaves =
      await Leave.find({
        status: "APPROVED",
        startDate: {
          $lt: tomorrowStart,
        },
        endDate: {
          $gte: todayStart,
        },
      }).select(
        "employeeId startDate endDate leaveType reason"
      );

    const leaveEmployeeIds = new Set();

    for (const leave of approvedLeaves) {
      if (!leave.employeeId) {
        continue;
      }

      const employeeId =
        String(leave.employeeId);

      if (
        activeEmployeeIds.has(employeeId)
      ) {
        leaveEmployeeIds.add(employeeId);
      }
    }

    // -----------------------------------------------------
    // Today's holiday
    // -----------------------------------------------------

    const holiday =
      await Holiday.findOne({
        date: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
        isActive: true,
      });

    // -----------------------------------------------------
    // Is today Sunday?
    //
    // Sunday = weekly holiday
    // Saturday = working day
    // -----------------------------------------------------

    const dayOfWeek =
      getCompanyDayOfWeek(
        year,
        month,
        day
      );

    const isSunday =
      dayOfWeek === 0;

    // -----------------------------------------------------
    // Attendance employee map
    // -----------------------------------------------------

    const attendanceEmployeeIds =
      new Set();

    const attendanceMap =
      new Map();

    let present = 0;
    let missedCheckout = 0;
    let halfDay = 0;
    let attendanceScore = 0;

    for (const attendance of attendanceRecords) {
      if (!attendance.employeeId) {
        continue;
      }

      const employeeId =
        String(attendance.employeeId._id);

      // Ignore attendance belonging to
      // inactive/non-dashboard employees.
      if (
        !activeEmployeeIds.has(employeeId)
      ) {
        continue;
      }

      attendanceEmployeeIds.add(
        employeeId
      );

      attendanceMap.set(
        employeeId,
        attendance
      );

      switch (attendance.status) {
        case "PRESENT":
          present++;
          attendanceScore += 1;
          break;

        case "MISSED_CHECKOUT":
          present++;
          missedCheckout++;
          attendanceScore += 1;
          break;

        case "HALF_DAY":
          halfDay++;
          attendanceScore += 0.5;
          break;

        default:
          break;
      }
    }

    // -----------------------------------------------------
    // Calculate today's status
    // -----------------------------------------------------

    let onLeave = 0;
    let notCheckedIn = 0;

    if (!holiday && !isSunday) {
      for (const employee of employees) {
        const employeeId =
          String(employee._id);

        if (
          leaveEmployeeIds.has(employeeId)
        ) {
          onLeave++;
          continue;
        }

        if (
          !attendanceEmployeeIds.has(
            employeeId
          )
        ) {
          notCheckedIn++;
        }
      }
    }

    // -----------------------------------------------------
    // Today's attendance percentage
    //
    // PRESENT = 1
    // MISSED_CHECKOUT = 1
    // HALF_DAY = 0.5
    // LEAVE = excluded
    // -----------------------------------------------------

    let attendancePercentage = 0;

    if (!holiday && !isSunday) {
      const expectedEmployees =
        totalEmployees - onLeave;

      if (expectedEmployees > 0) {
        attendancePercentage =
          roundPercentage(
            (attendanceScore /
              expectedEmployees) *
              100
          );
      }
    }

    // -----------------------------------------------------
    // Department statistics
    // -----------------------------------------------------

    const departmentMap =
      new Map();

    for (const employee of employees) {
      const department =
        employee.department ||
        "Not Assigned";

      if (
        !departmentMap.has(
          department
        )
      ) {
        departmentMap.set(
          department,
          createDepartmentStats(
            department
          )
        );
      }

      const departmentData =
        departmentMap.get(
          department
        );

      departmentData.totalEmployees++;

      const employeeId =
        String(employee._id);

      if (
        !holiday &&
        !isSunday
      ) {
        if (
          leaveEmployeeIds.has(
            employeeId
          )
        ) {
          departmentData.onLeave++;
          continue;
        }

        const attendance =
          attendanceMap.get(
            employeeId
          );

        if (!attendance) {
          departmentData.absent++;
          continue;
        }

        switch (attendance.status) {
          case "PRESENT":
            departmentData.present++;
            departmentData.attendanceScore++;
            break;

          case "MISSED_CHECKOUT":
            departmentData.present++;
            departmentData.missedCheckout++;
            departmentData.attendanceScore++;
            break;

          case "HALF_DAY":
            departmentData.halfDay++;
            departmentData.attendanceScore += 0.5;
            break;

          case "ABSENT":
            departmentData.absent++;
            break;

          case "ON_LEAVE":
            departmentData.onLeave++;
            break;

          default:
            departmentData.absent++;
            break;
        }
      }
    }

    // -----------------------------------------------------
    // Department attendance percentages
    // -----------------------------------------------------

    for (
      const departmentData of
        departmentMap.values()
    ) {
      if (
        holiday ||
        isSunday
      ) {
        departmentData.attendancePercentage = 0;
        continue;
      }

      const expected =
        departmentData.totalEmployees -
        departmentData.onLeave;

      if (expected > 0) {
        departmentData.attendancePercentage =
          roundPercentage(
            (departmentData.attendanceScore /
              expected) *
              100
          );
      }
    }

    // -----------------------------------------------------
    // Attendance method statistics
    // -----------------------------------------------------

    const attendanceMethodMap =
      new Map();

    for (const employee of employees) {
      const method =
        employee.attendanceMethod ||
        "UNKNOWN";

      if (
        !attendanceMethodMap.has(
          method
        )
      ) {
        attendanceMethodMap.set(
          method,
          {
            method,
            totalEmployees: 0,
            present: 0,
            absent: 0,
            onLeave: 0,
            notCheckedIn: 0,
          }
        );
      }

      const methodData =
        attendanceMethodMap.get(
          method
        );

      methodData.totalEmployees++;

      if (
        holiday ||
        isSunday
      ) {
        continue;
      }

      const employeeId =
        String(employee._id);

      if (
        leaveEmployeeIds.has(
          employeeId
        )
      ) {
        methodData.onLeave++;
        continue;
      }

      const attendance =
        attendanceMap.get(
          employeeId
        );

      if (
        attendance?.status === "PRESENT" ||
        attendance?.status === "MISSED_CHECKOUT" ||
        attendance?.status === "HALF_DAY"
      ) {
        methodData.present++;
      } else {
        methodData.notCheckedIn++;
      }
    }

    // -----------------------------------------------------
    // Recent attendance
    // -----------------------------------------------------

    const recentAttendance =
      await Attendance.find({
        date: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
      })
        .populate(
          "employeeId",
          "employeeId name department designation attendanceMethod"
        )
        .sort({
          "checkIn.time": -1,
        })
        .limit(10);

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,

      date: todayDateKey,

      summary: {
        totalEmployees,
        present,
        halfDay,
        onLeave,

        // "notCheckedIn" is used instead
        // of "absent" for today's dashboard.
        notCheckedIn,

        missedCheckout,

        holiday:
          Boolean(holiday),

        weekend:
          isSunday,

        attendancePercentage,
      },

      holidayDetails: holiday
        ? {
            name: holiday.name,
            date: holiday.date,
            description:
              holiday.description || null,
          }
        : null,

      departmentStats:
        Array.from(
          departmentMap.values()
        ),

      attendanceMethodStats:
        Array.from(
          attendanceMethodMap.values()
        ),

      recentAttendance,
    });
  } catch (error) {
    console.error(
      "Get Dashboard Summary Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================================================
// Get Monthly Dashboard Summary
// Admin only
//
// Important concepts:
//
// Present/Absent/Leave are EMPLOYEE-DAYS,
// not number of unique employees.
//
// Example:
//
// 3 employees × 10 working days
// = 30 expected employee-days.
//
// Leave days are excluded from expected
// employee-days.
//
// Attendance score:
//
// PRESENT          = 1
// MISSED_CHECKOUT  = 1
// HALF_DAY         = 0.5
// ABSENT           = 0
// LEAVE            = excluded
// =========================================================

export const getMonthlyDashboardSummary =
  async (req, res) => {
    try {
      // ---------------------------------------------------
      // Current company date
      // ---------------------------------------------------

      const currentDate =
        new Date();

      const currentDateKey =
        getCompanyDateKey(
          currentDate
        );

      const [
        currentYear,
        currentMonth,
        currentDay,
      ] =
        currentDateKey
          .split("-")
          .map(Number);

      // ---------------------------------------------------
      // Requested month/year
      // ---------------------------------------------------

      const selectedMonth =
        req.query.month
          ? Number(req.query.month)
          : currentMonth;

      const selectedYear =
        req.query.year
          ? Number(req.query.year)
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
          message: "Invalid month",
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
          message: "Invalid year",
        });
      }

      // ---------------------------------------------------
      // Determine which days should be processed
      //
      // Past month:
      // Full month
      //
      // Current month:
      // Only up to today
      //
      // Future month:
      // No completed working days
      // ---------------------------------------------------

      const daysInMonth =
        getDaysInMonth(
          selectedYear,
          selectedMonth
        );

      let lastDayToProcess =
        daysInMonth;

      const isFutureMonth =
        selectedYear > currentYear ||
        (
          selectedYear === currentYear &&
          selectedMonth > currentMonth
        );

      const isCurrentMonth =
        selectedYear === currentYear &&
        selectedMonth === currentMonth;

      if (isFutureMonth) {
        lastDayToProcess = 0;
      } else if (isCurrentMonth) {
        lastDayToProcess =
          currentDay;
      }

      // ---------------------------------------------------
      // Get month range
      // ---------------------------------------------------

      const {
        start: startOfMonth,
        end: endOfMonth,
      } = getCompanyMonthRange(
        selectedYear,
        selectedMonth
      );

      // ---------------------------------------------------
      // Active employees
      // ---------------------------------------------------

      const employees =
        await Employee.find({
          employmentStatus: "ACTIVE",
        }).select(
          "_id employeeId name department designation attendanceMethod"
        );

      const totalEmployees =
        employees.length;

      const activeEmployeeIds =
        new Set(
          employees.map(
            (employee) =>
              String(employee._id)
          )
        );

      // ---------------------------------------------------
      // Attendance records
      // ---------------------------------------------------

      const attendanceRecords =
        await Attendance.find({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        }).sort({
          date: 1,
        });

      // ---------------------------------------------------
      // Attendance map
      //
      // Key:
      // employee MongoDB ID + company date
      // ---------------------------------------------------

      const attendanceMap =
        new Map();

      for (
        const attendance of
          attendanceRecords
      ) {
        if (!attendance.employeeId) {
          continue;
        }

        const employeeId =
          String(
            attendance.employeeId
          );

        // Ignore inactive employees
        // in the current dashboard.
        if (
          !activeEmployeeIds.has(
            employeeId
          )
        ) {
          continue;
        }

        const dateKey =
          getCompanyDateKey(
            attendance.date
          );

        attendanceMap.set(
          `${employeeId}_${dateKey}`,
          attendance
        );
      }

      // ---------------------------------------------------
      // Approved leaves
      // ---------------------------------------------------

      const approvedLeaves =
        await Leave.find({
          status: "APPROVED",
          startDate: {
            $lte: endOfMonth,
          },
          endDate: {
            $gte: startOfMonth,
          },
        }).select(
          "employeeId startDate endDate leaveType reason"
        );

      // ---------------------------------------------------
      // Leave map
      //
      // Key:
      // employee MongoDB ID + company date
      //
      // Sunday is skipped because Sunday is
      // the company's weekly holiday.
      //
      // Future days in current month are skipped.
      // ---------------------------------------------------

      const leaveMap =
        new Map();

      for (
        const leave of approvedLeaves
      ) {
        if (!leave.employeeId) {
          continue;
        }

        const employeeId =
          String(
            leave.employeeId
          );

        if (
          !activeEmployeeIds.has(
            employeeId
          )
        ) {
          continue;
        }

        let leaveStart =
          new Date(
            leave.startDate
          );

        let leaveEnd =
          new Date(
            leave.endDate
          );

        // Limit leave range to selected month.
        if (
          leaveStart <
          startOfMonth
        ) {
          leaveStart =
            startOfMonth;
        }

        if (
          leaveEnd >
          endOfMonth
        ) {
          leaveEnd =
            endOfMonth;
        }

        let cursor =
          new Date(
            leaveStart
          );

        while (
          cursor <= leaveEnd
        ) {
          const dateKey =
            getCompanyDateKey(
              cursor
            );

          const [
            leaveYear,
            leaveMonth,
            leaveDay,
          ] =
            dateKey
              .split("-")
              .map(Number);

          // Make sure this date belongs
          // to selected month.
          if (
            leaveYear ===
              selectedYear &&
            leaveMonth ===
              selectedMonth
          ) {
            const dayOfWeek =
              getCompanyDayOfWeek(
                leaveYear,
                leaveMonth,
                leaveDay
              );

            const isSunday =
              dayOfWeek === 0;

            const isFuture =
              isCurrentMonth &&
              leaveDay > currentDay;

            if (
              !isSunday &&
              !isFuture
            ) {
              leaveMap.set(
                `${employeeId}_${dateKey}`,
                leave
              );
            }
          }

          cursor.setUTCDate(
            cursor.getUTCDate() + 1
          );
        }
      }

      // ---------------------------------------------------
      // Active holidays
      // ---------------------------------------------------

      const holidays =
        await Holiday.find({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
          isActive: true,
        }).select(
          "name date description"
        );

      // ---------------------------------------------------
      // Holiday map
      // ---------------------------------------------------

      const holidayMap =
        new Map();

      for (
        const holiday of holidays
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
      // Initialize employee statistics
      // ---------------------------------------------------

      const employeeStatsMap =
        new Map();

      for (
        const employee of employees
      ) {
        employeeStatsMap.set(
          String(employee._id),
          createEmployeeStats(
            employee
          )
        );
      }

      // ---------------------------------------------------
      // Initialize department statistics
      // ---------------------------------------------------

      const departmentMap =
        new Map();

      for (
        const employee of employees
      ) {
        const department =
          employee.department ||
          "Not Assigned";

        if (
          !departmentMap.has(
            department
          )
        ) {
          departmentMap.set(
            department,
            createDepartmentStats(
              department
            )
          );
        }

        departmentMap
          .get(department)
          .totalEmployees++;
      }

      // ---------------------------------------------------
      // Company summary counters
      // ---------------------------------------------------

      let workingDays = 0;
      let holidayDays = 0;

      let presentEmployeeDays = 0;
      let absentEmployeeDays = 0;
      let leaveEmployeeDays = 0;
      let halfDayEmployeeDays = 0;
      let missedCheckoutEmployeeDays = 0;

      // ---------------------------------------------------
      // Process each completed day
      // ---------------------------------------------------

      for (
        let day = 1;
        day <= lastDayToProcess;
        day++
      ) {
        const dayOfWeek =
          getCompanyDayOfWeek(
            selectedYear,
            selectedMonth,
            day
          );

        // -------------------------------------------------
        // Sunday = weekly holiday
        //
        // Saturday remains a working day.
        // -------------------------------------------------

        const isSunday =
          dayOfWeek === 0;

        if (isSunday) {
          continue;
        }

        const dateKey =
          createDateKey(
            selectedYear,
            selectedMonth,
            day
          );

        // -------------------------------------------------
        // Company holiday
        // -------------------------------------------------

        const holiday =
          holidayMap.get(
            dateKey
          );

        if (holiday) {
          holidayDays++;
          continue;
        }

        // -------------------------------------------------
        // This is a working day
        // -------------------------------------------------

        workingDays++;

        // -------------------------------------------------
        // Process every employee
        // -------------------------------------------------

        for (
          const employee of employees
        ) {
          const employeeId =
            String(employee._id);

          const employeeStats =
            employeeStatsMap.get(
              employeeId
            );

          const department =
            employee.department ||
            "Not Assigned";

          const departmentStats =
            departmentMap.get(
              department
            );

          const attendance =
            attendanceMap.get(
              `${employeeId}_${dateKey}`
            );

          const leave =
            leaveMap.get(
              `${employeeId}_${dateKey}`
            );

          // -------------------------------------------------
          // Leave has priority over missing attendance
          // -------------------------------------------------

          if (leave) {
            leaveEmployeeDays++;

            employeeStats.onLeave++;
            departmentStats.onLeave++;

            continue;
          }

          // -------------------------------------------------
          // Attendance exists
          // -------------------------------------------------

          if (attendance) {
            switch (
              attendance.status
            ) {
              case "PRESENT":
                presentEmployeeDays++;

                employeeStats.present++;
                employeeStats.attendanceScore++;

                departmentStats.present++;
                departmentStats.attendanceScore++;

                break;

              case "HALF_DAY":
                halfDayEmployeeDays++;

                employeeStats.halfDay++;
                employeeStats.attendanceScore +=
                  0.5;

                departmentStats.halfDay++;
                departmentStats.attendanceScore +=
                  0.5;

                break;

              case "MISSED_CHECKOUT":
                missedCheckoutEmployeeDays++;

                // Employee was present,
                // but forgot checkout.
                employeeStats.missedCheckout++;
                employeeStats.attendanceScore++;

                departmentStats.missedCheckout++;
                departmentStats.attendanceScore++;

                break;

              case "ABSENT":
                absentEmployeeDays++;

                employeeStats.absent++;
                departmentStats.absent++;

                break;

              case "ON_LEAVE":
                leaveEmployeeDays++;

                employeeStats.onLeave++;
                departmentStats.onLeave++;

                break;

              default:
                absentEmployeeDays++;

                employeeStats.absent++;
                departmentStats.absent++;

                break;
            }

            continue;
          }

          // -------------------------------------------------
          // No attendance + no leave
          // = Absent employee-day
          // -------------------------------------------------

          absentEmployeeDays++;

          employeeStats.absent++;
          departmentStats.absent++;
        }
      }

      // ---------------------------------------------------
      // Expected employee-days
      //
      // Example:
      //
      // 3 employees × 12 working days
      // = 36 expected employee-days
      //
      // Leave days are removed from expected.
      // ---------------------------------------------------

      const totalExpectedEmployeeDays =
        workingDays *
        totalEmployees;

      const expectedEmployeeDays =
        totalExpectedEmployeeDays -
        leaveEmployeeDays;

      // ---------------------------------------------------
      // Attendance score
      //
      // PRESENT = 1
      // MISSED_CHECKOUT = 1
      // HALF_DAY = 0.5
      // ABSENT = 0
      // LEAVE = excluded
      // ---------------------------------------------------

      const attendanceScore =
        presentEmployeeDays +
        missedCheckoutEmployeeDays +
        halfDayEmployeeDays * 0.5;

      // ---------------------------------------------------
      // Overall attendance percentage
      // ---------------------------------------------------

      let attendancePercentage = 0;

      if (
        expectedEmployeeDays > 0
      ) {
        attendancePercentage =
          roundPercentage(
            (attendanceScore /
              expectedEmployeeDays) *
              100
          );
      }

      // ---------------------------------------------------
      // Employee attendance percentages
      // ---------------------------------------------------

      for (
        const employeeStats of
          employeeStatsMap.values()
      ) {
        const expected =
          workingDays -
          employeeStats.onLeave;

        if (expected > 0) {
          employeeStats.attendancePercentage =
            roundPercentage(
              (employeeStats.attendanceScore /
                expected) *
                100
            );
        } else {
          employeeStats.attendancePercentage = 0;
        }
      }

      // ---------------------------------------------------
      // Department attendance percentages
      // ---------------------------------------------------

      for (
        const departmentStats of
          departmentMap.values()
      ) {
        const expected =
          workingDays *
            departmentStats.totalEmployees -
          departmentStats.onLeave;

        if (expected > 0) {
          departmentStats.attendancePercentage =
            roundPercentage(
              (departmentStats.attendanceScore /
                expected) *
                100
            );
        } else {
          departmentStats.attendancePercentage = 0;
        }
      }

      // ---------------------------------------------------
      // Employee statistics array
      // ---------------------------------------------------

      const employeeStats =
        Array.from(
          employeeStatsMap.values()
        );

      // ---------------------------------------------------
      // Department statistics array
      // ---------------------------------------------------

      const departmentStats =
        Array.from(
          departmentMap.values()
        );

      // ---------------------------------------------------
      // Determine remaining working days
      //
      // Current month:
      // Remaining days after today.
      //
      // Past month:
      // 0.
      //
      // Future month:
      // All working days excluding Sundays
      // and holidays.
      // ---------------------------------------------------

      let remainingWorkingDays = 0;

      if (isCurrentMonth) {
        for (
          let day = currentDay + 1;
          day <= daysInMonth;
          day++
        ) {
          const dayOfWeek =
            getCompanyDayOfWeek(
              selectedYear,
              selectedMonth,
              day
            );

          if (dayOfWeek === 0) {
            continue;
          }

          const dateKey =
            createDateKey(
              selectedYear,
              selectedMonth,
              day
            );

          if (
            holidayMap.has(
              dateKey
            )
          ) {
            continue;
          }

          remainingWorkingDays++;
        }
      } else if (isFutureMonth) {
        for (
          let day = 1;
          day <= daysInMonth;
          day++
        ) {
          const dayOfWeek =
            getCompanyDayOfWeek(
              selectedYear,
              selectedMonth,
              day
            );

          if (dayOfWeek === 0) {
            continue;
          }

          const dateKey =
            createDateKey(
              selectedYear,
              selectedMonth,
              day
            );

          if (
            holidayMap.has(
              dateKey
            )
          ) {
            continue;
          }

          remainingWorkingDays++;
        }
      }

      // ---------------------------------------------------
      // Today's dashboard information
      //
      // This is independent of the selected month.
      // ---------------------------------------------------

      const todayStart =
        getCompanyDayStart(
          currentYear,
          currentMonth,
          currentDay
        );

      const tomorrowStart =
        currentDay ===
        getDaysInMonth(
          currentYear,
          currentMonth
        )
          ? (
              currentMonth === 12
                ? getCompanyDayStart(
                    currentYear + 1,
                    1,
                    1
                  )
                : getCompanyDayStart(
                    currentYear,
                    currentMonth + 1,
                    1
                  )
            )
          : getCompanyDayStart(
              currentYear,
              currentMonth,
              currentDay + 1
            );

      // ---------------------------------------------------
      // Today's attendance
      // ---------------------------------------------------

      const todayAttendance =
        await Attendance.find({
          date: {
            $gte: todayStart,
            $lt: tomorrowStart,
          },
        }).select(
          "employeeId status checkIn checkOut workingMinutes"
        );

      const todayLeaves =
        await Leave.find({
          status: "APPROVED",
          startDate: {
            $lt: tomorrowStart,
          },
          endDate: {
            $gte: todayStart,
          },
        }).select(
          "employeeId startDate endDate leaveType"
        );

      const todayLeaveEmployeeIds =
        new Set();

      for (
        const leave of todayLeaves
      ) {
        if (!leave.employeeId) {
          continue;
        }

        const employeeId =
          String(
            leave.employeeId
          );

        if (
          activeEmployeeIds.has(
            employeeId
          )
        ) {
          todayLeaveEmployeeIds.add(
            employeeId
          );
        }
      }

      // ---------------------------------------------------
      // Today's attendance calculation
      // ---------------------------------------------------

      const todayAttendanceEmployeeIds =
        new Set();

      let todayPresent = 0;
      let todayMissedCheckout = 0;
      let todayHalfDay = 0;
      let todayAttendanceScore = 0;

      for (
        const attendance of
          todayAttendance
      ) {
        if (!attendance.employeeId) {
          continue;
        }

        const employeeId =
          String(
            attendance.employeeId
          );

        if (
          !activeEmployeeIds.has(
            employeeId
          )
        ) {
          continue;
        }

        todayAttendanceEmployeeIds.add(
          employeeId
        );

        switch (
          attendance.status
        ) {
          case "PRESENT":
            todayPresent++;
            todayAttendanceScore += 1;
            break;

          case "MISSED_CHECKOUT":
            todayPresent++;
            todayMissedCheckout++;
            todayAttendanceScore += 1;
            break;

          case "HALF_DAY":
            todayHalfDay++;
            todayAttendanceScore += 0.5;
            break;

          default:
            break;
        }
      }

      // ---------------------------------------------------
      // Today's date information
      // ---------------------------------------------------

      const todayDayOfWeek =
        getCompanyDayOfWeek(
          currentYear,
          currentMonth,
          currentDay
        );

      const todayHoliday =
        await Holiday.findOne({
          date: {
            $gte: todayStart,
            $lt: tomorrowStart,
          },
          isActive: true,
        });

      const todayIsSunday =
        todayDayOfWeek === 0;

      // ---------------------------------------------------
      // Today's leave / not checked-in
      // ---------------------------------------------------

      let todayOnLeave = 0;
      let todayNotCheckedIn = 0;

      if (
        !todayHoliday &&
        !todayIsSunday
      ) {
        for (
          const employee of employees
        ) {
          const employeeId =
            String(employee._id);

          if (
            todayLeaveEmployeeIds.has(
              employeeId
            )
          ) {
            todayOnLeave++;
            continue;
          }

          if (
            !todayAttendanceEmployeeIds.has(
              employeeId
            )
          ) {
            todayNotCheckedIn++;
          }
        }
      }

      // ---------------------------------------------------
      // Today's attendance percentage
      // ---------------------------------------------------

      let todayAttendancePercentage = 0;

      if (
        !todayHoliday &&
        !todayIsSunday
      ) {
        const expectedToday =
          totalEmployees -
          todayOnLeave;

        if (
          expectedToday > 0
        ) {
          todayAttendancePercentage =
            roundPercentage(
              (todayAttendanceScore /
                expectedToday) *
                100
            );
        }
      }

      // ---------------------------------------------------
      // Response
      // ---------------------------------------------------

      return res.status(200).json({
        success: true,

        period: {
          month: selectedMonth,
          year: selectedYear,
          today: currentDateKey,
          daysInMonth,

          completedWorkingDays:
            workingDays,

          remainingWorkingDays,

          holidayDays,
        },

        summary: {
          totalEmployees,

          totalExpectedEmployeeDays,

          expectedEmployeeDays,

          presentEmployeeDays,

          absentEmployeeDays,

          leaveEmployeeDays,

          halfDayEmployeeDays,

          missedCheckoutEmployeeDays,

          attendanceScore,

          attendancePercentage,
        },

        // -------------------------------------------------
        // Individual employee summary
        // -------------------------------------------------

        employeeStats,

        // -------------------------------------------------
        // Department summary
        // -------------------------------------------------

        departmentStats,

        // -------------------------------------------------
        // Today's separate summary
        // -------------------------------------------------

        today: {
          date: currentDateKey,

          totalEmployees,

          present: todayPresent,

          halfDay: todayHalfDay,

          onLeave: todayOnLeave,

          notCheckedIn:
            todayNotCheckedIn,

          missedCheckout:
            todayMissedCheckout,

          holiday:
            Boolean(todayHoliday),

          weekend:
            todayIsSunday,

          attendancePercentage:
            todayAttendancePercentage,
        },
      });
    } catch (error) {
      console.error(
        "Get Monthly Dashboard Summary Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };