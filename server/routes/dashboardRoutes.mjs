import express from "express";

import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";

import {
  getDashboardSummary,
  getMonthlyDashboardSummary,
} from "../controller/dashboardController.mjs";

const dashboardRouter = express.Router();

// Authentication
dashboardRouter.use(authMiddleware);

// Admin only
dashboardRouter.get(
  "/summary",
  roleMiddleware("admin"),
  getDashboardSummary
);

dashboardRouter.get(
  "/monthly",
  roleMiddleware("admin"),
  getMonthlyDashboardSummary
);

export default dashboardRouter;