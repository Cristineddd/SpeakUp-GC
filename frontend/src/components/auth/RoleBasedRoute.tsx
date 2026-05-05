import React from "react";
import { Navigate, Outlet } from "../../compat/router";
import { useAuth } from "../../contexts/AuthContext";

interface RoleBasedRouteProps {
  children?: React.ReactNode;
  allowedRoles: ('admin' | 'user')[];
  redirectTo?: string;
}

const RoleBasedRoute = ({
  children,
  allowedRoles,
  redirectTo = "/login",
}: RoleBasedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Get user role from isAdmin property
  const userRole = user?.isAdmin ? 'admin' : 'user';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    // If user's role is not in the allowed roles, redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleBasedRoute;
