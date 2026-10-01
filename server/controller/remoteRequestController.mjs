import mongoose from "mongoose";

import RemoteRequest from "../model/RemoteRequest.mjs";
import Employee from "../model/Employee.mjs";

import {
  parseCompanyDate,
  getCurrentCompanyDayStart,
} from "../utils/dateUtils.mjs";

/*
|--------------------------------------------------------------------------
| Helper: Get employee for logged-in user
|--------------------------------------------------------------------------
*/

const getEmployeeForUser = async (userId) => {
  return await Employee.findOne({
    userId,
    employmentStatus: "ACTIVE",
  });
};

/*
|--------------------------------------------------------------------------
| EMPLOYEE
| Create Remote / WFH Request
|--------------------------------------------------------------------------
*/

export const createRemoteRequest = async (req, res) => {
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

    /*
    |--------------------------------------------------------------------------
    | Parse requested date
    |--------------------------------------------------------------------------
    */

    const parsedDate = parseCompanyDate(date);

    if (!parsedDate || !parsedDate.start) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    const requestedDate = parsedDate.start;

    /*
    |--------------------------------------------------------------------------
    | Do not allow past dates
    |--------------------------------------------------------------------------
    */

    const today = getCurrentCompanyDayStart();

    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        message: "You cannot request WFH for a past date",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check existing request
    |--------------------------------------------------------------------------
    */

    const existingRequest = await RemoteRequest.findOne({
      employeeId: employee._id,
      date: requestedDate,
      status: {
        $in: ["PENDING", "APPROVED", "REJECTED"],
      },
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: `A remote request already exists for this date with status ${existingRequest.status}`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create request
    |--------------------------------------------------------------------------
    */

    const remoteRequest = await RemoteRequest.create({
      employeeId: employee._id,
      date: requestedDate,
      reason: reason.trim(),
      requestedMethod: "REMOTE",
      status: "PENDING",
    });

    return res.status(201).json({
      success: true,
      message: "Remote work request submitted successfully",
      request: remoteRequest,
    });
  } catch (error) {
    console.error(
      "Create Remote Request Error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | Handle MongoDB duplicate key
    |--------------------------------------------------------------------------
    */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A remote request already exists for this date",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create remote request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EMPLOYEE
| Get My Remote Requests
|--------------------------------------------------------------------------
*/

export const getMyRemoteRequests = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee record not found",
      });
    }

    const requests = await RemoteRequest.find({
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
      "Get My Remote Requests Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch remote requests",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EMPLOYEE
| Cancel Pending Remote Request
|--------------------------------------------------------------------------
*/

export const cancelRemoteRequest = async (req, res) => {
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

    const request = await RemoteRequest.findOne({
      _id: requestId,
      employeeId: employee._id,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Remote request not found",
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
      message: "Remote request cancelled successfully",
      request,
    });
  } catch (error) {
    console.error(
      "Cancel Remote Request Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to cancel remote request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN
| Get All Remote Requests
|--------------------------------------------------------------------------
*/

export const getAllRemoteRequests = async (req, res) => {
  try {
    const {
      status,
      employeeId,
      date,
    } = req.query;

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Status filter
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Employee filter
    |--------------------------------------------------------------------------
    */

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID",
        });
      }

      filter.employeeId = employeeId;
    }

    /*
    |--------------------------------------------------------------------------
    | Date filter
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Fetch requests
    |--------------------------------------------------------------------------
    */

    const requests = await RemoteRequest.find(filter)
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
      "Get All Remote Requests Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch remote requests",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN
| Approve Remote Request
|--------------------------------------------------------------------------
*/

export const approveRemoteRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await RemoteRequest.findById(
      requestId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Remote request not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Only PENDING requests can be approved
    |--------------------------------------------------------------------------
    */

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a request with status ${request.status}`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Make sure employee still exists and is active
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Approve
    |--------------------------------------------------------------------------
    */

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
      message: "Remote request approved successfully",
      request,
    });
  } catch (error) {
    console.error(
      "Approve Remote Request Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to approve remote request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN
| Reject Remote Request
|--------------------------------------------------------------------------
*/

export const rejectRemoteRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await RemoteRequest.findById(
      requestId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Remote request not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Only PENDING requests can be rejected
    |--------------------------------------------------------------------------
    */

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a request with status ${request.status}`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Reject
    |--------------------------------------------------------------------------
    */

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
      message: "Remote request rejected successfully",
      request,
    });
  } catch (error) {
    console.error(
      "Reject Remote Request Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to reject remote request",
      error: error.message,
    });
  }
};
