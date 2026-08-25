import { getAdminAuth, getAdminApp } from '../firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { isAdminEmail } from '../utils/admin/adminConfig';

export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string } | null> {
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

export async function requireAdminFromRequest(request: Request): Promise<{ uid: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const verified = await verifyFirebaseIdToken(authHeader.slice('Bearer '.length));
  if (!verified) return null;

  try {
    const user = await getAdminAuth().getUser(verified.uid);
    if (isAdminEmail(user.email)) return verified;

    const snap = await getFirestore(getAdminApp()).collection('users').doc(verified.uid).get();
    if (snap.data()?.isAdmin === true) return verified;
  } catch {
    return null;
  }

  return null;
}
