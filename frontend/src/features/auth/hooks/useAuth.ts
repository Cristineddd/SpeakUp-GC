import { useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  reload,
  UserCredential,
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL?: string | null;
  isAdmin?: boolean;
  role?: 'user' | 'admin';
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  user: User | null;
  currentUser: User | null;
  isAdmin: boolean;
  login: (email: string, password: string, requireAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  reloadCurrentUser: () => Promise<void>;
  forceLogout: () => Promise<void>; // New function to force complete logout
}

const useAuth = (): AuthState => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Map Firebase user to our User type
  const mapFirebaseUser = (firebaseUser: FirebaseUser | null): User | null => {
    if (!firebaseUser) return null;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      photoURL: firebaseUser.photoURL
    };
  };

  // Check auth state on mount and on auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setIsLoading(true);
        
        if (!firebaseUser) {
          // No user logged in
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // Validate the authenticated user against our system
        try {
          // CHECK 1: Verify email is in registered users list
          const registeredUserRef = doc(db, 'registeredUsers', firebaseUser.email!);
          const registeredUserDoc = await getDoc(registeredUserRef);
          
          if (!registeredUserDoc.exists()) {
            // Email not registered - sign them out and reject
            console.log('🚫 User email not in registered users list, signing out');
            await firebaseSignOut(auth);
            
            // Clear all local state and storage
            localStorage.clear();
            sessionStorage.clear();
            
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            setIsLoading(false);
            return;
          }

          // CHECK 2: Check if user document exists in Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // No user document - sign them out and reject
            console.log('🚫 User document not found, signing out');
            await firebaseSignOut(auth);
            
            // Clear all local state and storage
            localStorage.clear();
            sessionStorage.clear();
            
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            setIsLoading(false);
            return;
          }

          // User is valid - proceed with authentication
          const userData = mapFirebaseUser(firebaseUser);
          const userDocData = userDoc.data();
          
          setUser(userData);
          setIsAuthenticated(true);
          setIsAdmin(userDocData?.isAdmin || false);
          
        } catch (validationError) {
          console.error('❌ Auth validation error:', validationError);
          // On validation error, sign out and reject
          await firebaseSignOut(auth);
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
        
      } catch (error) {
        console.error('❌ Auth state change error:', error);
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signUpWithGoogle = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      // First, sign out any existing user
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'  // Force account selection every time
      });
      
      const result: UserCredential = await signInWithPopup(auth, provider);
      
      if (result.user) {
        // CHECK 1: Verify email is in registered users list
        const registeredUserRef = doc(db, 'registeredUsers', result.user.email!);
        const registeredUserDoc = await getDoc(registeredUserRef);
        
        if (!registeredUserDoc.exists()) {
          // Email not in registered users list - delete the Firebase user and reject
          console.log('🚫 Email not registered, deleting Firebase user');
          try {
            await deleteUser(result.user);
          } catch (deleteError) {
            console.error('Failed to delete unauthorized user:', deleteError);
            // Fallback to sign out if delete fails
            await firebaseSignOut(auth);
          }
          throw new Error('Your email is not registered. Please contact the administrator to get your email added to the system.');
        }

        // CHECK 2: Check if user already exists in our system
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // User already exists - delete the Firebase user (duplicate) and reject
          console.log('🚫 User already exists, deleting duplicate Firebase user');
          try {
            await deleteUser(result.user);
          } catch (deleteError) {
            console.error('Failed to delete duplicate user:', deleteError);
            // Fallback to sign out if delete fails
            await firebaseSignOut(auth);
          }
          throw new Error('Account already exists. Please use the login page.');
        }
        
        try {
          // Create user document in Firestore
          await setDoc(userDocRef, {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            signUpMethod: 'google',
            emailVerified: result.user.emailVerified,
            createdAt: new Date().toISOString(),
          });
          
          console.log('Successfully created new user document in Firestore');
        } catch (firestoreError) {
          // If Firestore creation fails, clean up by signing out
          console.error('Failed to create user document:', firestoreError);
          await firebaseSignOut(auth);
          throw new Error('Failed to complete signup. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Google sign-up failed:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-up was cancelled');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // First, sign out any existing user
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'  // Force account selection every time
      });
      
      const result: UserCredential = await signInWithPopup(auth, provider);
      
      if (result.user) {
        // CHECK 1: Verify email is in registered users list
        const registeredUserRef = doc(db, 'registeredUsers', result.user.email!);
        const registeredUserDoc = await getDoc(registeredUserRef);
        
        if (!registeredUserDoc.exists()) {
          // Email not in registered users list - delete the Firebase user and reject
          console.log('🚫 Email not registered, deleting Firebase user');
          try {
            await deleteUser(result.user);
          } catch (deleteError) {
            console.error('Failed to delete unauthorized user:', deleteError);
            // Fallback to sign out if delete fails
            await firebaseSignOut(auth);
          }
          throw new Error('Your email is not registered in the system. Please contact the administrator.');
        }

        // CHECK 2: Check if user document exists in Firestore
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // User doesn't exist in our system - delete the Firebase user and reject
          console.log('🚫 User document not found, deleting Firebase user');
          try {
            await deleteUser(result.user);
          } catch (deleteError) {
            console.error('Failed to delete unauthorized user:', deleteError);
            // Fallback to sign out if delete fails
            await firebaseSignOut(auth);
          }
          throw new Error('No account found. Please sign up first with Google.');
        }
        
        // User exists, proceed with login
        // onAuthStateChanged will update state
        console.log('Successful Google login, user document exists');
      }
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, requireAdmin: boolean = false): Promise<void> => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (requireAdmin) {
        // Check if user is admin when required
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const userData = userDoc.data();
        if (!userData?.isAdmin) {
          await firebaseSignOut(auth);
          throw new Error('Access denied. This login is for administrators only.');
        }
      }
      // onAuthStateChanged will handle the state update
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle the state update
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: name,
      });

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: name,
        photoURL: null,
        signUpMethod: 'email',
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
      });

      // Send email verification
      await sendEmailVerification(user);
      
      // onAuthStateChanged will handle the state update
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendVerificationEmail = useCallback(async (): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }
    await sendEmailVerification(auth.currentUser);
  }, []);

  const reloadCurrentUser = useCallback(async (): Promise<void> => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    const userData = mapFirebaseUser(auth.currentUser as FirebaseUser);
    setUser(userData);
    setIsAuthenticated(!!userData);
  }, []);

  const forceLogout = useCallback(async (): Promise<void> => {
    try {
      // Force sign out from Firebase
      await firebaseSignOut(auth);
      
      // Clear all local state
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsLoading(false);
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('🔧 Force logout completed - all auth state cleared');
    } catch (error) {
      console.error('❌ Force logout error:', error);
      // Even if Firebase signout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsLoading(false);
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    loading: isLoading,
    user,
    currentUser: user,
    isAdmin: user?.isAdmin || false,
    login,
    logout,
    register,
    sendEmailVerification: sendVerificationEmail,
    loginWithGoogle,
    signUpWithGoogle,
    reloadCurrentUser,
    forceLogout
  };
};

export { useAuth };
