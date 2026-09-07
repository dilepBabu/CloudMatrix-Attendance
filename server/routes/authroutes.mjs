import express from 'express';
import {registerAdmin,login,getMe,logout,changePassword}from '../controller/authController.mjs';
import {authMiddleware} from '../middleware/authMiddleware.mjs';

export const authRoutes=express.Router();

authRoutes.post('/login',login);

authRoutes.get("/me", authMiddleware, getMe);

authRoutes.put("/change-password", authMiddleware, changePassword);

authRoutes.post("/logout", authMiddleware, logout);