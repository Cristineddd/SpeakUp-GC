import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '../../../../src/firebaseAdmin';
import { buildPasswordResetEmail } from '../../../../src/lib/authEmailTemplates';
import { sendTransactionalEmail } from '../../../../src/lib/sendTransactionalEmail';
import { getAppBaseUrl } from '../../../../src/utils/appUrl';
import { isAdminEmail } from '../../../../src/utils/admin/adminConfig';

function isAllowedResetEmail(email: string): boolean {
  return email.endsWith('@gordoncollege.edu.ph') || isAdminEmail(email);
}

function toAppActionLink(generatedLink: string, appBase: string): string {
  try {
    const generated = new URL(generatedLink);
    const appLink = new URL('/auth/action', appBase);
    generated.searchParams.forEach((value, key) => {
      appLink.searchParams.set(key, value);
    });
    return appLink.toString();
  } catch {
    return generatedLink;
  }
}

function isUserNotFound(error: unknown): boolean {
  const code = (error as { code?: string; errorInfo?: { code?: string } })?.code
    || (error as { errorInfo?: { code?: string } })?.errorInfo?.code
    || '';
  const message = String((error as { message?: string })?.message || '');
  return (
    code === 'auth/user-not-found' ||
    message.includes('user-not-found') ||
    message.includes('There is no user record')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!isAllowedResetEmail(email)) {
      return NextResponse.json(
        { error: 'Only @gordoncollege.edu.ph email addresses are allowed.' },
        { status: 400 }
      );
    }

    // Always return success for unknown accounts so we don't leak who is registered.
    try {
      await getAdminAuth().getUserByEmail(email);
    } catch (error) {
      if (isUserNotFound(error)) {
        return NextResponse.json({ success: true, skipped: true });
      }
      throw error;
    }

    const appBase = getAppBaseUrl().replace(/\/$/, '');
    const generatedLink = await getAdminAuth().generatePasswordResetLink(email, {
      url: `${appBase}/reset-password`,
      handleCodeInApp: false,
    });
    const resetLink = toAppActionLink(generatedLink, appBase);

    const toName = email.split('@')[0] || 'there';
    const { subject, html, text } = buildPasswordResetEmail({
      toName,
      resetLink,
      logoUrl: `${appBase}/LOGO.png`,
    });

    const result = await sendTransactionalEmail({
      to: email,
      subject,
      html,
      text,
    });

    return NextResponse.json({ success: true, provider: result.provider });
  } catch (error) {
    console.error('[send-password-reset] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send reset email. Please try again.' },
      { status: 500 }
    );
  }
}
