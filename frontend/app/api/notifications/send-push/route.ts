import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminMessaging } from '../../../../src/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { toAbsoluteAppUrl } from '../../../../src/utils/appUrl';

const PUSH_SUPPRESSED_TYPES = new Set(['message_read']);

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

/**
 * Free PWA push — no Firebase Blaze / Cloud Functions required.
 * Uses Firebase Admin Messaging from the Next.js API route (Vercel / next start).
 */
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

    const body = await request.json();
    const { userId, type, title, message, actionUrl, notificationId, complaintId } = body as {
      userId: string;
      type?: string;
      title: string;
      message: string;
      actionUrl?: string;
      notificationId?: string;
      complaintId?: string;
    };

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (type && PUSH_SUPPRESSED_TYPES.has(type)) {
      return NextResponse.json({ ok: true, sent: 0, skipped: true });
    }

    const db = getFirestore(getAdminApp());
    const tokenSnap = await db.collection('fcmTokens').where('userId', '==', userId).get();

    if (tokenSnap.empty) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_tokens' });
    }

    const tokens: string[] = [];
    const docs = tokenSnap.docs;
    docs.forEach((d) => {
      const token = d.data()?.token as string | undefined;
      if (token) tokens.push(token);
    });

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_tokens' });
    }

    const link = toAbsoluteAppUrl(actionUrl || '/notifications');
    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      data: {
        title,
        body: message,
        message,
        type: type || 'general',
        actionUrl: link,
        notificationId: notificationId || '',
        complaintId: complaintId || '',
      },
      webpush: {
        fcmOptions: {
          link,
        },
      },
    });

    const staleDeletes: Promise<unknown>[] = [];
    response.responses.forEach((res, idx) => {
      if (res.success) return;
      const code = res.error?.code || '';
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token')
      ) {
        staleDeletes.push(docs[idx].ref.delete());
      }
    });
    if (staleDeletes.length) {
      await Promise.allSettled(staleDeletes);
    }

    return NextResponse.json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Push failed';
    console.error('[send-push]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
