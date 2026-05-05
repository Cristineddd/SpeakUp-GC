import React, { useEffect } from 'react';
import { Navigate, useNavigate } from '../../compat/router';
import { useAdminAuth } from '../../middleware/adminAuth';
import { auth } from '../../firebase';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up token refresh
    const handle = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await user.getIdToken(true);
        } catch (error) {
          console.error('Token refresh failed:', error);
          navigate('/admin/login', { replace: true });
        }
      }
    }, 10 * 60 * 1000); // Refresh token every 10 minutes

    return () => clearInterval(handle);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
