import express from "express";

import {
  createRemoteRequest,
  getMyRemoteRequests,
  cancelRemoteRequest,
  getAllRemoteRequests,
  approveRemoteRequest,
  rejectRemoteRequest,
} from "../controller/remoteRequestController.mjs";

import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";

const remoteRequestRoutes = express.Router();

/*
|--------------------------------------------------------------------------
| EMPLOYEE ROUTES
|--------------------------------------------------------------------------
*/

// Create WFH / Remote request
// POST /api/remote-requests
remoteRequestRoutes.post(
  "/",
  authMiddleware,
  createRemoteRequest
);

// Get logged-in employee's requests
// GET /api/remote-requests/my
remoteRequestRoutes.get(
  "/my",
  authMiddleware,
  getMyRemoteRequests
);

// Cancel own pending request
// PATCH /api/remote-requests/:requestId/cancel
remoteRequestRoutes.patch(
  "/:requestId/cancel",
  authMiddleware,
  cancelRemoteRequest
);


/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

// Get all remote requests
// GET /api/remote-requests
remoteRequestRoutes.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getAllRemoteRequests
);

// Approve remote request
// PATCH /api/remote-requests/:requestId/approve
remoteRequestRoutes.patch(
  "/:requestId/approve",
  authMiddleware,
  roleMiddleware("admin"),
  approveRemoteRequest
);

// Reject remote request
// PATCH /api/remote-requests/:requestId/reject
remoteRequestRoutes.patch(
  "/:requestId/reject",
  authMiddleware,
  roleMiddleware("admin"),
  rejectRemoteRequest
);

export default remoteRequestRoutes;