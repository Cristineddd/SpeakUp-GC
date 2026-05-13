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
      console.log('🔍 useRepresentativeRole: No current user');
      setRole(null);
      setRepresentativeData(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        setLoading(true);
        console.log('🔍 useRepresentativeRole: Fetching role for user:', currentUser.uid);
        
        // Check if user is a representative by their userId
        const representative = await RepresentativeService.getByUserId(currentUser.uid);
        
        console.log('🔍 useRepresentativeRole: Representative found:', representative);
        
        if (representative && representative.isActive) {
          console.log('✅ useRepresentativeRole: Active representative with role:', representative.role);
          setRole(representative.role);
          setRepresentativeData(representative);
        } else {
          console.log('❌ useRepresentativeRole: No active representative found');
          setRole(null);
          setRepresentativeData(null);
        }
      } catch (error) {
        console.error('❌ useRepresentativeRole: Error fetching representative role:', error);
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
  };
}
