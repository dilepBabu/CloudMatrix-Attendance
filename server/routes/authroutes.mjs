import express from 'express';
import {registerAdmin,login,getMe,logout}from '../controller/authController.mjs';
import {authMiddleware} from '../middleware/authMiddleware.mjs';

export const authRoutes=express.Router();

authRoutes.post('/register-admin',registerAdmin);
authRoutes.post('/login',login);

authRoutes.get("/me", authMiddleware, getMe);

authRoutes.post("/logout", authMiddleware, logout);