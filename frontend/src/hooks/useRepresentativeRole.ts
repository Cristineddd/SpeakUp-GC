import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RepresentativeService } from '../services/representativeService';
import { RepresentativeRole } from '../types/representative';

/**
 * Hook to get the current user's representative role
 * Returns the role if the user is a representative (admin, handler)
 * Returns null if not a representative
 */
export function useRepresentativeRole() {
  const { currentUser } = useAuth();
  const [role, setRole] = useState<RepresentativeRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [representativeData, setRepresentativeData] = useState<any>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setRole(null);
      setRepresentativeData(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        setLoading(true);
        
        // Check if user is a representative by their userId
        const representative = await RepresentativeService.getByUserId(currentUser.uid);
        
        if (representative && representative.isActive) {
          setRole(representative.role);
          setRepresentativeData(representative);
        } else {
          setRole(null);
          setRepresentativeData(null);
        }
      } catch (error) {
        console.error('Error fetching representative role:', error);
        setRole(null);
        setRepresentativeData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [currentUser?.uid]);

  return {
    role,
    representativeData,
    loading,
    isHandler: role === 'handler',
    isAdmin: role === 'admin',
    isDeanOrCoordinator: false, // Dean/Coordinator roles not implemented yet
  };
}
