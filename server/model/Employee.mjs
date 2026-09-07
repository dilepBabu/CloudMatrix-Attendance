import mongoose from 'mongoose';

const employeeSchema=new mongoose.Schema({
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    designation: {
      type: String,
      trim: true,
    },

    joiningDate: {
      type: Date,
    },

    attendanceMethod: {
      type: String,
      enum: ["OFFICE", "REMOTE", "FIELD", "HYBRID"],
      default: "OFFICE",
    },

    employmentStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
},{timestamps:true});

const Employee = mongoose.model("Employee",employeeSchema);

export default Employee;