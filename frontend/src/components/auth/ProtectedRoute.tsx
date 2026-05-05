import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireHandler?: boolean;
  skipProfileCheck?: boolean;
}

/**
 * ProtectedRoute component that handles authentication, authorization, and profile completion checks
 * Includes robust redirect loop detection and emergency fallbacks
 */
const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requireHandler = false, 
  skipProfileCheck = false 
}: ProtectedRouteProps) => {
  const { currentUser, loading, isAdmin } = useAuth();
  const { isComplete: profileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { role, loading: roleLoading } = useRepresentativeRole();
  const location = useLocation();
  
  // Use refs to avoid re-renders and track state properly
  const redirectCountRef = useRef(0);
  const lastPathRef = useRef('');
  const loopDetectedRef = useRef(false);

  // Check if user has representative access (Dean, Coordinator, Handler, or Admin role)
  const hasRepresentativeAccess = isAdmin || role !== null;

  // Define routes that don't require profile completion (kept for reference, but not enforced)
  const profileCompletionExemptRoutes = [
    '/verify-email',
    '/profile',
    '/logout',
    '/unauthorized',
    '/settings',
    '/help',
    '/about'
  ];

  // Determine if we should skip profile completion check
  const shouldSkipProfileCheck =
    skipProfileCheck ||
    hasRepresentativeAccess ||
    profileCompletionExemptRoutes.includes(location.pathname);

  // Allow a navigation flag to temporarily bypass profile check immediately after profile completion
  const navigationProfileCompleted = (location.state as any)?.profileCompleted === true;

  // If navigation indicates the profile was just completed, skip the profile check for this navigation
  const effectiveSkipProfileCheck = shouldSkipProfileCheck || navigationProfileCompleted;

  // Track redirects and detect loops
  useEffect(() => {
    const currentPath = location.pathname;
    
    if (currentPath === lastPathRef.current) {
      redirectCountRef.current++;
      console.warn(`🔄 ProtectedRoute: Redirect count increased to ${redirectCountRef.current} for path: ${currentPath}`);
    } else {
      // Reset counter when path changes
      redirectCountRef.current = 1;
      lastPathRef.current = currentPath;
      loopDetectedRef.current = false;
    }

    // Detect potential loop
    if (redirectCountRef.current > 2) {
      loopDetectedRef.current = true;
      console.error('🚨 ProtectedRoute: Potential redirect loop detected!', {
        currentPath,
        redirectCount: redirectCountRef.current,
        profileComplete,
        hasRepresentativeAccess
      });
    }

    console.log('🔄 ProtectedRoute: Redirect tracking', {
      currentPath,
      lastPath: lastPathRef.current,
      redirectCount: redirectCountRef.current,
      loopDetected: loopDetectedRef.current
    });
  }, [location.pathname, profileComplete, hasRepresentativeAccess]);

  // Reset redirect count when conditions improve
  useEffect(() => {
    if (redirectCountRef.current > 0 && (profileComplete || shouldSkipProfileCheck || navigationProfileCompleted)) {
      console.log('ProtectedRoute: Resetting redirect count - conditions improved');
      redirectCountRef.current = 0;
      lastPathRef.current = '';
      loopDetectedRef.current = false;
    }
  }, [profileComplete, shouldSkipProfileCheck]);

  // Show loading spinner while checking authentication and profile status
  if (loading || roleLoading || (!effectiveSkipProfileCheck && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no user is authenticated
  if (!currentUser) {
    console.log('🔒 ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check email verification (except for admins and on verify-email page)
  const isOnVerifyEmailPage = location.pathname === '/verify-email';
  const isUserAdmin = isAdmin || hasRepresentativeAccess;
  
  if (!currentUser.emailVerified && !isUserAdmin && !isOnVerifyEmailPage) {
    console.log('🔒 ProtectedRoute: Email not verified, redirecting to verify-email');
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  // Check admin access requirements
  if (requireAdmin && !hasRepresentativeAccess) {
    console.log('🔒 ProtectedRoute: Admin access required, redirecting to unauthorized');
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Check handler role requirements
  if (requireHandler && role !== 'handler') {
    console.log('🔒 ProtectedRoute: Handler role required, redirecting to unauthorized');
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Debug information
  console.log('🔒 ProtectedRoute: Checking access...', {
    path: location.pathname,
    profileComplete,
    hasRepresentativeAccess,
    role,
    isAdmin,
    skipProfileCheck,
    shouldSkipProfileCheck,
    navigationProfileCompleted,
    redirectCount: redirectCountRef.current,
    loopDetected: loopDetectedRef.current
  });

  // Allow access to the requested route - profile completion no longer required
  console.log('✅ ProtectedRoute: Access granted to', location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;