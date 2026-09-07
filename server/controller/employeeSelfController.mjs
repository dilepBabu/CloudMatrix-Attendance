import Employee from '../model/Employee.mjs'

export const getMyProfile = async (req, res) => {
    try {

        const employee = await Employee.findOne({ userId: req.user._id,})
            .populate('userId', 'email role mustChangePassword isActive')
        if (!employee) {
            return res.status(404).json({ status: false, message: "Employee profile is not found" });
        }


        return res.status(200).json({
            success: true,
            employee,
        });
    }
    catch (error) {
        console.error(
            "Get My Profile Error:",
            error
        );

        return res.status(500).json({ success: false, message: "Server Error" })

    }
}