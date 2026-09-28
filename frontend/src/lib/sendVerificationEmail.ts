import { sendEmailVerification as firebaseSendEmailVerification, User } from 'firebase/auth';

/**
 * Sends the branded SpeakUp GC verification email via the API.
 * Falls back to Firebase's default template if branded mail cannot be sent.
 * Returns whether at least one provider accepted the send.
 */
export async function sendVerificationEmailForUser(user: User): Promise<boolean> {
  const token = await user.getIdToken();

  try {
    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) return true;

    console.warn('[verification] branded email failed, falling back to Firebase', await res.text());
  } catch (error) {
    console.warn('[verification] branded email error, falling back to Firebase', error);
  }

  try {
    const continueUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    await firebaseSendEmailVerification(
      user,
      continueUrl ? { url: continueUrl, handleCodeInApp: false } : undefined
    );
    return true;
  } catch (error) {
    console.warn('[verification] Firebase fallback also failed', error);
    return false;
  }
}
