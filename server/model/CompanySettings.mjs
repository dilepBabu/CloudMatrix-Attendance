import mongoose from "mongoose";

const companySettingsSchema = new mongoose.Schema(
  {
    officeLocation: {
      latitude: {
        type: Number,
        required: true,
      },

      longitude: {
        type: Number,
        required: true,
      },

      radius: {
        type: Number,
        required: true,
        default: 100,
      },

      address: {
        type: String,
        trim: true,
      },
    },

    officeAttendanceEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CompanySettings = mongoose.model(
  "CompanySettings",
  companySettingsSchema
);

export default CompanySettings;