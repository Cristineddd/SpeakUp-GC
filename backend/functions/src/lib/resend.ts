import * as functions from 'firebase-functions';
import { Resend } from 'resend';

const FROM_ADDRESS = 'SpeakUp GC <noreply@resend.dev>';

export function getResendApiKey(): string | undefined {
  try {
    const configKey = functions.config().resend?.api_key;
    if (configKey) return configKey;
  } catch {
    // functions.config() unavailable outside Firebase runtime
  }

  return process.env.RESEND_API_KEY;
}

export function getResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.warn('[Resend] API key not configured — skipping email.');
    return null;
  }

  return new Resend(apiKey);
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_ADDRESS || FROM_ADDRESS;
}
