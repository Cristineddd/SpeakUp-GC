import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  UserCredential,
  sendEmailVerification as firebaseSendEmailVerification, 
  reload, 
  createUserWithEmailAndPassword, 
  deleteUser, 
  updateProfile 
} from 'firebase/auth';
import { 
  auth, 
  onAuthStateChanged, 
  db, 
  signInWithEmailAndPassword, 
  signOut, 
  googleProvider, 
  signInWithPopup 
} from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  writeBatch, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { validatePassword } from '../utils/passwordValidation';
import { isAdminEmail } from '../utils/admin/adminConfig';

interface AuthUser extends User {
  isAdmin?: boolean;
  role?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, additionalData?: any) => Promise<UserCredential | void>;
  logout: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  reloadCurrentUser: () => Promise<AuthUser | null>;
  loginWithGoogle: () => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  isLoading: true,
  login: async () => { throw new Error('Not implemented'); },
  register: async () => { throw new Error('Not implemented'); },
  logout: async () => { throw new Error('Not implemented'); },
  sendEmailVerification: async () => { throw new Error('Not implemented'); },
  reloadCurrentUser: async () => { throw new Error('Not implemented'); },
  loginWithGoogle: async () => { throw new Error('Not implemented'); },
  signUpWithGoogle: async () => { throw new Error('Not implemented'); },
  deleteAccount: async () => { throw new Error('Not implemented'); }
});

export function useAuth() {
  return useContext(AuthContext);
}

// Helper function to delete user data from Firestore
const deleteUserData = async (userId: string, userEmail: string) => {
  try {
    console.log(`🗑️ Starting data cleanup for user: ${userId} (${userEmail})`);
    
    const batch = writeBatch(db);
    let deletedCount = 0;

    // Delete user document from 'users' collection
    const userDocRef = doc(db, 'users', userId);
    batch.delete(userDocRef);
    deletedCount++;

    // Delete from 'registeredUsers' collection
    if (userEmail) {
      const registeredUserRef = doc(db, 'registeredUsers', userEmail);
      batch.delete(registeredUserRef);
      deletedCount++;
    }

    // Find and delete user's reports from 'complaints' collection
    const complaintsQuery = query(
      collection(db, 'complaints'), 
      where('userId', '==', userId)
    );
    
    const complaintsSnapshot = await getDocs(complaintsQuery);
    complaintsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    // Also check and delete from 'adminReports' collection if it exists
    try {
      const adminReportsQuery = query(
        collection(db, 'adminReports'), 
        where('userId', '==', userId)
      );
      
      const adminReportsSnapshot = await getDocs(adminReportsQuery);
      adminReportsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });
    } catch (error) {
      console.log('ℹ️ adminReports collection not found or inaccessible, skipping...');
    }

    // Commit the batch delete
    await batch.commit();
    console.log(`✅ Successfully deleted ${deletedCount} documents for user: ${userId}`);
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Error deleting user data:', error);
    throw new Error(`Failed to delete user data: ${error.message}`);
  }
};

// Soft delete alternative (comment out the above and use this if you prefer archiving)
/*
const softDeleteUserData = async (userId: string, userEmail: string) => {
  try {
    console.log(`📁 Archiving data for user: ${userId} (${userEmail})`);
    
    const batch = writeBatch(db);
    const archiveDate = new Date().toISOString();

    // Mark user as archived
    const userDocRef = doc(db, 'users', userId);
    batch.update(userDocRef, {
      isArchived: true,
      archivedAt: archiveDate,
      archivedReason: 'account_deleted'
    });

    // Mark registered user as archived
    if (userEmail) {
      const registeredUserRef = doc(db, 'registeredUsers', userEmail);
      batch.update(registeredUserRef, {
        isArchived: true,
        archivedAt: archiveDate
      });
    }

    // Mark user's reports as archived
    const complaintsQuery = query(
      collection(db, 'complaints'), 
      where('userId', '==', userId)
    );
    
    const complaintsSnapshot = await getDocs(complaintsQuery);
    complaintsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isArchived: true,
        archivedAt: archiveDate,
        archivedBy: 'system',
        originalReporter: `deleted_user_${userId}`
      });
    });

    await batch.commit();
    console.log(`✅ Successfully archived data for user: ${userId}`);
    
  } catch (error) {
    console.error('❌ Error archiving user data:', error);
    throw new Error(`Failed to archive user data: ${error.message}`);
  }
};
*/

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (user) {
        console.log('🔍 Email verified status:', user.emailVerified);
        
        // Check email verification status
        if (!user.emailVerified) {
          // Check if user is admin (admins can bypass email verification)
          let isUserAdmin = false;
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();
            isUserAdmin = userData?.isAdmin || isAdminEmail(user.email);
          } catch (error) {
            isUserAdmin = isAdminEmail(user.email);
          }
          
          console.log('👤 Is admin:', isUserAdmin);
          
          // If not admin, require email verification
          if (!isUserAdmin) {
            await signOut(auth);
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
          }
        }
        
        // Check if user is registered (exists in registeredUsers collection)
        // This prevents unauthorized access from accounts created outside the registration flow
        let isRegisteredUser = false;
        try {
          const registeredUserDoc = await getDoc(doc(db, 'registeredUsers', user.email!));
          isRegisteredUser = registeredUserDoc.exists();
        } catch (error) {
          console.warn('Could not check registered users collection:', error);
          // If we can't check, allow admins to proceed but block regular users
          isRegisteredUser = isAdminEmail(user.email);
        }
        
        // If not a registered user and not admin, deny login
        if (!isRegisteredUser && !isAdminEmail(user.email)) {
          console.warn('🚫 Unregistered user attempted login:', user.email);
          await signOut(auth);
          throw new Error('You are not registered in the system. Please complete the registration process first.');
        }
        
        // Fetch user data for admin status
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          if (userData?.isAdmin) {
            (user as AuthUser).isAdmin = true;
          }
        } catch (error) {
          console.warn('Could not fetch user document, using email-based admin check');
          // Fallback to email-based admin check
          if (isAdminEmail(user.email)) {
            (user as AuthUser).isAdmin = true;
          }
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, additionalData: any = {}) => {
    try {
      // Validate password strength before attempting registration
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.feedback.join('. ');
        throw new Error(`Password does not meet security requirements: ${errorMessage}`);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (user) {
        // Update Firebase Auth profile with displayName
        if (additionalData.displayName) {
          await updateProfile(user, {
            displayName: additionalData.displayName
          });
        }

        try {
          // Add to registered users collection
          await setDoc(doc(db, 'registeredUsers', user.email!), {
            email: user.email,
            registeredAt: new Date().toISOString(),
            provider: 'email',
            displayName: additionalData.displayName || user.displayName
          });

          // Create user document in Firestore
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: additionalData.displayName || user.displayName,
            isAdmin: isAdminEmail(user.email), // Set admin status based on email
            createdAt: new Date().toISOString(),
            provider: 'email',
            isRegistered: true,
            ...additionalData
          });
        } catch (dbError) {
          console.warn('Could not create user documents, but auth user was created:', dbError);
          // Continue even if Firestore fails - user can still authenticate
        }

        // Send email verification immediately after registration
        await firebaseSendEmailVerification(user);
        console.log('✅ Verification email sent to:', user.email);
      }
      
      return userCredential;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const sendEmailVerification = async () => {
    if (currentUser && auth.currentUser) {
      try {
        await firebaseSendEmailVerification(auth.currentUser);
      } catch (error) {
        console.error('Error sending email verification:', error);
        throw error;
      }
    } else {
      throw new Error('No authenticated user found');
    }
  };

  const reloadCurrentUser = async () => {
    if (currentUser && auth.currentUser) {
      try {
        await reload(auth.currentUser);
        // Trigger a re-render to check the updated emailVerified status
        const updatedUser = auth.currentUser;
        if (updatedUser) {
          setCurrentUser(updatedUser as AuthUser);
          return updatedUser as AuthUser;
        }
        return null;
      } catch (error) {
        console.error('Error reloading user:', error);
        throw error;
      }
    } else {
      throw new Error('No authenticated user found');
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('Starting Google login...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Google login attempted for:', user.email);
      
      if (user) {
        // Google-authenticated accounts are automatically verified
        // No need to check emailVerified for Google sign-in
        
        // Check if this email is in our registered users list
        const registeredUserDoc = await getDoc(doc(db, 'registeredUsers', user.email!));
        
        if (!registeredUserDoc.exists()) {
          // User is not registered - sign them out and reject
          console.error('User not registered:', user.email);
          await signOut(auth);
          throw new Error(`Account ${user.email} is not registered. Please sign up first or contact an administrator.`);
        }
        
        console.log('User is registered, checking user document...');
        
        try {
          // Check if user document exists in Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists()) {
            console.log('Creating user document for registered user:', user.email);
            // Create user document for registered user
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              isAdmin: isAdminEmail(user.email),
              createdAt: new Date().toISOString(),
              provider: 'google',
              isRegistered: true
            });
          } else {
            console.log('User document exists, checking admin status');
            // Update existing user data if needed
            const userData = userDoc.data();
            if (userData?.isAdmin) {
              (user as AuthUser).isAdmin = true;
            }
          }
        } catch (dbError) {
          console.error('Error creating/updating user document:', dbError);
          // Re-throw the error to prevent login
          throw new Error('Failed to set up user account. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Provide more specific error messages
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Google Sign-In. Please contact the administrator.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      }
      
      throw error;
    }
  };

  const signUpWithGoogle = async () => {
    try {
      console.log('Starting Google sign-up...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Google sign-up attempted for:', user.email);
      
      if (user) {
        try {
          // Check if user is already registered
          const registeredUserDoc = await getDoc(doc(db, 'registeredUsers', user.email!));
          
          if (registeredUserDoc.exists()) {
            console.log('User already registered, proceeding with login');
            // User is already registered, just continue with normal flow
          } else {
            console.log('Registering new user:', user.email);
            // Register the user by adding to registeredUsers collection
            await setDoc(doc(db, 'registeredUsers', user.email!), {
              email: user.email,
              registeredAt: new Date().toISOString(),
              provider: 'google',
              displayName: user.displayName,
              photoURL: user.photoURL
            });
          }
          
          // Check if user document exists in Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists()) {
            console.log('Creating user document for new registered user:', user.email);
            // Create user document
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              isAdmin: isAdminEmail(user.email),
              createdAt: new Date().toISOString(),
              provider: 'google',
              isRegistered: true
            });
          }
        } catch (dbError) {
          console.warn('Database operations failed during Google sign-up:', dbError);
          // Continue with authentication even if Firestore fails
        }
      }
    } catch (error: any) {
      console.error('Google sign-up error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      
      const userId = currentUser.uid;
      const userEmail = currentUser.email;
      
      console.log('🗑️ Attempting to delete user account and data:', userId);
      
      if (!userEmail) {
        throw new Error('User email not available for data cleanup');
      }

      // First, delete user data from Firestore
      try {
        console.log('🧹 Step 1: Deleting user data from Firestore...');
        const deletedCount = await deleteUserData(userId, userEmail);
        console.log(`✅ Deleted ${deletedCount} user documents successfully`);
      } catch (dbError) {
        console.error('❌ Failed to delete user data:', dbError);
        // Decide whether to continue with account deletion or stop here
        // For now, we'll throw an error to prevent orphaned auth accounts
        throw new Error('Failed to delete user data. Account deletion cancelled.');
      }

      // Then delete the auth account
      console.log('🔐 Step 2: Deleting authentication account...');
      await deleteUser(currentUser);
      
      console.log('✅ User account and all data deleted successfully');
      
      // Clear the current user state
      setCurrentUser(null);
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Error deleting user account:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('🔧 AuthProvider: Setting up auth state observer...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔧 AuthProvider: Auth state changed, user:', user ? user.email : 'null');
      
      if (user) {
        let userData = null;
        let isAdmin = isAdminEmail(user.email); // Default to email-based check
        
        try {
          console.log('🔧 AuthProvider: Fetching user document for:', user.uid);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          userData = userDoc.data();
          
          // Method 1: Check Firestore document
          if (userData?.isAdmin) {
            isAdmin = true;
            console.log('🔧 AuthProvider: Admin status found in Firestore');
          }
          
          // Method 2: Check if email is in admin emails list (flexible admin system)
          if (isAdminEmail(user.email)) {
            isAdmin = true;
            console.log('🔧 AuthProvider: Admin status set by email configuration');
            
            // Update Firestore if not already set
            if (!userData?.isAdmin) {
              try {
                await setDoc(doc(db, 'users', user.uid), {
                  email: user.email,
                  isAdmin: true,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              } catch (updateError) {
                console.warn('Could not update admin status in Firestore:', updateError);
              }
            }
          }
        } catch (error) {
          console.error('❌ AuthProvider: Error fetching user data:', error);
          // Continue with email-based admin check
        }
        
        // Create enhanced user object with admin status and displayName from Firestore
        const enhancedUser = {
          ...user,
          isAdmin: isAdmin,
          displayName: userData?.displayName || user.displayName
        } as AuthUser;
        
        console.log('🔧 AuthProvider: Setting current user, isAdmin:', isAdmin, 'displayName:', enhancedUser.displayName);
        setCurrentUser(enhancedUser);
      } else {
        console.log('🔧 AuthProvider: No user, setting current user to null');
        setCurrentUser(null);
      }
      console.log('🔧 AuthProvider: Setting loading to false');
      setLoading(false);
    });

    return () => {
      console.log('🔧 AuthProvider: Cleaning up auth observer');
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.isAdmin || false,
    user: currentUser,
    isLoading: loading,
    login,
    register,
    logout,
    sendEmailVerification,
    reloadCurrentUser,
    loginWithGoogle,
    signUpWithGoogle,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}