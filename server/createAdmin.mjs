import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import readline from "readline";

import connectDB from "./config/db.mjs";
import User from "./model/User.mjs";
import Employee from "./model/Employee.mjs";

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (message) => {
    return new Promise((resolve) => {
        rl.question(message, resolve);
    });
};

const createAdmin = async () => {
    try {
        console.log("\n======================================");
        console.log("   ATTENDANCE SYSTEM - ADMIN SETUP");
        console.log("======================================\n");

        // Connect to MongoDB
        await connectDB();

        // Check whether an admin already exists
        const existingAdmin = await User.findOne({
            role: "admin",
        });

        if (existingAdmin) {
            console.log("❌ Admin account already exists.");
            console.log(`   Email: ${existingAdmin.email}`);
            console.log("\nAdmin creation cancelled.\n");

            rl.close();
            await mongoose.connection.close();
            process.exit(0);
        }

        // Get admin details
        const name = await question("Enter admin name: ");
        const email = await question("Enter admin email: ");
        const password = await question("Enter admin password: ");

        // Validate input
        if (!name.trim() || !email.trim() || !password.trim()) {
            console.log("\n❌ Name, email and password are required.");

            rl.close();
            await mongoose.connection.close();
            process.exit(1);
        }

        if (password.length < 8) {
            console.log("\n❌ Password must contain at least 8 characters.");

            rl.close();
            await mongoose.connection.close();
            process.exit(1);
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check whether email already exists
        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            console.log("\n❌ This email is already registered.");
            console.log(`   Email: ${normalizedEmail}`);

            rl.close();
            await mongoose.connection.close();
            process.exit(1);
        }

        // Start MongoDB transaction
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create admin User
            const [user] = await User.create(
                [
                    {
                        email: normalizedEmail,
                        password: hashedPassword,
                        role: "admin",
                        mustChangePassword: false,
                        isActive: true,
                    },
                ],
                { session }
            );

            // Create Employee profile for admin
            const [employee] = await Employee.create(
                [
                    {
                        employeeId: "ADMIN001",
                        userId: user._id,
                        name: name.trim(),
                        designation: "Administrator",
                        attendanceMethod: "OFFICE",
                        employmentStatus: "ACTIVE",
                    },
                ],
                { session }
            );

            await session.commitTransaction();

            console.log("\n======================================");
            console.log("       ✅ ADMIN CREATED SUCCESSFULLY");
            console.log("======================================\n");

            console.log("Admin Details");
            console.log("--------------------------------------");
            console.log(`Employee ID : ${employee.employeeId}`);
            console.log(`Name        : ${employee.name}`);
            console.log(`Email       : ${user.email}`);
            console.log(`Role        : ${user.role}`);
            console.log("--------------------------------------");

            console.log("\nYou can now log in to the application.\n");

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        rl.close();
        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Admin creation failed.");
        console.error("Error:", error.message);

        rl.close();

        try {
            await mongoose.connection.close();
        } catch { }

        process.exit(1);
    }
};

createAdmin();