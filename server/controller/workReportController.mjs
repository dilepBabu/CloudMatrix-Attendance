import WorkReport from "../model/WorkReport.mjs";
import Employee from "../model/Employee.mjs";
import Attendance from "../model/Attendance.mjs";

import mongoose from "mongoose";

export const createWorkReport = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Work description is required",
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Work description must contain at least 10 characters",
      });
    }

    if (description.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Work description cannot exceed 2000 characters",
      });
    }

    // Find logged-in employee
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

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: "You must check in before submitting a work report",
      });
    }

    // Make sure employee has checked in
    if (!attendance.checkIn?.time) {
      return res.status(400).json({
        success: false,
        message: "Check-in is required before submitting a work report",
      });
    }

    // Check whether report already exists
    const existingReport = await WorkReport.findOne({
      attendanceId: attendance._id,
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "Work report has already been submitted for today",
      });
    }

    const workReport = await WorkReport.create({
      employeeId: employee._id,
      userId: req.user._id,
      attendanceId: attendance._id,
      date: startOfDay,
      description: description.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Work report submitted successfully",
      workReport,
    });

  } catch (error) {
    console.error("Create Work Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const getMyWorkReport = async (req, res) => {
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

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const workReport = await WorkReport.findOne({
      employeeId: employee._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).populate(
      "attendanceId",
      "date checkIn checkOut status workingMinutes"
    );

    if (!workReport) {
      return res.status(404).json({
        success: false,
        message: "Work report not submitted for today",
      });
    }

    return res.status(200).json({
      success: true,
      workReport,
    });

  } catch (error) {
    console.error("Get My Work Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const updateMyWorkReport = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Work description is required",
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message:
          "Work description must contain at least 10 characters",
      });
    }

    if (description.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message:
          "Work description cannot exceed 2000 characters",
      });
    }

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

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const workReport = await WorkReport.findOne({
      employeeId: employee._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!workReport) {
      return res.status(404).json({
        success: false,
        message: "Work report not found for today",
      });
    }

    const attendance = await Attendance.findById(
      workReport.attendanceId
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    if (attendance.checkOut?.time) {
      return res.status(400).json({
        success: false,
        message:
          "Work report cannot be edited after checkout",
      });
    }

    workReport.description = description.trim();

    await workReport.save();

    return res.status(200).json({
      success: true,
      message: "Work report updated successfully",
      workReport,
    });

  } catch (error) {
    console.error("Update My Work Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getAllWorkReports = async (req, res) => {
  try {
    const { date, employeeId } = req.query;

    const filter = {};

    // Filter by date
    if (date) {
      const selectedDate = new Date(date);

      if (Number.isNaN(selectedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // Filter by employee
    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID",
        });
      }

      filter.employeeId = employeeId;
    }

    const workReports = await WorkReport.find(filter)
      .populate(
        "employeeId",
        "employeeId name department designation attendanceMethod"
      )
      .populate(
        "attendanceId",
        "date checkIn checkOut status workingMinutes"
      )
      .sort({
        date: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: workReports.length,
      workReports,
    });

  } catch (error) {
    console.error("Get All Work Reports Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};