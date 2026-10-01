import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({
  children,
  allowedRole,
  requirePasswordChange = false,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  // User is not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  /*
   * This route is specifically for changing the temporary password.
   *
   * Only users who actually need to change their password
   * are allowed to open this page.
   */
  if (requirePasswordChange) {
    if (!user.mustChangePassword) {
      if (user.role === "admin") {
        return <Navigate to="/admin/dashboard" replace />;
      }

      if (user.role === "employee") {
        return <Navigate to="/employee/dashboard" replace />;
      }

      return <Navigate to="/" replace />;
    }

    return children;
  }

  /*
   * If the user must change their password,
   * they cannot access normal protected pages.
   */
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  /*
   * Check role
   */
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user.role === "employee") {
      return <Navigate to="/employee/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;