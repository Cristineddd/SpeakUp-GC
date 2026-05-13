import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
}

/**
 * Hook to handle automatic session timeout after inactivity
 * @param timeoutMinutes - Minutes of inactivity before auto-logout (default: 30)
 * @param warningMinutes - Minutes before timeout to show warning (default: 5)
 */
export const useSessionTimeout = ({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onTimeout,
  onWarning
}: UseSessionTimeoutOptions = {}) => {
  const { logout, currentUser } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutMinutes * 60);
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const warningRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const countdownRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = undefined;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = undefined;
    }
    
    setShowWarning(false);
    setTimeRemaining(timeoutMinutes * 60);
    lastActivityRef.current = Date.now();

    // Set warning timer
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      onWarning?.();
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        const remaining = Math.max(0, (timeoutMinutes * 60) - elapsed);
        setTimeRemaining(remaining);
        
        if (remaining <= 0 && countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = undefined;
        }
      }, 1000);
    }, warningTime);

    // Set timeout timer
    timeoutRef.current = setTimeout(async () => {
      console.log('🔒 Session timeout - logging out user');
      onTimeout?.();
      try {
        await logout();
      } catch (error) {
        console.error('Error during auto-logout:', error);
      }
    }, timeoutMinutes * 60 * 1000);
  };

  const extendSession = () => {
    console.log('⏰ Session extended by user');
    resetTimer();
  };

  useEffect(() => {
    // Only activate if user is logged in
    if (!currentUser) return;

    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (showWarning) {
        // If warning is showing and user is active, extend session
        extendSession();
      } else {
        // Otherwise just reset the timer
        resetTimer();
      }
    };

    // Set up event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = undefined;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = undefined;
      }
    };
  }, [currentUser, showWarning]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    resetTimer
  };
};
