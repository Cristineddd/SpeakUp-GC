import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

function viewDocId(userId: string, caseId: string): string {
  return `${userId}_${caseId}`;
}

export async function persistCaseView(userId: string, caseId: string): Promise<void> {
  if (!userId || !caseId) return;

  const ref = doc(db, 'caseViews', viewDocId(userId, caseId));
  await setDoc(
    ref,
    {
      userId,
      caseId,
      viewedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function fetchSeenCaseIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  const viewsQuery = query(collection(db, 'caseViews'), where('userId', '==', userId));
  const snapshot = await getDocs(viewsQuery);
  return snapshot.docs
    .map((docSnap) => String(docSnap.data().caseId || ''))
    .filter(Boolean);
}
