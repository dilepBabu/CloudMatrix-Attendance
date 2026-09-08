import CompanySettings from "../model/CompanySettings.mjs";


// Get company settings
export const getSettings = async (req, res) => {
  try {
    const settings = await CompanySettings.findOne();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Company settings not configured",
      });
    }

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get Settings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// Create or update office settings
export const updateOfficeSettings = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius,
      address,
      officeAttendanceEnabled,
    } = req.body;

    // Validate latitude
    if (
      latitude === undefined ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude is required",
      });
    }

    // Validate longitude
    if (
      longitude === undefined ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid longitude is required",
      });
    }

    // Validate radius
    if (
      radius === undefined ||
      radius <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Radius must be greater than 0",
      });
    }

    let settings = await CompanySettings.findOne();

    if (!settings) {
      settings = new CompanySettings({
        officeLocation: {
          latitude,
          longitude,
          radius,
          address: address?.trim() || "",
        },

        officeAttendanceEnabled:
          officeAttendanceEnabled ?? true,
      });
    } else {
      settings.officeLocation.latitude = latitude;
      settings.officeLocation.longitude = longitude;
      settings.officeLocation.radius = radius;

      if (address !== undefined) {
        settings.officeLocation.address = address.trim();
      }

      if (officeAttendanceEnabled !== undefined) {
        settings.officeAttendanceEnabled =
          officeAttendanceEnabled;
      }
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Office settings updated successfully",
      settings,
    });

  } catch (error) {
    console.error("Update Office Settings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};