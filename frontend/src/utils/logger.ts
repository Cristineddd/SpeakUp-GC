/**
 * Production-safe logger utility
 * Console logs only appear in development, not in deployed production
 */

const isDevelopment = process.env.NODE_ENV === 'development' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

/**
 * Logger that only outputs in development mode
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  /**
   * Force log even in production (use sparingly, only for critical errors)
   */
  forceLog: (...args: any[]) => {
    console.log(...args);
  },
  
  forceError: (...args: any[]) => {
    console.error(...args);
  }
};

/**
 * Disable all console logs in production
 * Call this in your app entry point (main.tsx or App.tsx)
 */
export const disableConsolesInProduction = () => {
  if (!isDevelopment) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    // Keep console.error for critical production errors
    // console.error = () => {};
  }
};
