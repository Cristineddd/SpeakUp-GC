import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFromAddress, getResendClient } from './lib/resend';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Send email verification using Resend
 * Called when a new user signs up
 */
export const sendVerificationEmail = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { email, displayName } = data;

  try {
    // Generate verification link
    const actionCodeSettings = {
      url: 'https://speakupgc.vercel.app/dashboard',
      handleCodeInApp: true,
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { width: 60px; height: 60px; margin-bottom: 15px; }
            .content { background: #ffffff; padding: 40px 30px; }
            .button { display: inline-block; background: #16A34A; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #15803D; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 13px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to SpeakUp GC</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Gordon College DEIU</p>
            </div>
            
            <div class="content">
              <h2 style="color: #16A34A; margin-top: 0;">Verify Your Email Address</h2>
              
              <p>Hi ${displayName || 'there'},</p>
              
              <p>Thank you for creating an account with SpeakUp GC. To complete your registration and access all features, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 24 hours. If you didn't create this account, please ignore this email.
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verificationLink}" style="color: #16A34A; word-break: break-all;">${verificationLink}</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>SpeakUp GC</strong> - Safe Spaces for Everyone</p>
              <p>Gordon College Diversity, Equity, and Inclusion Unit</p>
              <p style="margin-top: 15px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resend = getResendClient();
    if (!resend) {
      throw new functions.https.HttpsError('failed-precondition', 'Email service is not configured');
    }

    const result = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Verify Your Email - SpeakUp GC',
      html: html,
    });

    console.log('Verification email sent:', result.data?.id);
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
  }
});

/**
 * Send password reset email using Resend
 */
export const sendPasswordResetEmail = functions.https.onCall(async (data: any) => {
  const { email } = data;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  try {
    // Generate password reset link
    const actionCodeSettings = {
      url: 'https://speakupgc.vercel.app/login',
      handleCodeInApp: false,
    };

    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { background: #ffffff; padding: 40px 30px; }
            .button { display: inline-block; background: #16A34A; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #15803D; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 13px; }
            .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; color: #991b1b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">SpeakUp GC</p>
            </div>
            
            <div class="content">
              <h2 style="color: #16A34A; margin-top: 0;">Reset Your Password</h2>
              
              <p>We received a request to reset your password for your SpeakUp GC account.</p>
              
              <p>Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>🔒 Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #16A34A; word-break: break-all;">${resetLink}</a>
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>Need help?</strong> If you're having trouble resetting your password, contact the DEIU support team.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>SpeakUp GC</strong> - Safe Spaces for Everyone</p>
              <p>Gordon College Diversity, Equity, and Inclusion Unit</p>
              <p style="margin-top: 15px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resend = getResendClient();
    if (!resend) {
      throw new functions.https.HttpsError('failed-precondition', 'Email service is not configured');
    }

    const result = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Reset Your Password - SpeakUp GC',
      html: html,
    });

    console.log('Password reset email sent:', result.data?.id);
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send password reset email');
  }
});
