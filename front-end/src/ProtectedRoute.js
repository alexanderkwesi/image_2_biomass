// components/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";

/**
 * ProtectedRoute Component
 *
 * This component protects routes that require authentication.
 * It checks if the user is authenticated and either:
 * - Renders the protected component if authenticated
 * - Redirects to login if not authenticated
 * - Shows loading state while checking authentication
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to protect
 * @param {boolean} [props.requiresAuth=true] - Whether authentication is required
 * @param {string[]} [props.allowedRoles] - Array of allowed roles (optional)
 * @param {string} [props.redirectPath] - Custom redirect path (defaults to login)
 */
const ProtectedRoute = ({
  children,
  requiresAuth = true,
  allowedRoles = [],
  redirectPath = "/login",
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userRole, setUserRole] = React.useState(null);

  // Simulate authentication check (replace with your actual auth logic)
  React.useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      try {
        // Replace with your actual authentication check
        // Example: Check localStorage, validate token with API, etc.
        const token = localStorage.getItem("authToken");
        const userData = localStorage.getItem("userData");

        if (token && userData) {
          // Optional: Validate token with backend API
          // const response = await fetch('/api/validate-token', { headers: { Authorization: `Bearer ${token}` } });
          // if (response.ok) {

          const parsedUserData = JSON.parse(userData);
          setIsAuthenticated(true);
          setUserRole(parsedUserData.role || "user");
          // }
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Optional: Set up event listener for auth changes
    const handleStorageChange = (e) => {
      if (e.key === "authToken" || e.key === "userData") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If route doesn't require authentication, render children
  if (!requiresAuth) {
    return <>{children}</>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate to={redirectPath} state={{ from: location.pathname }} replace />
    );
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles.length > 0 && userRole) {
    const hasAccess = allowedRoles.includes(userRole);

    if (!hasAccess) {
      // Redirect to unauthorized page or home
      return (
        <Navigate
          to="/unauthorized"
          state={{ from: location.pathname }}
          replace
        />
      );
    }
  }

  // User is authenticated (and has correct role if required), render children
  return <>{children}</>;
};

export default ProtectedRoute;
