import { useAuth } from '../contexts/AuthContext';
import { UserRole, ROLE_PERMISSIONS, Permission } from '../types/users';

export const usePermissions = () => {
  const { currentUser } = useAuth();
  
  // Get current role from user profile (stored after profile completion)
  const getCurrentRole = (): UserRole => {
    // First check if user has completed profile
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      return profile.userRole as UserRole;
    }
    
    // Fallback to selectedRole (for demo purposes only)
    const storedRole = localStorage.getItem('selectedRole') as UserRole;
    if (storedRole && Object.values(UserRole).includes(storedRole)) {
      return storedRole;
    }
    
    // Default to complainant if no role is set
    return UserRole.COMPLAINANT;
  };

  const userRole = getCurrentRole();
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];

  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const canAccessRoute = (routePermissions: Permission[]): boolean => {
    if (routePermissions.length === 0) return true;
    return hasAnyPermission(routePermissions);
  };

  // Check if user has completed profile setup
  const hasCompletedProfile = (): boolean => {
    const userProfile = localStorage.getItem('userProfile');
    return !!userProfile;
  };

  return {
    userRole,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    getCurrentRole,
    hasCompletedProfile
  };
};

export default usePermissions;
