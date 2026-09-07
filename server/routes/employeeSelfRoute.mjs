import express from  'express'
import { authMiddleware } from '../middleware/authMiddleware.mjs';
import roleMiddleware from '../middleware/roleMiddleware.mjs';
import { getMyProfile } from '../controller/employeeSelfController.mjs';

const employeeselfrouter=express.Router();


employeeselfrouter.use(authMiddleware)
employeeselfrouter.use(roleMiddleware('employee'))

employeeselfrouter.get('/me',getMyProfile);

export default employeeselfrouter;