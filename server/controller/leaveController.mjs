import mongoose from "mongoose";

import Leave from "../model/Leave.mjs";
import Employee from "../model/Employee.mjs";
import LeaveAllocation from "../model/LeaveAllocation.mjs";
import Attendance from "../model/Attendance.mjs";

import {
    getCompanyDateParts,
    getCompanyDayStart,
    getCompanyMonthRange,
    getCompanyDayOfWeek,
    parseCompanyDate,
} from "../utils/dateUtils.mjs";


// =====================================================
// HELPER - GET START OF DAY
// =====================================================

const getStartOfDay = (date) => {
    return getCompanyDayStart(
        getCompanyDateParts(date).year,
        getCompanyDateParts(date).month,
        getCompanyDateParts(date).day
    );
};


// =====================================================
// HELPER - GET END OF DAY
// =====================================================

const getEndOfDay = (date) => {
    const startOfDay = getStartOfDay(date);

    return new Date(
        startOfDay.getTime() +
            24 * 60 * 60 * 1000 -
            1
    );
};


// =====================================================
// HELPER - CHECK WEEKEND
// =====================================================

const isWeekend = (date) => {
    const { year, month, day } =
        getCompanyDateParts(date);

    const dayOfWeek = getCompanyDayOfWeek(
        year,
        month,
        day
    );

    return dayOfWeek === 0 || dayOfWeek === 6;
};


// =====================================================
// HELPER - GET TOTAL CALENDAR DAYS
// =====================================================

const calculateCalendarDays = (
    startDate,
    endDate
) => {
    const start = getStartOfDay(startDate);
    const end = getStartOfDay(endDate);

    const difference =
        end.getTime() - start.getTime();

    return (
        Math.floor(
            difference /
                (1000 * 60 * 60 * 24)
        ) + 1
    );
};


// =====================================================
// HELPER - GET TOTAL WORKING DAYS
// EXCLUDES SATURDAY AND SUNDAY
// =====================================================

const calculateLeaveDays = (
    startDate,
    endDate
) => {
    let currentDate =
        getStartOfDay(startDate);

    const finalDate =
        getStartOfDay(endDate);

    let workingDays = 0;

    while (currentDate <= finalDate) {
        if (!isWeekend(currentDate)) {
            workingDays++;
        }

        currentDate = new Date(
            currentDate.getTime() +
                24 * 60 * 60 * 1000
        );
    }

    return workingDays;
};


// =====================================================
// HELPER - VALIDATE LEAVE DATE
// =====================================================

const parseAndNormalizeLeaveDate = (
    dateString
) => {
    const parsed =
        parseCompanyDate(dateString);

    if (!parsed) {
        return null;
    }

    return parsed.start;
};


// =====================================================
// EMPLOYEE - GET CASUAL LEAVE BALANCE
// =====================================================

export const getMyCasualLeaveBalance = async (
    req,
    res
) => {
    try {
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

        // -----------------------------------------------
        // Current company date
        // -----------------------------------------------

        const {
            year,
            month,
        } = getCompanyDateParts(
            new Date()
        );

        // -----------------------------------------------
        // Find allocation
        // -----------------------------------------------

        const allocation =
            await LeaveAllocation.findOne({
                employeeId: employee._id,
                year,
                month,
            });

        // Default = 1 casual leave
        const casualLeaveLimit =
            allocation?.casualLeaveLimit ?? 1;

        // -----------------------------------------------
        // Company month range
        // -----------------------------------------------

        const {
            start: monthStart,
            end: monthEnd,
        } = getCompanyMonthRange(
            year,
            month
        );

        // -----------------------------------------------
        // Get used casual leaves
        // -----------------------------------------------

        const usedLeaves =
            await Leave.find({
                employeeId: employee._id,
                leaveType: "CASUAL",
                status: {
                    $in: [
                        "PENDING",
                        "APPROVED",
                    ],
                },
                startDate: {
                    $gte: monthStart,
                },
                endDate: {
                    $lte: monthEnd,
                },
            });

        // -----------------------------------------------
        // Calculate working days only
        // -----------------------------------------------

        let usedDays = 0;

        for (const leave of usedLeaves) {
            usedDays += calculateLeaveDays(
                leave.startDate,
                leave.endDate
            );
        }

        const availableDays = Math.max(
            casualLeaveLimit - usedDays,
            0
        );

        return res.status(200).json({
            success: true,
            year,
            month,
            casualLeaveLimit,
            usedDays,
            availableDays,
        });

    } catch (error) {
        console.error(
            "Get Casual Leave Balance Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// =====================================================
// EMPLOYEE - APPLY FOR LEAVE
// =====================================================

export const applyLeave = async (
    req,
    res
) => {
    try {
        const {
            leaveType,
            startDate,
            endDate,
            reason,
        } = req.body;

        // -----------------------------------------------
        // Required fields
        // -----------------------------------------------

        if (
            !leaveType ||
            !startDate ||
            !endDate ||
            !reason
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "All leave fields are required",
            });
        }

        // -----------------------------------------------
        // Leave type validation
        // -----------------------------------------------

        const allowedLeaveTypes = [
            "CASUAL",
            "SICK",
            "EARNED",
            "UNPAID",
            "OTHER",
        ];

        if (
            !allowedLeaveTypes.includes(
                leaveType
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave type",
            });
        }

        // -----------------------------------------------
        // Reason validation
        // -----------------------------------------------

        if (reason.trim().length < 5) {
            return res.status(400).json({
                success: false,
                message:
                    "Reason must contain at least 5 characters",
            });
        }

        if (reason.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                message:
                    "Reason cannot exceed 1000 characters",
            });
        }

        // -----------------------------------------------
        // Date validation
        // -----------------------------------------------

        const normalizedStartDate =
            parseAndNormalizeLeaveDate(
                startDate
            );

        const normalizedEndDate =
            parseAndNormalizeLeaveDate(
                endDate
            );

        if (
            !normalizedStartDate ||
            !normalizedEndDate
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid leave dates. Use YYYY-MM-DD format.",
            });
        }

        // -----------------------------------------------
        // End date validation
        // -----------------------------------------------

        if (
            normalizedEndDate <
            normalizedStartDate
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "End date cannot be before start date",
            });
        }

        // -----------------------------------------------
        // Prevent leave crossing months
        // -----------------------------------------------

        const startParts =
            getCompanyDateParts(
                normalizedStartDate
            );

        const endParts =
            getCompanyDateParts(
                normalizedEndDate
            );

        if (
            startParts.month !==
                endParts.month ||
            startParts.year !==
                endParts.year
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Leave cannot cross into another month",
            });
        }

        // -----------------------------------------------
        // Find employee
        // -----------------------------------------------

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

        // -----------------------------------------------
        // Calculate working leave days
        // -----------------------------------------------

        const requestedDays =
            calculateLeaveDays(
                normalizedStartDate,
                normalizedEndDate
            );

        // -----------------------------------------------
        // Reject weekend-only leave
        // -----------------------------------------------

        if (requestedDays === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Leave must contain at least one working day",
            });
        }

        // -----------------------------------------------
        // CASUAL LEAVE LIMIT CHECK
        // -----------------------------------------------

        if (leaveType === "CASUAL") {
            const year =
                startParts.year;

            const month =
                startParts.month;

            const allocation =
                await LeaveAllocation.findOne({
                    employeeId:
                        employee._id,
                    year,
                    month,
                });

            // Default = 1 day
            const casualLeaveLimit =
                allocation?.casualLeaveLimit ?? 1;

            const {
                start: monthStart,
                end: monthEnd,
            } = getCompanyMonthRange(
                year,
                month
            );

            const existingCasualLeaves =
                await Leave.find({
                    employeeId:
                        employee._id,

                    leaveType: "CASUAL",

                    status: {
                        $in: [
                            "PENDING",
                            "APPROVED",
                        ],
                    },

                    startDate: {
                        $gte: monthStart,
                    },

                    endDate: {
                        $lte: monthEnd,
                    },
                });

            let usedDays = 0;

            for (
                const leave of
                    existingCasualLeaves
            ) {
                usedDays +=
                    calculateLeaveDays(
                        leave.startDate,
                        leave.endDate
                    );
            }

            const availableDays =
                casualLeaveLimit -
                usedDays;

            if (
                requestedDays >
                availableDays
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Insufficient casual leave balance",
                    casualLeaveLimit,
                    usedDays,
                    availableDays:
                        Math.max(
                            availableDays,
                            0
                        ),
                    requestedDays,
                });
            }
        }

        // -----------------------------------------------
        // Prevent overlapping leave
        // -----------------------------------------------

        const overlappingLeave =
            await Leave.findOne({
                employeeId:
                    employee._id,

                status: {
                    $in: [
                        "PENDING",
                        "APPROVED",
                    ],
                },

                startDate: {
                    $lte:
                        normalizedEndDate,
                },

                endDate: {
                    $gte:
                        normalizedStartDate,
                },
            });

        if (overlappingLeave) {
            return res.status(400).json({
                success: false,
                message:
                    "You already have a pending or approved leave for the selected dates",
            });
        }

        // -----------------------------------------------
        // Create leave
        // -----------------------------------------------

        const leave =
            await Leave.create({
                employeeId:
                    employee._id,

                userId:
                    req.user._id,

                leaveType,

                startDate:
                    normalizedStartDate,

                endDate:
                    normalizedEndDate,

                reason:
                    reason.trim(),

                status: "PENDING",
            });

        return res.status(201).json({
            success: true,
            message:
                "Leave application submitted successfully",
            leave,
            requestedDays,
        });

    } catch (error) {
        console.error(
            "Apply Leave Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// =====================================================
// EMPLOYEE - GET MY LEAVES
// =====================================================

export const getMyLeaves = async (
    req,
    res
) => {
    try {
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

        const leaves =
            await Leave.find({
                employeeId:
                    employee._id,
            })
                .sort({
                    startDate: -1,
                    createdAt: -1,
                })
                .populate(
                    "reviewedBy",
                    "email"
                );

        return res.status(200).json({
            success: true,
            count: leaves.length,
            leaves,
        });

    } catch (error) {
        console.error(
            "Get My Leaves Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// =====================================================
// EMPLOYEE - CANCEL PENDING LEAVE
// =====================================================

export const cancelMyLeave = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID",
            });
        }

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

        const leave =
            await Leave.findOne({
                _id: id,
                employeeId:
                    employee._id,
            });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message:
                    "Leave application not found",
            });
        }

        if (
            leave.status !== "PENDING"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Only pending leave applications can be cancelled",
            });
        }

        leave.status = "CANCELLED";

        await leave.save();

        return res.status(200).json({
            success: true,
            message:
                "Leave cancelled successfully",
            leave,
        });

    } catch (error) {
        console.error(
            "Cancel Leave Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// =====================================================
// ADMIN - GET ALL LEAVES
// =====================================================

export const getAllLeaves = async (
    req,
    res
) => {
    try {
        const {
            status,
            employeeId,
            date,
        } = req.query;

        const filter = {};

        // -----------------------------------------------
        // Status filter
        // -----------------------------------------------

        if (status) {
            const allowedStatuses = [
                "PENDING",
                "APPROVED",
                "REJECTED",
                "CANCELLED",
            ];

            const normalizedStatus =
                status.toUpperCase();

            if (
                !allowedStatuses.includes(
                    normalizedStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid leave status",
                });
            }

            filter.status =
                normalizedStatus;
        }

        // -----------------------------------------------
        // Employee filter
        // -----------------------------------------------

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

        // -----------------------------------------------
        // Date filter
        // -----------------------------------------------

        if (date) {
            const parsedDate =
                parseCompanyDate(date);

            if (!parsedDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid date. Use YYYY-MM-DD format.",
                });
            }

            filter.startDate = {
                $lte: parsedDate.end,
            };

            filter.endDate = {
                $gte: parsedDate.start,
            };
        }

        const leaves =
            await Leave.find(filter)
                .populate(
                    "employeeId",
                    "employeeId name department designation attendanceMethod"
                )
                .populate(
                    "reviewedBy",
                    "email"
                )
                .sort({
                    createdAt: -1,
                });

        return res.status(200).json({
            success: true,
            count: leaves.length,
            leaves,
        });

    } catch (error) {
        console.error(
            "Get All Leaves Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// =====================================================
// HELPER - CREATE ATTENDANCE FOR APPROVED LEAVE
// ONLY WORKING DAYS
// =====================================================

const createAttendanceForApprovedLeave =
    async (leave) => {
        let currentDate =
            getStartOfDay(
                leave.startDate
            );

        const endDate =
            getStartOfDay(
                leave.endDate
            );

        while (
            currentDate <= endDate
        ) {
            // -------------------------------------------
            // Skip Saturday and Sunday
            // -------------------------------------------

            if (!isWeekend(currentDate)) {
                const attendanceDate =
                    getStartOfDay(
                        currentDate
                    );

                const existingAttendance =
                    await Attendance.findOne({
                        employeeId:
                            leave.employeeId,

                        date:
                            attendanceDate,
                    });

                if (!existingAttendance) {
                    await Attendance.create({
                        employeeId:
                            leave.employeeId,

                        userId:
                            leave.userId,

                        date:
                            attendanceDate,

                        status:
                            "ON_LEAVE",

                        workingMinutes: 0,
                    });
                }
            }

            currentDate =
                new Date(
                    currentDate.getTime() +
                        24 * 60 * 60 * 1000
                );
        }
    };


// =====================================================
// ADMIN - APPROVE / REJECT LEAVE
// =====================================================

export const reviewLeave = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const {
            status,
            adminComment,
        } = req.body;

        // -----------------------------------------------
        // Validate leave ID
        // -----------------------------------------------

        if (
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid leave ID",
            });
        }

        // -----------------------------------------------
        // Validate status
        // -----------------------------------------------

        if (
            ![
                "APPROVED",
                "REJECTED",
            ].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be APPROVED or REJECTED",
            });
        }

        // -----------------------------------------------
        // Validate admin comment
        // -----------------------------------------------

        if (
            adminComment &&
            adminComment.trim().length > 1000
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Admin comment cannot exceed 1000 characters",
            });
        }

        // -----------------------------------------------
        // Find leave
        // -----------------------------------------------

        const leave =
            await Leave.findById(id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message:
                    "Leave application not found",
            });
        }

        // -----------------------------------------------
        // Only pending leaves can be reviewed
        // -----------------------------------------------

        if (
            leave.status !== "PENDING"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Only pending leave applications can be reviewed",
            });
        }

        // -----------------------------------------------
        // Check casual leave again during approval
        // -----------------------------------------------

        if (
            status === "APPROVED" &&
            leave.leaveType === "CASUAL"
        ) {
            const {
                year,
                month,
            } = getCompanyDateParts(
                leave.startDate
            );

            const allocation =
                await LeaveAllocation.findOne({
                    employeeId:
                        leave.employeeId,

                    year,
                    month,
                });

            const casualLeaveLimit =
                allocation?.casualLeaveLimit ?? 1;

            const {
                start: monthStart,
                end: monthEnd,
            } = getCompanyMonthRange(
                year,
                month
            );

            const otherCasualLeaves =
                await Leave.find({
                    employeeId:
                        leave.employeeId,

                    leaveType: "CASUAL",

                    status: "APPROVED",

                    _id: {
                        $ne: leave._id,
                    },

                    startDate: {
                        $gte: monthStart,
                    },

                    endDate: {
                        $lte: monthEnd,
                    },
                });

            let approvedDays = 0;

            for (
                const existingLeave of
                    otherCasualLeaves
            ) {
                approvedDays +=
                    calculateLeaveDays(
                        existingLeave.startDate,
                        existingLeave.endDate
                    );
            }

            const requestedDays =
                calculateLeaveDays(
                    leave.startDate,
                    leave.endDate
                );

            if (
                requestedDays === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Leave must contain at least one working day",
                });
            }

            if (
                approvedDays +
                    requestedDays >
                casualLeaveLimit
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Cannot approve. Employee does not have enough casual leave balance",

                    casualLeaveLimit,

                    approvedDays,

                    requestedDays,
                });
            }
        }

        // -----------------------------------------------
        // Update leave status
        // -----------------------------------------------

        leave.status = status;

        leave.adminComment =
            adminComment?.trim() || "";

        leave.reviewedBy =
            req.user._id;

        leave.reviewedAt =
            new Date();

        // -----------------------------------------------
        // Create attendance for approved leave
        // -----------------------------------------------

        if (status === "APPROVED") {
            await createAttendanceForApprovedLeave(
                leave
            );
        }

        await leave.save();

        return res.status(200).json({
            success: true,
            message:
                `Leave ${status.toLowerCase()} successfully`,
            leave,
        });

    } catch (error) {
        console.error(
            "Review Leave Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// =====================================================
// ADMIN - GET EMPLOYEE LEAVE ALLOCATION
// =====================================================

export const getEmployeeLeaveAllocation =
    async (
        req,
        res
    ) => {
        try {
            const { employeeId } =
                req.params;

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

            const employee =
                await Employee.findById(
                    employeeId
                );

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Employee not found",
                });
            }

            const {
                year: currentYear,
                month: currentMonth,
            } =
                getCompanyDateParts(
                    new Date()
                );

            const year =
                Number(req.query.year) ||
                currentYear;

            const month =
                Number(req.query.month) ||
                currentMonth;

            if (
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid month",
                });
            }

            const allocation =
                await LeaveAllocation.findOne({
                    employeeId,
                    year,
                    month,
                });

            return res.status(200).json({
                success: true,

                employee: {
                    _id:
                        employee._id,

                    employeeId:
                        employee.employeeId,

                    name:
                        employee.name,
                },

                year,

                month,

                casualLeaveLimit:
                    allocation
                        ?.casualLeaveLimit ??
                    1,
            });

        } catch (error) {
            console.error(
                "Get Employee Leave Allocation Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Server error",
            });
        }
    };


// =====================================================
// ADMIN - SET EMPLOYEE CASUAL LEAVE ALLOCATION
// =====================================================

export const setEmployeeLeaveAllocation =
    async (
        req,
        res
    ) => {
        try {
            const { employeeId } =
                req.params;

            const {
                year,
                month,
                casualLeaveLimit,
            } = req.body;

            // -------------------------------------------
            // Validate employee ID
            // -------------------------------------------

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

            // -------------------------------------------
            // Validate year
            // -------------------------------------------

            if (
                year === undefined ||
                !Number.isInteger(year) ||
                year < 2020 ||
                year > 2100
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid year is required",
                });
            }

            // -------------------------------------------
            // Validate month
            // -------------------------------------------

            if (
                month === undefined ||
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Month must be between 1 and 12",
                });
            }

            // -------------------------------------------
            // Validate casual leave limit
            // -------------------------------------------

            if (
                casualLeaveLimit === undefined ||
                !Number.isInteger(
                    casualLeaveLimit
                ) ||
                casualLeaveLimit < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Casual leave limit must be a non-negative integer",
                });
            }

            // -------------------------------------------
            // Find employee
            // -------------------------------------------

            const employee =
                await Employee.findById(
                    employeeId
                );

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Employee not found",
                });
            }

            // -------------------------------------------
            // Create or update allocation
            // -------------------------------------------

            const allocation =
                await LeaveAllocation.findOneAndUpdate(
                    {
                        employeeId,
                        year,
                        month,
                    },
                    {
                        $set: {
                            casualLeaveLimit,
                        },
                    },
                    {
                        returnDocument:
                            "after",
                        upsert: true,
                        runValidators:
                            true,
                    }
                );

            return res.status(200).json({
                success: true,
                message:
                    "Casual leave allocation updated successfully",
                allocation,
            });

        } catch (error) {
            console.error(
                "Set Employee Leave Allocation Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Server error",
            });
        }
    };