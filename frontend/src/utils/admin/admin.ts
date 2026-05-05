import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';


const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttempt {
  timestamp: number;
  success: boolean;
  ip: string;
}

// Store login attempts in memory (in production, use a more persistent solution)
const loginAttempts: { [key: string]: LoginAttempt[] } = {};

export const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const userAttempts = loginAttempts[identifier] || [];
  
  // Clean up old attempts
  const recentAttempts = userAttempts.filter(
    attempt => now - attempt.timestamp < WINDOW_MS
  );
  
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return false; // rate limited
  }
  
  return true;
};

export const logLoginAttempt = async (
  userId: string,
  success: boolean,
  ip: string
): Promise<void> => {
  // Record the attempt in memory
  const attempt: LoginAttempt = {
    timestamp: Date.now(),
    success,
    ip
  };
  
  if (!loginAttempts[userId]) {
    loginAttempts[userId] = [];
  }
  loginAttempts[userId].push(attempt);
  
  // Also log to Firestore for persistence
  try {
    const loginLogRef = doc(db, 'login_logs', `${userId}_${Date.now()}`);
    await setDoc(loginLogRef, {
      userId,
      timestamp: new Date(),
      success,
      ip
    });
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};
