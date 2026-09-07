import express from 'express';
import {createEmployee,getEmployeeById,getAllEmployees,updateEmployee,deactivateEmployee}from '../controller/employeeController.mjs';
import {authMiddleware} from '../middleware/authMiddleware.mjs'
import roleMiddleware from '../middleware/roleMiddleware.mjs'
const employeeRouter=express.Router();

employeeRouter.use(authMiddleware)
employeeRouter.use(roleMiddleware('admin'));

employeeRouter.get('/',getAllEmployees);
employeeRouter.get('/:id',getEmployeeById);
employeeRouter.post('/',createEmployee);
employeeRouter.put('/:id',updateEmployee);
employeeRouter.patch('/:id',deactivateEmployee);

export default employeeRouter;