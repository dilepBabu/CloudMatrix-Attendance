import express from "express";

import {
  createOvertimeRequest,
  getMyOvertimeRequests,
  cancelOvertimeRequest,
  getAllOvertimeRequests,
  approveOvertimeRequest,
  rejectOvertimeRequest,
} from "../controller/overtimeRequestController.mjs";

import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";

const overtimeRequestRoutes = express.Router();

/*
|--------------------------------------------------------------------------
| EMPLOYEE ROUTES
|--------------------------------------------------------------------------
*/

// Create overtime request
// POST /api/overtime-requests
overtimeRequestRoutes.post(
  "/",
  authMiddleware,
  createOvertimeRequest
);

// Get my overtime requests
// GET /api/overtime-requests/my
overtimeRequestRoutes.get(
  "/my",
  authMiddleware,
  getMyOvertimeRequests
);

// Cancel pending overtime request
// PATCH /api/overtime-requests/:requestId/cancel
overtimeRequestRoutes.patch(
  "/:requestId/cancel",
  authMiddleware,
  cancelOvertimeRequest
);

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

// Get all overtime requests
// GET /api/overtime-requests
overtimeRequestRoutes.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getAllOvertimeRequests
);

// Approve overtime request
// PATCH /api/overtime-requests/:requestId/approve
overtimeRequestRoutes.patch(
  "/:requestId/approve",
  authMiddleware,
  roleMiddleware("admin"),
  approveOvertimeRequest
);

// Reject overtime request
// PATCH /api/overtime-requests/:requestId/reject
overtimeRequestRoutes.patch(
  "/:requestId/reject",
  authMiddleware,
  roleMiddleware("admin"),
  rejectOvertimeRequest
);

export default overtimeRequestRoutes;
