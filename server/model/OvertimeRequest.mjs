import mongoose from "mongoose";

const overtimeRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    adminComment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// One overtime request per employee per date
overtimeRequestSchema.index(
  {
    employeeId: 1,
    date: 1,
  }
);

const OvertimeRequest = mongoose.model(
  "OvertimeRequest",
  overtimeRequestSchema
);

export default OvertimeRequest;
