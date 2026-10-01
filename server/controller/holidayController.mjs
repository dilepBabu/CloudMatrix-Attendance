
import mongoose from "mongoose";

import Holiday from "../model/Holiday.mjs";

import {
  parseCompanyDate,
  getCompanyMonthRange,
} from "../utils/dateUtils.mjs";

// --------------------------------------------------
// CREATE HOLIDAY
// Admin only
// --------------------------------------------------

export const createHoliday = async (req, res) => {
  try {
    const { name, date, description } = req.body;

    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Holiday name is required",
      });
    }

    // Validate date
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Holiday date is required",
      });
    }

    // Parse date using company timezone
    const parsedDate = parseCompanyDate(date);

    if (!parsedDate || !parsedDate.start) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday date. Use YYYY-MM-DD",
      });
    }

    const holidayDate = parsedDate.start;

    // Check duplicate date
    const existingHoliday = await Holiday.findOne({
      date: holidayDate,
    });

    if (existingHoliday) {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists for this date",
        holiday: existingHoliday,
      });
    }

    // Create holiday
    const holiday = await Holiday.create({
      name: name.trim(),
      date: holidayDate,
      description: description?.trim() || "",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      holiday,
    });
  } catch (error) {
    console.error("Create Holiday Error:", error);

    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists for this date",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create holiday",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// GET ALL HOLIDAYS
//
// Employee:
// GET /api/holidays
// → Active holidays only
//
// Admin:
// GET /api/holidays
// → Active holidays only
//
// Admin:
// GET /api/holidays?includeInactive=true
// → Active + inactive holidays
// --------------------------------------------------

export const getAllHolidays = async (req, res) => {
  try {
    const { year, includeInactive } = req.query;

    const isAdmin = req.user?.role === "admin";

    // By default, only active holidays are returned.
    const filter = {};

    if (!(isAdmin && includeInactive === "true")) {
      filter.isActive = true;
    }

    // Optional year filter
    if (year !== undefined) {
      const selectedYear = Number(year);

      if (
        !Number.isInteger(selectedYear) ||
        selectedYear < 2000 ||
        selectedYear > 2100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid year",
        });
      }

      const yearStart = getCompanyMonthRange(
        selectedYear,
        1
      ).start;

      const yearEnd = getCompanyMonthRange(
        selectedYear,
        12
      ).end;

      filter.date = {
        $gte: yearStart,
        $lte: yearEnd,
      };
    }

    const holidays = await Holiday.find(filter).sort({
      date: 1,
    });

    return res.status(200).json({
      success: true,
      count: holidays.length,
      holidays,
    });
  } catch (error) {
    console.error("Get Holidays Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch holidays",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// UPDATE HOLIDAY
// Admin only
// --------------------------------------------------

export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, description } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findById(id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    // ----------------------------------------------
    // Validate name
    // ----------------------------------------------

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Holiday name cannot be empty",
        });
      }

      holiday.name = name.trim();
    }

    // ----------------------------------------------
    // Validate date
    // ----------------------------------------------

    if (date !== undefined) {
      const parsedDate = parseCompanyDate(date);

      if (!parsedDate || !parsedDate.start) {
        return res.status(400).json({
          success: false,
          message: "Invalid holiday date. Use YYYY-MM-DD",
        });
      }

      const holidayDate = parsedDate.start;

      // Check duplicate date excluding current holiday
      const existingHoliday = await Holiday.findOne({
        date: holidayDate,
        _id: {
          $ne: holiday._id,
        },
      });

      if (existingHoliday) {
        return res.status(409).json({
          success: false,
          message: "A holiday already exists for this date",
          holiday: existingHoliday,
        });
      }

      holiday.date = holidayDate;
    }

    // ----------------------------------------------
    // Update description
    // ----------------------------------------------

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          success: false,
          message: "Description must be a string",
        });
      }

      holiday.description = description.trim();
    }

    await holiday.save();

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      holiday,
    });
  } catch (error) {
    console.error("Update Holiday Error:", error);

    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists for this date",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update holiday",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// DEACTIVATE HOLIDAY
// Admin only
// --------------------------------------------------

export const deactivateHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findById(id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    if (!holiday.isActive) {
      return res.status(400).json({
        success: false,
        message: "Holiday is already inactive",
      });
    }

    holiday.isActive = false;

    await holiday.save();

    return res.status(200).json({
      success: true,
      message: "Holiday deactivated successfully",
      holiday,
    });
  } catch (error) {
    console.error("Deactivate Holiday Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate holiday",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// ACTIVATE HOLIDAY
// Admin only
// --------------------------------------------------

export const activateHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findById(id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    if (holiday.isActive) {
      return res.status(400).json({
        success: false,
        message: "Holiday is already active",
      });
    }

    holiday.isActive = true;

    await holiday.save();

    return res.status(200).json({
      success: true,
      message: "Holiday activated successfully",
      holiday,
    });
  } catch (error) {
    console.error("Activate Holiday Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to activate holiday",
      error: error.message,
    });
  }
};
