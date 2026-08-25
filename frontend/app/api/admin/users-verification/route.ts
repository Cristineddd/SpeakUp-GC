import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminApp } from '../../../../src/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdminFromRequest } from '../../../../src/lib/verifyRequestUser';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { uids?: string[] };
    const uids = Array.from(new Set((body.uids || []).filter(Boolean))).slice(0, 500);
    if (uids.length === 0) {
      return NextResponse.json({ verified: {} });
    }

    const auth = getAdminAuth();
    const db = getFirestore(getAdminApp());
    const verified: Record<string, boolean> = {};

    for (let i = 0; i < uids.length; i += 100) {
      const chunk = uids.slice(i, i + 100);
      const result = await auth.getUsers(chunk.map((uid) => ({ uid })));
      for (const user of result.users) {
        verified[user.uid] = user.emailVerified;
      }
      for (const missing of result.notFound) {
        if ('uid' in missing && missing.uid) verified[missing.uid] = false;
      }
    }

    const writes = Object.entries(verified);
    for (let i = 0; i < writes.length; i += 400) {
      const batch = db.batch();
      for (const [uid, emailVerified] of writes.slice(i, i + 400)) {
        batch.set(db.collection('users').doc(uid), { emailVerified }, { merge: true });
      }
      await batch.commit();
    }

    return NextResponse.json({ verified });
  } catch (error) {
    console.error('[users-verification] Error:', error);
    return NextResponse.json({ error: 'Failed to load verification status' }, { status: 500 });
  }
}
