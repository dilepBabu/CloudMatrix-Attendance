import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "employee"],
        default: "employee",
    },

    mustChangePassword: {
        type: Boolean,
        default: true,
    },

    isActive: {
        type: Boolean,
        default: true,
    },
},
    { timestamps: true, }
)
const User = mongoose.model("User", userSchema);

export default User;