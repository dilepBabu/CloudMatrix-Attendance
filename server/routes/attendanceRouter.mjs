import express from "express";

import { adminUpdateCheckout, checkIn, checkOut, getAllAttendance, getEmployeeAttendanceSummary, getMyAttendance, getMyAttendanceSummary } from "../controller/attendanceController.mjs";

import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";

const attendanceRouter = express.Router();

attendanceRouter.use(authMiddleware);

attendanceRouter.post(
  "/check-in",
  roleMiddleware("employee"),
  checkIn
);

attendanceRouter.post(
  "/check-out",
  roleMiddleware("employee"),
  checkOut
);

attendanceRouter.get(
  "/my",
  roleMiddleware("employee"),
  getMyAttendance
);

attendanceRouter.get(
  "/",
  roleMiddleware("admin"),
  getAllAttendance
);


attendanceRouter.patch(
  "/:id/checkout",
  roleMiddleware("admin"),
  adminUpdateCheckout
);


attendanceRouter.get(
  "/my/summary",
  roleMiddleware("employee"),
  getMyAttendanceSummary
);
attendanceRouter.get(
  "/employee/:employeeId/summary",
  roleMiddleware("admin"),
  getEmployeeAttendanceSummary
);
export default attendanceRouter;