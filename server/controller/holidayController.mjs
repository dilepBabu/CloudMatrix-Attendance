import mongoose from "mongoose";

import Holiday from "../model/Holiday.mjs";

import {
  parseCompanyDate,
  getCompanyMonthRange,
} from "../utils/dateUtils.mjs";

// Create Holiday
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

    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday date. Use YYYY-MM-DD",
      });
    }
   

    // Check duplicate date
    const existingHoliday = await Holiday.findOne({
      date: parsedDate.start,
    });

    if (existingHoliday) {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists for this date",
      });
    }

    // Create holiday
    const holiday = await Holiday.create({
      name: name.trim(),
      date: parsedDate.start,
      description: description?.trim() || "",
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
      message: "Server error",
    });
  }
};

// Get All Holidays
export const getAllHolidays = async (req, res) => {
  try {
    const { year } = req.query;

    const filter = {
      isActive: true,
    };

    // Optional year filter
    if (year) {
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
      message: "Server error",
    });
  }
};

// Update Holiday
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

    // Validate name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Holiday name cannot be empty",
        });
      }

      holiday.name = name.trim();
    }

    // Validate date if provided
    if (date !== undefined) {
      const parsedDate = parseCompanyDate(date);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid holiday date. Use YYYY-MM-DD",
        });
      }

      // Check duplicate date
      const existingHoliday = await Holiday.findOne({
        date: parsedDate.start,
        _id: { $ne: holiday._id },
      });

      if (existingHoliday) {
        return res.status(409).json({
          success: false,
          message: "A holiday already exists for this date",
        });
      }

      holiday.date = parsedDate.start;
    }

    // Update description
    if (description !== undefined) {
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

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists for this date",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Deactivate Holiday
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
      message: "Server error",
    });
  }
};

// Activate Holiday
export const activateHoliday = async (req, res) => {
  try {
    const { id } = req.params;

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
      message: "Server error",
    });
  }
};