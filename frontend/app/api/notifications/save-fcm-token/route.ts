import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '../../../../src/firebaseAdmin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyFirebaseIdToken } from '../../../../src/lib/verifyRequestUser';
import { fcmTokenDocId } from '../../../../src/utils/fcmTokenId';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verified = await verifyFirebaseIdToken(authHeader.slice('Bearer '.length));
    if (!verified) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = (await request.json()) as {
      token?: string;
      userAgent?: string;
      platform?: string;
    };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const db = getFirestore(getAdminApp());
    await db.collection('fcmTokens').doc(fcmTokenDocId(token)).set(
      {
        userId: verified.uid,
        token,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        userAgent: body.userAgent || '',
        platform: body.platform || '',
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[save-fcm-token] Error:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
}
