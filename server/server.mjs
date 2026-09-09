import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.mjs";
import {authRoutes} from "./routes/authroutes.mjs";
import employeeRouter from './routes/employeeroutes.mjs';
import employeeselfrouter from "./routes/employeeSelfRoute.mjs";
import attendanceRouter from "./routes/attendanceRouter.mjs";
import settingsRouter from "./routes/settingsRouter.mjs";
import workReportRouter from "./routes/workReportRouter.mjs";

dotenv.config();

const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use('/api/employees',employeeRouter);
app.use('/api/employee/',employeeselfrouter);
app.use('/api/attendance',attendanceRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/work-reports", workReportRouter);
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Attendance Management API is running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});