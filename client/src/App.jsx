import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";

import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";

import MyAttendance from "./pages/employee/MyAttendance";
import WorkReport from "./pages/employee/WorkReport";
import MyProfile from "./pages/employee/MyProfile";
import Leave from "./pages/employee/Leave";
import AdminLeave from "./pages/admin/AdminLeave";
import RemoteRequest from "./pages/employee/RemoteRequest";
import AdminRemoteRequests from "./pages/admin/AdminRemoteRequests";
import Overtime from "./pages/employee/Overtime";
import AdminOvertime from "./pages/admin/AdminOvertime";
import AdminHolidays from "./pages/admin/AdminHolidays";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminEmployees from "./pages/admin/AdminEmployees";
import AdminAttendance from "./pages/admin/AdminAttendance";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Change Password */}
        <Route
  path="/change-password"
  element={
    <ProtectedRoute requirePasswordChange>
      <ChangePassword />
    </ProtectedRoute>
  }
/>

        {/* ================= ADMIN ================= */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="leave" element={<AdminLeave />} />
          <Route
  path="remote-requests"
  element={<AdminRemoteRequests />}
/>
<Route path="overtime" element={<AdminOvertime />} />
<Route path="holidays" element={<AdminHolidays />} />
<Route path="settings" element={<AdminSettings />} />
<Route path="employees" element={<AdminEmployees />} />
<Route
  path="attendance"
  element={<AdminAttendance />}
/>

        </Route>

        {/* ================= EMPLOYEE ================= */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<EmployeeDashboard />} />

          <Route path="attendance" element={<MyAttendance />} />

          <Route path="work-report" element={<WorkReport />} />

          <Route path="profile" element={<MyProfile />} />
          <Route path="leave" element={<Leave />} />
          <Route path="remote-request" element={<RemoteRequest />} />
          <Route path="overtime" element={<Overtime  />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
