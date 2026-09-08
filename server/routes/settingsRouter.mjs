import express from "express";

import {
  getSettings,
  updateOfficeSettings,
} from "../controller/settingsController.mjs";

import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";

const settingsRouter = express.Router();

settingsRouter.use(authMiddleware);
settingsRouter.use(roleMiddleware("admin"));

settingsRouter.get("/", getSettings);

settingsRouter.put("/office", updateOfficeSettings);

export default settingsRouter;