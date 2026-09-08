import express from "express";

import { checkIn, checkOut, getMyAttendance } from "../controller/attendanceController.mjs";

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
export default attendanceRouter;