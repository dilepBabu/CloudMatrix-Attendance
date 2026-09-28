import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    date: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

holidaySchema.index(
  { date: 1 },
  {
    unique: true,
  }
);

const Holiday = mongoose.model("Holiday", holidaySchema);

export default Holiday;