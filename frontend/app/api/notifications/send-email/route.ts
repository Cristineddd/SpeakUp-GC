import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildCaseNotificationEmail } from '../../../../src/lib/notificationEmailTemplates';

const EMAIL_SUPPRESSED_TYPES = new Set(['new_message', 'message_read', 'new_comment']);

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
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);
    const verified = await verifyFirebaseToken(idToken);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, toEmail, toName, type, title, message, complaintId, actionUrl, data } =
      body as {
        userId: string;
        toEmail: string;
        toName?: string;
        type: string;
        title: string;
        message: string;
        complaintId?: string;
        actionUrl?: string;
        data?: Record<string, unknown>;
      };

    if (!userId || !toEmail || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (EMAIL_SUPPRESSED_TYPES.has(type)) {
      return NextResponse.json({ skipped: true, reason: 'suppressed_type' });
    }

    const formattedCaseId =
      (data?.caseId as string | undefined) || complaintId || 'N/A';

    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const isSubmission = type === 'complaint_created';
    const statusLabel =
      (data?.status as string | undefined) ||
      (data?.newStatus as string | undefined) ||
      title;

    const { subject, html } = buildCaseNotificationEmail({
      toName: toName || 'there',
      title,
      message,
      caseId: formattedCaseId,
      dateStr,
      isSubmission,
      statusLabel,
      actionUrl,
    });

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_ADDRESS || 'SpeakUp GC <noreply@resend.dev>';

    const result = await resend.emails.send({
      from,
      to: toEmail,
      subject,
      html,
    });

    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error('[send-email] Error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
