import bcrypt from 'bcryptjs';

import User from '../model/User.mjs'
import Employee from '../model/Employee.mjs'


const generateEmployeeId = async () => {
    const lastEmployee = await Employee.findOne().sort({ createdAt: -1 }).select("employeeId");

    if (!lastEmployee) {
        return 'CMATRIX#001';
    }

    const lastNumber = parseInt(lastEmployee.employeeId.replace('CMATRIX#', ''), 10);
    const newNumber = lastNumber + 1;
    return `CMATRIX#${newNumber.toString().padStart(3, '0')}`;
}
const  generateTemporaryPassword = async () => {
    const characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$*"
    const password=""
    for(let i=0;i<8;i++)
    {
        const randomIndex=Math.floor(Math.random()*characters.length);
        password+=characters[randomIndex];

    }
    return password;

}



export const createEmployee = async (req, res) => {

    try {

        const {
            email,
            name,
            phone,
            department,
            designation,
            joiningDate,
            attendanceMethod,
        } = req.body;
        if (!email || !name) {
            return res.status(401).json({ success: false, message: "Email and Name is required" })
        }
        const existingUser = await User.findOne({ email: email.toLowerCase() })
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists" })

        }

        const employeeId=await generateEmployeeId();
        const temppassword= await generateTemporaryPassword();

        const hashedpassword = await bcrypt.hash(temppassword, 10)

        const user = await User.Create({
            email: email.toLowerCase(),
            password: hashedpassword,
            role: "employee",
            mustChangePassword: true,
            isActive: true,

        });

        const employee = await Employee.create({
            employeeId: await employeeId,
            userId: user._id,
            name,
            phone,
            department,
            designation,
            joiningDate,
            attendanceMethod: attendanceMethod || "OFFICE",
            employmentStatus: "ACTIVE",
        })
          return res.status(201).json({
      success: true,
      message: "Employee created successfully",

      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: user.email,
        department: employee.department,
        designation: employee.designation,
        attendanceMethod: employee.attendanceMethod,
      },

      credentials: {
        employeeId,
        temppassword,
      },
    });
    }
    catch (error) {

        console.error("Create Employee Error:", error.message);
        return res.status(500).json({ success: false, message: "Server Error" })

    }

}

// GET ALL EMPLOYEES
export const getAllEmployees = async (req, res) => {
  try {

    const employees = await Employee.find()
      .populate("userId", "email isActive")
      .sort({ createdAt: -1 });


    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });

  } catch (error) {
    console.error("Get Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET SINGLE EMPLOYEE
export const getEmployeeById = async (req, res) => {
  try {

    const employee = await Employee.findById(
      req.params.id
    ).populate(
      "userId",
      "email role isActive mustChangePassword"
    );


    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }


    return res.status(200).json({
      success: true,
      employee,
    });

  } catch (error) {
    console.error("Get Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// UPDATE EMPLOYEE
export const updateEmployee = async (req, res) => {
  try {

    const {
      name,
      phone,
      department,
      designation,
      joiningDate,
      attendanceMethod,
    } = req.body;


    const employee = await Employee.findById(
      req.params.id
    );


    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }


    employee.name =
      name ?? employee.name;

    employee.phone =
      phone ?? employee.phone;

    employee.department =
      department ?? employee.department;

    employee.designation =
      designation ?? employee.designation;

    employee.joiningDate =
      joiningDate ?? employee.joiningDate;

    employee.attendanceMethod =
      attendanceMethod ?? employee.attendanceMethod;


    await employee.save();


    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });

  } catch (error) {
    console.error("Update Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// DEACTIVATE EMPLOYEE
export const deactivateEmployee = async (req, res) => {
  try {

    const employee = await Employee.findById(
      req.params.id
    );


    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }


    employee.employmentStatus = "INACTIVE";

    await employee.save();


    await User.findByIdAndUpdate(
      employee.userId,
      {
        isActive: false,
      }
    );


    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
    });

  } catch (error) {
    console.error(
      "Deactivate Employee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};