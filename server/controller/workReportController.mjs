import WorkReport from "../model/WorkReport.mjs";
import Employee from "../model/Employee.mjs";
import Attendance from "../model/Attendance.mjs";

import mongoose from "mongoose";


// =========================================================
// CREATE WORK REPORT
// =========================================================

export const createWorkReport = async (req, res) => {
  try {
    const { description, attendanceId } = req.body;

    // -----------------------------------------------------
    // Validate description
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // Validate attendanceId
    // -----------------------------------------------------

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "Attendance record is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record",
      });
    }


    // -----------------------------------------------------
    // Find logged-in employee
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // Find EXACT attendance record
    // -----------------------------------------------------

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      employeeId: employee._id,
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance record not found",
      });
    }


    // -----------------------------------------------------
    // Check-in required
    // -----------------------------------------------------

    if (!attendance.checkIn?.time) {
      return res.status(400).json({
        success: false,
        message: "You must check in before submitting a work report",
      });
    }


    // -----------------------------------------------------
    // Report can only be submitted before checkout
    // -----------------------------------------------------

    if (attendance.checkOut?.time) {
      return res.status(400).json({
        success: false,
        message: "Work report cannot be submitted after checkout",
      });
    }


    // -----------------------------------------------------
    // Check whether report already exists
    // -----------------------------------------------------

    const existingReport = await WorkReport.findOne({
      attendanceId: attendance._id,
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "Work report has already been submitted for this attendance",
      });
    }


    // -----------------------------------------------------
    // Use attendance date
    // -----------------------------------------------------

    const reportDate = attendance.date
      ? new Date(attendance.date)
      : new Date();

    reportDate.setHours(0, 0, 0, 0);


    // -----------------------------------------------------
    // Create work report
    // -----------------------------------------------------

    const workReport = await WorkReport.create({
      employeeId: employee._id,
      userId: req.user._id,
      attendanceId: attendance._id,
      date: reportDate,
      description: description.trim(),
    });


    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

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



// =========================================================
// GET MY WORK REPORTS
// =========================================================

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


    const workReports = await WorkReport.find({
      employeeId: employee._id,
    })
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
    console.error("Get My Work Reports Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



// =========================================================
// UPDATE MY WORK REPORT
// =========================================================

export const updateMyWorkReport = async (req, res) => {
  try {

    const { description, attendanceId } = req.body;


    // -----------------------------------------------------
    // Validate description
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // Find employee
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // Validate attendanceId
    // -----------------------------------------------------

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "Attendance record is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record",
      });
    }


    // -----------------------------------------------------
    // Find exact work report
    // -----------------------------------------------------

    const workReport = await WorkReport.findOne({
      employeeId: employee._id,
      attendanceId: attendanceId,
    });

    if (!workReport) {
      return res.status(404).json({
        success: false,
        message: "Work report not found for this attendance",
      });
    }


    // -----------------------------------------------------
    // Find linked attendance
    // -----------------------------------------------------

    const attendance = await Attendance.findOne({
      _id: workReport.attendanceId,
      employeeId: employee._id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }


    // -----------------------------------------------------
    // Cannot edit after checkout
    // -----------------------------------------------------

    if (attendance.checkOut?.time) {
      return res.status(400).json({
        success: false,
        message:
          "Work report cannot be edited after checkout",
      });
    }


    // -----------------------------------------------------
    // Update
    // -----------------------------------------------------

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



// =========================================================
// GET ALL WORK REPORTS - ADMIN
// =========================================================

export const getAllWorkReports = async (req, res) => {
  try {

    console.log("===== GET ALL WORK REPORTS =====");
    console.log("req.user:", req.user);


    const { date, employeeId } = req.query;

    const filter = {};


    // -----------------------------------------------------
    // Filter by date
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // Filter by employee
    // -----------------------------------------------------

    if (employeeId) {

      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID",
        });
      }

      filter.employeeId = employeeId;
    }


    // -----------------------------------------------------
    // Get reports
    // -----------------------------------------------------

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