import Attendance from "../model/Attendance.mjs";
import Employee from "../model/Employee.mjs";
import CompanySettings from "../model/CompanySettings.mjs";
import User from "../model/User.mjs";


// Calculate distance between two GPS coordinates
const calculateDistance = (
    latitude1,
    longitude1,
    latitude2,
    longitude2
) => {
    const earthRadius = 6371000; // meters

    const lat1 = (latitude1 * Math.PI) / 180;
    const lat2 = (latitude2 * Math.PI) / 180;

    const latitudeDifference =
        ((latitude2 - latitude1) * Math.PI) / 180;

    const longitudeDifference =
        ((longitude2 - longitude1) * Math.PI) / 180;

    const a =
        Math.sin(latitudeDifference / 2) *
        Math.sin(latitudeDifference / 2) +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(longitudeDifference / 2) *
        Math.sin(longitudeDifference / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
};


// Employee Check-In
export const checkIn = async (req, res) => {
    try {
        const { latitude, longitude, accuracy } = req.body;

        // Validate GPS coordinates
        if (
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Location is required for check-in",
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
                message: "Valid GPS accuracy is required",
            });
        }

        // Find employee profile
        const employee = await Employee.findOne({
            userId: req.user._id,
            employmentStatus: "ACTIVE",
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Active employee profile not found",
            });
        }

        // Get today's date
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // Check whether employee already has attendance today
        const existingAttendance = await Attendance.findOne({
            employeeId: employee._id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: "You have already checked in today",
            });
        }


        // Get company settings
        const settings = await CompanySettings.findOne();

        if (!settings) {
            return res.status(500).json({
                success: false,
                message: "Office location has not been configured",
            });
        }

        // Determine attendance method
        const attendanceMethod = employee.attendanceMethod;

        let checkInMethod = attendanceMethod;

        // OFFICE attendance requires location validation
        if (attendanceMethod === "OFFICE") {
            if (!settings.officeAttendanceEnabled) {
                return res.status(403).json({
                    success: false,
                    message: "Office attendance is currently disabled",
                });

            }
            if (accuracy > 50) {
                return res.status(403).json({
                    success: false,
                    message: "GPS accuracy is too low. Please move to an open area and try again.",
                    accuracy: Math.round(accuracy),
                    maximumAllowedAccuracy: 50,
                });
            }

            const distance = calculateDistance(
                latitude,
                longitude,
                settings.officeLocation.latitude,
                settings.officeLocation.longitude
            );

            if (distance > settings.officeLocation.radius) {
                return res.status(403).json({
                    success: false,
                    message: "You are outside the office attendance area",
                    distance: Math.round(distance),
                    allowedRadius: settings.officeLocation.radius,
                });
            }

            checkInMethod = "OFFICE";
        }

        // REMOTE employees don't need office-radius validation
        if (attendanceMethod === "REMOTE") {
            checkInMethod = "REMOTE";
        }

        // FIELD employees can check in from anywhere
        if (attendanceMethod === "FIELD") {
            checkInMethod = "FIELD";
        }

        // Create attendance
        const attendance = await Attendance.create({
            employeeId: employee._id,
            userId: req.user._id,
            date: startOfDay,

            checkIn: {
                time: now,
                location: {
                    latitude,
                    longitude,
                    accuracy,
                },
                method: checkInMethod,
            },

            status: "PRESENT",
            workingMinutes: 0,
        });

        return res.status(201).json({
            success: true,
            message: "Check-in successful",
            attendance: {
                id: attendance._id,
                employeeId: employee.employeeId,
                checkIn: attendance.checkIn,
                status: attendance.status,
            },
        });

    } catch (error) {
        console.error("Check-In Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// Employee Check-Out
export const checkOut = async (req, res) => {
    try {
        const { latitude, longitude, accuracy } = req.body;

        // Validate GPS coordinates
        if (
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Location is required for check-out",
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
                message: "Valid GPS accuracy is required",
            });
        }

        // Find employee
        const employee = await Employee.findOne({
            userId: req.user._id,
            employmentStatus: "ACTIVE",
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Active employee profile not found",
            });
        }

        // Get today's date range
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // Find today's attendance
        const attendance = await Attendance.findOne({
            employeeId: employee._id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });

        // Employee must check in first
        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: "You have not checked in today",
            });
        }

        // Prevent duplicate check-out
        if (attendance.checkOut?.time) {
            return res.status(400).json({
                success: false,
                message: "You have already checked out today",
            });
        }

        // Get company settings
        const settings = await CompanySettings.findOne();

        if (!settings) {
            return res.status(500).json({
                success: false,
                message: "Office location has not been configured",
            });
        }

        const attendanceMethod = employee.attendanceMethod;

        let checkOutMethod = attendanceMethod;

        // OFFICE employees must be inside office radius
        if (attendanceMethod === "OFFICE") {
            if (!settings.officeAttendanceEnabled) {
                return res.status(403).json({
                    success: false,
                    message: "Office attendance is currently disabled",
                });
            }
            if (accuracy > 50) {
                return res.status(403).json({
                    success: false,
                    message: "GPS accuracy is too low. Please move to an open area and try again.",
                    accuracy: Math.round(accuracy),
                    maximumAllowedAccuracy: 50,
                });
            }

            const distance = calculateDistance(
                latitude,
                longitude,
                settings.officeLocation.latitude,
                settings.officeLocation.longitude
            );

            if (distance > settings.officeLocation.radius) {
                return res.status(403).json({
                    success: false,
                    message: "You are outside the office attendance area",
                    distance: Math.round(distance),
                    allowedRadius: settings.officeLocation.radius,
                });
            }

            checkOutMethod = "OFFICE";
        }

        // REMOTE employees
        if (attendanceMethod === "REMOTE") {
            checkOutMethod = "REMOTE";
        }

        // FIELD employees
        if (attendanceMethod === "FIELD") {
            checkOutMethod = "FIELD";
        }

        // Calculate working time
        const checkInTime = attendance.checkIn.time;

        const workingMilliseconds =
            now.getTime() - new Date(checkInTime).getTime();

        const workingMinutes = Math.floor(
            workingMilliseconds / (1000 * 60)
        );

        // Update attendance
        attendance.checkOut = {
            time: now,
            location: {
                latitude,
                longitude,
                accuracy,
            },
            method: checkOutMethod,
        };

        attendance.workingMinutes = workingMinutes;

        await attendance.save();

        return res.status(200).json({
            success: true,
            message: "Check-out successful",
            attendance: {
                id: attendance._id,
                employeeId: employee.employeeId,
                checkIn: attendance.checkIn,
                checkOut: attendance.checkOut,
                status: attendance.status,
                workingMinutes: attendance.workingMinutes,
            },
        });

    } catch (error) {
        console.error("Check-Out Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const getMyAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      userId: req.user._id,
      employmentStatus: "ACTIVE",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee profile not found",
      });
    }

    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
    })
      .sort({ date: -1 })
      .select(
        "date checkIn checkOut status workingMinutes createdAt updatedAt"
      );

    return res.status(200).json({
      success: true,
      count: attendanceRecords.length,
      attendance: attendanceRecords,
    });

  } catch (error) {
    console.error("Get My Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};