/**
 * Sends the branded SpeakUp GC password reset email via the API.
 * Falls back to Firebase's default template if Gmail/Resend cannot send.
 */
export async function sendBrandedPasswordResetEmail(email: string): Promise<void> {
  const res = await fetch('/api/auth/send-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (res.ok) return;

  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(data.error || 'Failed to send reset email. Please try again.');
}
