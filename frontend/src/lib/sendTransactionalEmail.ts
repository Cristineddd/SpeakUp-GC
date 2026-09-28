import nodemailer from 'nodemailer';
import { Resend } from 'resend';

async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ provider: 'resend' }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw new Error('No email provider configured');
  }

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM_ADDRESS || 'SpeakUp GC <noreply@resend.dev>';
  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { provider: 'resend' };
}

export async function sendTransactionalEmail(
  input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  },
  options?: { allowResend?: boolean }
): Promise<{ provider: 'gmail' | 'resend' }> {
  const allowResend = options?.allowResend !== false;
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (gmailUser && !gmailPass) {
    console.warn(
      '[email] GMAIL_USER is set but GMAIL_APP_PASSWORD is missing. Add a Google App Password to send from Gmail.'
    );
  }

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
      });

      const fromName = process.env.GMAIL_FROM_NAME || 'SpeakUp GC';
      await transporter.sendMail({
        from: `"${fromName}" <${gmailUser}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      return { provider: 'gmail' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!allowResend || !process.env.RESEND_API_KEY) {
        console.warn('[email] Gmail SMTP failed:', message);
        throw error;
      }
      console.warn('[email] Gmail SMTP failed, falling back to Resend:', message);
      return sendViaResend(input);
    }
  }

  if (!allowResend) {
    throw new Error('No email provider configured');
  }

  return sendViaResend(input);
}
