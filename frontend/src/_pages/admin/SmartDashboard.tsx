import { useEffect } from 'react';
import { Navigate, useNavigate } from '../../compat/router';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import AdminDashboard from '../../views/admin/AdminDashboard';
import DeanCoordinatorDashboard from '../../views/admin/DeanCoordinatorDashboard';

/**
 * Smart Dashboard that automatically shows the appropriate dashboard
 * based on the user's role:
 * - Dean/Coordinator: Redirect to dedicated view-only dashboard
 * - Admin/Handler or no role: Full admin dashboard
 */
export default function SmartDashboard() {
  const { role, isDeanOrCoordinator, loading } = useRepresentativeRole();
  const navigate = useNavigate();

  // Redirect Dean/Coordinator to their dedicated dashboard
  useEffect(() => {
    if (!loading && isDeanOrCoordinator) {
      console.log('🔀 SmartDashboard: Redirecting Dean/Coordinator to dedicated dashboard');
      navigate('/admin/dean-coordinator', { replace: true });
    }
  }, [isDeanOrCoordinator, loading, navigate]);

  // Show loading state while checking role
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If Dean/Coordinator, show nothing (will redirect)
  if (isDeanOrCoordinator) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Otherwise show full admin dashboard
  return <AdminDashboard />;
}
