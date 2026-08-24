/**
 * Sends Firebase Auth's built-in password reset email via the Identity Toolkit.
 * Used when branded SMTP (Gmail) / Resend cannot deliver.
 */
export async function sendFirebasePasswordResetOob(
  email: string,
  continueUrl: string
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Firebase API key');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
        continueUrl,
      }),
    }
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(data.error?.message || 'Firebase password reset failed');
  }
}
