/**
 * Query Examples for Production Use
 * Demonstrates proper Firestore queries that prevent stale data
 * and ensure data consistency
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  Unsubscribe,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Example 1: Assign Case to Representative
 * Updates complaint document with handler info
 * NO denormalized arrays to update!
 */
export async function assignCaseToRepresentative(
  complaintId: string,
  handlerId: string,
  handlerName: string,
  assignedBy: string
): Promise<void> {
  const complaintRef = doc(db, 'complaints', complaintId);

  await updateDoc(complaintRef, {
    handlerId: handlerId,
    handlerName: handlerName,
    status: 'inProgress',
    assignedAt: serverTimestamp(),
    assignedBy: assignedBy,
    updatedAt: serverTimestamp()
  });

  console.log(`✅ Assigned complaint ${complaintId} to ${handlerName}`);
}

/**
 * Example 2: Get Active Cases for Representative (Static Query)
 * Queries dynamically - always returns fresh data
 */
export async function getActiveCasesForRep(
  handlerId: string
): Promise<any[]> {
  const q = query(
    collection(db, 'complaints'),
    where('handlerId', '==', handlerId),
    where('isDeleted', '==', false),
    where('status', 'in', ['inProgress', 'investigating', 'under_review']),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Example 3: Subscribe to Representative's Active Cases (Real-time)
 * Uses onSnapshot for automatic UI updates
 * This is the RECOMMENDED approach for dashboards
 */
export function subscribeToRepActiveCases(
  handlerId: string,
  callback: (cases: any[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'complaints'),
    where('handlerId', '==', handlerId),
    where('isDeleted', '==', false),
    where('status', 'not-in', ['resolved', 'dismissed', 'deleted', 'closed']),
    orderBy('status'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const cases = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`🔄 Real-time update: ${cases.length} active cases`);
    callback(cases);
  });
}

/**
 * Example 4: Get Representative Dashboard Stats (Dynamic Calculation)
 * Calculates stats from actual data, not cached counts
 */
export async function getRepDashboardStats(
  handlerId: string
): Promise<{
  activeCases: number;
  resolvedCases: number;
  totalCases: number;
  cases: any[];
}> {
  const baseQuery = collection(db, 'complaints');

  const activeQuery = query(
    baseQuery,
    where('handlerId', '==', handlerId),
    where('isDeleted', '==', false),
    where('status', 'in', ['inProgress', 'investigating', 'under_review'])
  );
  const activeSnap = await getDocs(activeQuery);

  const resolvedQuery = query(
    baseQuery,
    where('handlerId', '==', handlerId),
    where('status', 'in', ['resolved', 'dismissed'])
  );
  const resolvedSnap = await getDocs(resolvedQuery);

  const totalQuery = query(
    baseQuery,
    where('handlerId', '==', handlerId)
  );
  const totalSnap = await getDocs(totalQuery);

  const cases = activeSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    activeCases: activeSnap.size,
    resolvedCases: resolvedSnap.size,
    totalCases: totalSnap.size,
    cases
  };
}

/**
 * Example 5: Fetch All Active (Non-Deleted) Complaints
 * For admin reports page
 */
export async function getAllActiveComplaints(): Promise<any[]> {
  const q = query(
    collection(db, 'complaints'),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Example 6: Subscribe to All Complaints (Real-time Admin View)
 */
export function subscribeToAllComplaints(
  callback: (complaints: any[]) => void,
  filters?: {
    status?: string[];
    severity?: string[];
    assignedTo?: string;
  }
): Unsubscribe {
  let q = query(
    collection(db, 'complaints'),
    where('isDeleted', '==', false)
  );

  if (filters?.status && filters.status.length > 0) {
    q = query(q, where('status', 'in', filters.status));
  }

  if (filters?.severity && filters.severity.length > 0) {
    q = query(q, where('severity', 'in', filters.severity));
  }

  if (filters?.assignedTo) {
    q = query(q, where('handlerId', '==', filters.assignedTo));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const complaints = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`🔄 Real-time update: ${complaints.length} complaints`);
    callback(complaints);
  });
}

/**
 * Example 7: Get User's Complaints
 */
export async function getUserComplaints(userId: string): Promise<any[]> {
  const q = query(
    collection(db, 'complaints'),
    where('userId', '==', userId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Example 8: Unassign Case from Representative
 * Simply updates the complaint, no array manipulation
 */
export async function unassignCase(complaintId: string): Promise<void> {
  const complaintRef = doc(db, 'complaints', complaintId);

  await updateDoc(complaintRef, {
    handlerId: null,
    handlerName: null,
    status: 'pending',
    unassignedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  console.log(`✅ Unassigned complaint ${complaintId}`);
}

/**
 * Example 9: Get Notifications for User (with pagination)
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: any[]) => void,
  options?: { limit?: number }
): Unsubscribe {
  let q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  if (options?.limit) {
    const firestoreLimit = require('firebase/firestore').limit;
    q = query(q, firestoreLimit(options.limit));
  }

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    callback(notifications);
  });
}

/**
 * Example 10: Get Chat Rooms for User (Real-time)
 */
export function subscribeToUserChatRooms(
  userId: string,
  callback: (chatRooms: any[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chatRooms'),
    where('participantIds', 'array-contains', userId),
    where('isDeleted', '==', false),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chatRooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    callback(chatRooms);
  });
}

/**
 * Example 11: Search Complaints by Multiple Criteria
 * Note: Firestore doesn't support full-text search natively
 * This is a simple filter approach
 */
export async function searchComplaints(
  searchParams: {
    category?: string;
    severity?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<any[]> {
  let q = query(
    collection(db, 'complaints'),
    where('isDeleted', '==', false)
  );

  if (searchParams.category) {
    q = query(q, where('category', '==', searchParams.category));
  }

  if (searchParams.severity) {
    q = query(q, where('severity', '==', searchParams.severity));
  }

  if (searchParams.status) {
    q = query(q, where('status', '==', searchParams.status));
  }

  if (searchParams.dateFrom) {
    q = query(
      q,
      where('createdAt', '>=', Timestamp.fromDate(searchParams.dateFrom))
    );
  }

  if (searchParams.dateTo) {
    q = query(
      q,
      where('createdAt', '<=', Timestamp.fromDate(searchParams.dateTo))
    );
  }

  q = query(q, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Example 12: Get Representatives with Workload
 * Fetches all reps and calculates their current workload
 */
export async function getRepresentativesWithWorkload(): Promise<
  Array<{
    id: string;
    name: string;
    activeCases: number;
    resolvedCases: number;
  }>
> {
  const repsSnap = await getDocs(collection(db, 'representatives'));

  const results = await Promise.all(
    repsSnap.docs.map(async repDoc => {
      const repData = repDoc.data();
      const stats = await getRepDashboardStats(repData.userId);

      return {
        id: repDoc.id,
        name: repData.displayName,
        activeCases: stats.activeCases,
        resolvedCases: stats.resolvedCases
      };
    })
  );

  return results.sort((a, b) => a.activeCases - b.activeCases);
}

/**
 * ANTI-PATTERNS TO AVOID
 */

// ❌ DON'T: Use one-time fetch for dynamic data
export async function BAD_getActiveCases(handlerId: string) {
  const snapshot = await getDocs(collection(db, 'complaints'));
  return snapshot.docs
    .filter(doc => doc.data().handlerId === handlerId)
    .map(doc => ({ id: doc.id, ...doc.data() }));
}

// ❌ DON'T: Store denormalized arrays
export async function BAD_assignCaseToRep(
  complaintId: string,
  handlerId: string
) {
  // This gets stale and causes ghost data!
  const repRef = doc(db, 'representatives', handlerId);
  const repDoc = await getDocs(query(collection(db, 'representatives'), where('userId', '==', handlerId)));
  const existingCases = repDoc.docs[0]?.data().assignedCases || [];

  await updateDoc(repRef, {
    assignedCases: [...existingCases, complaintId] // ❌ This array becomes stale!
  });
}

// ❌ DON'T: Forget to filter deleted records
export async function BAD_getAllComplaints() {
  const q = query(collection(db, 'complaints'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
