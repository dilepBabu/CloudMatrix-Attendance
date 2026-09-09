import express from "express";

import { createWorkReport, getAllWorkReports, getMyWorkReport, updateMyWorkReport } from "../controller/workReportController.mjs";

import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";

const workReportRouter = express.Router();

workReportRouter.use(authMiddleware);

workReportRouter.post(
  "/",
  roleMiddleware("employee"),
  createWorkReport
);


workReportRouter.get(
  "/my",
  roleMiddleware("employee"),
  getMyWorkReport
);

workReportRouter.put(
  "/my",
  roleMiddleware("employee"),
  updateMyWorkReport
);

workReportRouter.get(
  "/",
  roleMiddleware("admin"),
  getAllWorkReports
);

export default workReportRouter;