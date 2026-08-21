import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '../../../../src/firebaseAdmin';
import { buildVerificationEmail } from '../../../../src/lib/authEmailTemplates';
import { sendTransactionalEmail } from '../../../../src/lib/sendTransactionalEmail';
import { getAppBaseUrl } from '../../../../src/utils/appUrl';

async function verifyFirebaseToken(idToken: string): Promise<{ uid: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as { users?: Array<{ localId: string }> };
  const uid = data.users?.[0]?.localId;
  return uid ? { uid } : null;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verified = await verifyFirebaseToken(authHeader.slice('Bearer '.length));
    if (!verified) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await getAdminAuth().getUser(verified.uid);
    if (!user.email) {
      return NextResponse.json({ error: 'User has no email' }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, skipped: true, reason: 'already_verified' });
    }

    const appBase = getAppBaseUrl().replace(/\/$/, '');
    const continueUrl = `${appBase}/dashboard`;
    const verificationLink = await getAdminAuth().generateEmailVerificationLink(user.email, {
      url: continueUrl,
      handleCodeInApp: false,
    });

    const toName =
      user.displayName || user.email.split('@')[0] || 'there';
    const { subject, html, text } = buildVerificationEmail({
      toName,
      verificationLink,
      logoUrl: `${appBase}/LOGO.png`,
    });

    const result = await sendTransactionalEmail({
      to: user.email,
      subject,
      html,
      text,
    });

    return NextResponse.json({ success: true, provider: result.provider });
  } catch (error) {
    console.error('[send-verification] Error:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
