const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password. Please try again.",
  "auth/invalid-login-credentials": "Invalid email or password. Please try again.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Pop-up was blocked. Please allow pop-ups and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/email-already-in-use": "This email is already registered. Please sign in instead.",
  "auth/weak-password": "Password is too weak. Please use a stronger password.",
  "auth/operation-not-allowed": "This sign-in method is not available. Please try another way.",
  "auth/requires-recent-login": "Please sign out and sign in again, then retry.",
  "auth/expired-action-code": "This link has expired. Please request a new one.",
  "auth/invalid-action-code": "This link is invalid or has already been used.",
  "auth/missing-password": "Please enter your password.",
  "auth/internal-error": "Something went wrong. Please try again.",
};

function isTechnicalFirebaseMessage(message?: string): boolean {
  if (!message) return true;
  return /Firebase:/i.test(message) || /auth\/[\w-]+/.test(message);
}

export function getAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
  overrides?: Record<string, string>
): string {
  const err = error as { code?: string; message?: string } | undefined;

  if (err?.code && overrides?.[err.code]) {
    return overrides[err.code];
  }

  if (err?.code && AUTH_ERROR_MESSAGES[err.code]) {
    return AUTH_ERROR_MESSAGES[err.code];
  }

  if (err?.message && !isTechnicalFirebaseMessage(err.message)) {
    return err.message;
  }

  return fallback;
}
