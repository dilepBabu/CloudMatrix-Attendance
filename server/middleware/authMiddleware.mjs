import User from '../model/User.mjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token
        if (!token) {
            return res.status(401).json({ success: false, message: "Not Authorized" })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is inactive",
            });
        }

        req.user = user;

        next();

    }
    catch (error) {
         console.error("Auth Middleware Error:", error.message);
        return res.status(401).json({success:false,message:'Invalid or expired token'})

    }
}

