import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    checkIn: {
      time: {
        type: Date,
      },

      location: {
        latitude: {
          type: Number,
        },
        longitude: {
          type: Number,
        },
        accuracy: {
          type: Number,
        },
      },

      method: {
        type: String,
        enum: ["OFFICE", "REMOTE", "FIELD"],
      },
    },

    checkOut: {
      time: {
        type: Date,
      },

      location: {
        latitude: {
          type: Number,
        },
        longitude: {
          type: Number,
        },
        accuracy: {
          type: Number,
        },
      },

      method: {
        type: String,
        enum: ["OFFICE", "REMOTE", "FIELD"],
      },
    },

    status: {
      type: String,
      enum: [
        "PRESENT",
        "ABSENT",
        "HALF_DAY",
        "ON_LEAVE",
        "HOLIDAY",
        "MISSED_CHECKOUT",
      ],
      default: "PRESENT",
    },

    workingMinutes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per employee per day
attendanceSchema.index(
  {
    employeeId: 1,
    date: 1,
  },
  {
    unique: true,
  }
); 

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;