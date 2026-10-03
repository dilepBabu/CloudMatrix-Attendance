import express from "express";


import { authMiddleware } from "../middleware/authMiddleware.mjs";
import roleMiddleware from "../middleware/roleMiddleware.mjs";
import { activateHoliday, createHoliday, deactivateHoliday, getAllHolidays, updateHoliday } from "../controller/holidayController.mjs";

const holidayRouter = express.Router();

holidayRouter.use(authMiddleware);

// Get holidays
// Both admin and employee can view
holidayRouter.get(
    "/",
    getAllHolidays
);

// Admin only
holidayRouter.post(
    "/",
    roleMiddleware("admin"),
    createHoliday
);

holidayRouter.put(
    "/:id",
    roleMiddleware("admin"),
    updateHoliday
);

holidayRouter.patch(
    "/:id/deactivate",
    roleMiddleware("admin"),
    deactivateHoliday
);

holidayRouter.patch(
  "/:id/activate",
  roleMiddleware("admin"),
  activateHoliday
);
export default holidayRouter;