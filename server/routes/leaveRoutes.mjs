import express from "express";

import {
  applyLeave,
  getMyLeaves,
  cancelMyLeave,
  getMyCasualLeaveBalance,
  getAllLeaves,
  reviewLeave,
  getEmployeeLeaveAllocation,
  setEmployeeLeaveAllocation,
} from "../controller/leaveController.mjs";

import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";

const leaveRouter = express.Router();

leaveRouter.use(authMiddleware);


// =====================================================
// EMPLOYEE ROUTES
// =====================================================

leaveRouter.post(
  "/",
  roleMiddleware("employee"),
  applyLeave
);

leaveRouter.get(
  "/my",
  roleMiddleware("employee"),
  getMyLeaves
);

leaveRouter.get(
  "/my/balance",
  roleMiddleware("employee"),
  getMyCasualLeaveBalance
);

leaveRouter.patch(
  "/:id/cancel",
  roleMiddleware("employee"),
  cancelMyLeave
);


// =====================================================
// ADMIN ROUTES
// =====================================================

leaveRouter.get(
  "/",
  roleMiddleware("admin"),
  getAllLeaves
);

leaveRouter.patch(
  "/:id/review",
  roleMiddleware("admin"),
  reviewLeave
);

leaveRouter.get(
  "/allocation/:employeeId",
  roleMiddleware("admin"),
  getEmployeeLeaveAllocation
);

leaveRouter.put(
  "/allocation/:employeeId",
  roleMiddleware("admin"),
  setEmployeeLeaveAllocation
);


export default leaveRouter;