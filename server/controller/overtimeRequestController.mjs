import mongoose from "mongoose";
import OvertimeRequest from "../model/OvertimeRequest.mjs";
import Employee from "../model/Employee.mjs";
import {
  parseCompanyDate,
  getCurrentCompanyDayStart,
} from "../utils/dateUtils.mjs";

const getEmployeeForUser = async (userId) => {
  return await Employee.findOne({
    userId,
    employmentStatus: "ACTIVE",
  });
};

/*
|--------------------------------------------------------------------------
| EMPLOYEE - CREATE OVERTIME REQUEST
|--------------------------------------------------------------------------
*/

export const createOvertimeRequest = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee record not found",
      });
    }

    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    const parsedDate = parseCompanyDate(date);

    if (!parsedDate || !parsedDate.start) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    const requestedDate = parsedDate.start;

    const today = getCurrentCompanyDayStart();

    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        message: "You cannot request overtime for a past date",
      });
    }

    const existingRequest = await OvertimeRequest.findOne({
      employeeId: employee._id,
      date: requestedDate,
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: `An overtime request already exists for this date with status ${existingRequest.status}`,
        request: existingRequest,
      });
    }

    const overtimeRequest = await OvertimeRequest.create({
      employeeId: employee._id,
      date: requestedDate,
      reason: reason.trim(),
      status: "PENDING",
    });

    return res.status(201).json({
      success: true,
      message: "Overtime request submitted successfully",
      request: overtimeRequest,
    });
  } catch (error) {
    console.error(
      "Create Overtime Request Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An overtime request already exists for this date",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create overtime request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EMPLOYEE - GET MY OVERTIME REQUESTS
|--------------------------------------------------------------------------
*/

export const getMyOvertimeRequests = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee record not found",
      });
    }

    const requests = await OvertimeRequest.find({
      employeeId: employee._id,
    })
      .populate(
        "reviewedBy",
        "name email"
      )
      .sort({
        date: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error(
      "Get My Overtime Requests Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch overtime requests",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EMPLOYEE - CANCEL PENDING REQUEST
|--------------------------------------------------------------------------
*/

export const cancelOvertimeRequest = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee record not found",
      });
    }

    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await OvertimeRequest.findOne({
      _id: requestId,
      employeeId: employee._id,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Overtime request not found",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request with status ${request.status}`,
      });
    }

    request.status = "CANCELLED";

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Overtime request cancelled successfully",
      request,
    });
  } catch (error) {
    console.error(
      "Cancel Overtime Request Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to cancel overtime request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - GET ALL OVERTIME REQUESTS
|--------------------------------------------------------------------------
*/

export const getAllOvertimeRequests = async (req, res) => {
  try {
    const {
      status,
      employeeId,
      date,
    } = req.query;

    const filter = {};

    if (status) {
      const allowedStatuses = [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      filter.status = status;
    }

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID",
        });
      }

      filter.employeeId = employeeId;
    }

    if (date) {
      const parsedDate = parseCompanyDate(date);

      if (!parsedDate || !parsedDate.start) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }

      filter.date = parsedDate.start;
    }

    const requests = await OvertimeRequest.find(filter)
      .populate(
        "employeeId",
        "employeeId name department designation attendanceMethod employmentStatus"
      )
      .populate(
        "reviewedBy",
        "name email"
      )
      .sort({
        date: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error(
      "Get All Overtime Requests Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch overtime requests",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - APPROVE OVERTIME REQUEST
|--------------------------------------------------------------------------
*/

export const approveOvertimeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await OvertimeRequest.findById(
      requestId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Overtime request not found",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a request with status ${request.status}`,
      });
    }

    const employee = await Employee.findOne({
      _id: request.employeeId,
      employmentStatus: "ACTIVE",
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Employee is not active",
      });
    }

    request.status = "APPROVED";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    if (adminComment !== undefined) {
      request.adminComment =
        adminComment?.trim() || undefined;
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Overtime request approved successfully",
      request,
    });
  } catch (error) {
    console.error(
      "Approve Overtime Request Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to approve overtime request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - REJECT OVERTIME REQUEST
|--------------------------------------------------------------------------
*/

export const rejectOvertimeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await OvertimeRequest.findById(
      requestId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Overtime request not found",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a request with status ${request.status}`,
      });
    }

    request.status = "REJECTED";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    if (adminComment !== undefined) {
      request.adminComment =
        adminComment?.trim() || undefined;
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Overtime request rejected successfully",
      request,
    });
  } catch (error) {
    console.error(
      "Reject Overtime Request Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to reject overtime request",
      error: error.message,
    });
  }
};