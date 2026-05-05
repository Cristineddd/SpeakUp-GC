import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  isLoading: boolean;
  missingFields: string[];
}

export const useProfileCompletion = (): ProfileCompletionStatus => {
  const { user: authUser } = useAuth();
  const [status, setStatus] = useState<ProfileCompletionStatus>({
    isComplete: false,
    isLoading: true,
    missingFields: []
  });

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!authUser) {
        setStatus({
          isComplete: false,
          isLoading: false,
          missingFields: ['user not authenticated']
        });
        return;
      }

      try {
        setStatus(prev => ({ ...prev, isLoading: true }));

        const userDoc = await getDoc(doc(db, 'users', authUser.uid));

        if (!userDoc.exists()) {
          setStatus({
            isComplete: false,
            isLoading: false,
            missingFields: ['user document does not exist']
          });
          return;
        }

        const userData = userDoc.data();
        const missingFields: string[] = [];

        // CRITICAL FIX: Check for basic required fields that indicate profile completion
        const requiredFields = ['name', 'email', 'department', 'location'];
        
        requiredFields.forEach(field => {
          if (!userData[field] || userData[field].toString().trim() === '') {
            missingFields.push(field);
          }
        });

        // Check additional fields but don't block completion
        if (!userData.phone && !userData.contactNumber) {
          missingFields.push('phone');
        }

        if (!userData.userType && !userData.position) {
          missingFields.push('userType');
        }

        // CRITICAL FIX: Simplify completion logic
        // Profile is complete if user has basic required fields
        const hasBasicProfile = requiredFields.every(field => 
          userData[field] && userData[field].toString().trim() !== ''
        );

        // Check if profile was explicitly marked as completed
        const isExplicitlyComplete = userData.profileCompleted === true ||
                                   userData.isProfileComplete === true ||
                                   userData.hasCompletedProfile === true;

        console.log('🔍 useProfileCompletion: Checking profile completion');
        console.log('🔍 hasBasicProfile:', hasBasicProfile);
        console.log('🔍 isExplicitlyComplete:', isExplicitlyComplete);
        console.log('🔍 missingFields:', missingFields);
        console.log('🔍 userData:', {
          name: userData.name,
          email: userData.email,
          department: userData.department,
          location: userData.location,
          phone: userData.phone,
          userType: userData.userType,
          profileCompleted: userData.profileCompleted
        });

        // CRITICAL FIX: Profile is complete if either:
        // 1. Explicitly marked as complete OR
        // 2. Has all basic required fields
        const isComplete = isExplicitlyComplete || hasBasicProfile;

        console.log('✅ Final isComplete:', isComplete);

        setStatus({
          isComplete,
          isLoading: false,
          missingFields
        });

      } catch (error) {
        console.error('Error checking profile completion:', error);
        setStatus({
          isComplete: true, // Assume complete on error to prevent loops
          isLoading: false,
          missingFields: ['error checking profile']
        });
      }
    };

    checkProfileCompletion();
  }, [authUser]);

  return status;
};