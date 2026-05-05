import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { RateLimitInfo, LoginAttempt } from '../types/admin';

// Rate limiting setup
const rateLimiter = new Map<string, RateLimitInfo>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

export const checkAdminAuth = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated user');
  }

  // Get the user's admin status from Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  if (!userData?.isAdmin) {
    throw new Error('User is not an admin');
  }

  return true;
};

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          setIsAdmin(!!userData?.isAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isAdmin, loading };
};

export const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const userAttempts: RateLimitInfo = rateLimiter.get(ip) || { attempts: 0, lastAttempt: now };

  // Reset attempts if lockout period has passed
  if (now - userAttempts.lastAttempt > LOCKOUT_TIME) {
    userAttempts.attempts = 0;
  }

  // Check if user is locked out
  if (userAttempts.attempts >= MAX_ATTEMPTS) {
    const timeLeft = LOCKOUT_TIME - (now - userAttempts.lastAttempt);
    if (timeLeft > 0) {
      return false;
    }
    // Reset after lockout period
    userAttempts.attempts = 0;
  }

  // Update attempts
  userAttempts.attempts++;
  userAttempts.lastAttempt = now;
  rateLimiter.set(ip, userAttempts);

  return true;
};

export const logLoginAttempt = async (
  userId: string, 
  success: boolean, 
  ip: string
): Promise<void> => {
  try {
    const loginAttempt: LoginAttempt = {
      userId,
      success,
      ip,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    };
    
    const logRef = doc(db, 'adminLogs', new Date().toISOString());
    await setDoc(logRef, loginAttempt);
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};
