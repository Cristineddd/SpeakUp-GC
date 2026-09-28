import { sendEmailVerification as firebaseSendEmailVerification, User } from 'firebase/auth';

export type VerificationSendResult = {
  emailed: boolean;
  verificationLink?: string;
};

/**
 * Sends the branded SpeakUp GC verification email via the API.
 * If mail providers fail, the API may still return a one-time verification link
 * for the signed-in user so signup can finish without inbox delivery.
 */
export async function sendVerificationEmailForUser(user: User): Promise<VerificationSendResult> {
  const token = await user.getIdToken();

  try {
    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = (await res.json().catch(() => ({}))) as {
      emailed?: boolean;
      skipped?: boolean;
      verificationLink?: string;
    };

    if (res.ok && (data.emailed || data.skipped)) {
      return { emailed: true };
    }

    if (res.ok && data.verificationLink) {
      return { emailed: false, verificationLink: data.verificationLink };
    }

    console.warn('[verification] branded email failed, falling back to Firebase', data);
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
    return { emailed: true };
  } catch (error) {
    console.warn('[verification] Firebase fallback also failed', error);
    return { emailed: false };
  }
}
