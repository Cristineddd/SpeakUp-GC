/**
 * Production-safe logger — debug noise stays off in deployed builds.
 */

function isDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || isDevHost();
}

/**
 * Logger that only outputs in development mode
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment()) console.log(...args);
  },

  error: (...args: unknown[]) => {
    if (isDevelopment()) console.error(...args);
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment()) console.warn(...args);
  },

  info: (...args: unknown[]) => {
    if (isDevelopment()) console.info(...args);
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment()) console.debug(...args);
  },

  /** Rare: critical production visibility */
  forceError: (...args: unknown[]) => {
    console.error(...args);
  },
};

/**
 * Mute noisy console methods in production / deployed builds.
 * Call once from the app root (client).
 */
export function disableConsolesInProduction(): void {
  if (typeof window === 'undefined') return;
  if (isDevelopment()) return;

  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  // Keep warn/error for real production issues — mute warn spam too if desired:
  console.warn = noop;
}
