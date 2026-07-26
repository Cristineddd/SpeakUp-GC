/**
 * Auth Password Service
 * Handles in-app password changes for email/password accounts.
 */

import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';

/** True when the signed-in user authenticated with email + password (not Google-only). */
export function hasPasswordProvider(): boolean {
  const user = auth.currentUser;
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === 'password');
}

/**
 * Change password for the current user. Requires reauthentication with the current password.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('No authenticated user found.');
  }

  if (!hasPasswordProvider()) {
    throw new Error(
      'Your account uses Google Sign-In. Send yourself a password reset email below, or manage your password through Google.'
    );
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/** Send a password reset email to the current user's address. */
export async function sendPasswordResetToCurrentUser(): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('No email address found for your account.');
  }
  await sendPasswordResetEmail(auth, user.email);
}
