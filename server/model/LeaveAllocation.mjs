import mongoose from "mongoose";

const leaveAllocationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    casualLeaveLimit: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

leaveAllocationSchema.index(
  {
    employeeId: 1,
    year: 1,
    month: 1,
  },
  {
    unique: true,
  }
);

const LeaveAllocation = mongoose.model(
  "LeaveAllocation",
  leaveAllocationSchema
);

export default LeaveAllocation;