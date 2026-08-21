import { sendEmailVerification as firebaseSendEmailVerification, User } from 'firebase/auth';

/**
 * Sends the branded SpeakUp GC verification email via the API.
 * Falls back to Firebase's default template if the API is not configured.
 */
export async function sendVerificationEmailForUser(user: User): Promise<void> {
  const token = await user.getIdToken();

  try {
    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) return;

    console.warn('[verification] branded email failed, falling back to Firebase', await res.text());
  } catch (error) {
    console.warn('[verification] branded email error, falling back to Firebase', error);
  }

  await firebaseSendEmailVerification(user);
}
