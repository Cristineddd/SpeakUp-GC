import { firestore } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { getFromAddress, getResendClient } from './lib/resend';
import { buildCaseNotificationEmail } from './lib/notificationEmailTemplates';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const EMAIL_SUPPRESSED_TYPES = new Set([
  'new_message',
  'message_read',
  'new_comment',
]);

/** Push is useful for messages too; only skip pure read receipts. */
const PUSH_SUPPRESSED_TYPES = new Set([
  'message_read',
]);

interface NotificationDoc {
  userId: string;
  type: string;
  title: string;
  message: string;
  complaintId?: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  createdAt?: admin.firestore.Timestamp;
}

function isInQuietHours(currentTime: string, start: string, end: string): boolean {
  if (start < end) {
    return currentTime >= start && currentTime <= end;
  }
  return currentTime >= start || currentTime <= end;
}

async function shouldSendEmail(userId: string, type: string): Promise<boolean> {
  if (EMAIL_SUPPRESSED_TYPES.has(type)) {
    return false;
  }

  const prefsDoc = await db.collection('notificationPreferences').doc(userId).get();

  if (prefsDoc.exists) {
    const prefs = prefsDoc.data();
    if (prefs?.inAppEnabled === false && prefs?.emailEnabled === false) {
      return false;
    }
    if (prefs?.emailEnabled === false) {
      return false;
    }
    if (prefs?.emailDigest && prefs.emailDigest !== 'immediate') {
      return false;
    }
    if (prefs?.preferences && prefs.preferences[type] === false) {
      return false;
    }
    if (prefs?.quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (isInQuietHours(currentTime, prefs.quietHoursStart, prefs.quietHoursEnd)) {
        return false;
      }
    }
    return true;
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;

  const pref = userDoc.data()?.notificationPreference ?? 'both';
  return pref === 'email' || pref === 'both';
}

async function shouldSendPush(userId: string, type: string): Promise<boolean> {
  if (PUSH_SUPPRESSED_TYPES.has(type)) {
    return false;
  }

  const prefsDoc = await db.collection('notificationPreferences').doc(userId).get();
  if (prefsDoc.exists) {
    const prefs = prefsDoc.data();
    if (prefs?.pushEnabled === false) return false;
    if (prefs?.inAppEnabled === false && prefs?.pushEnabled !== true) {
      // Legacy prefs without pushEnabled — still allow push if in-app isn't explicitly off-only weirdness
    }
    if (prefs?.preferences && prefs.preferences[type] === false) {
      return false;
    }
    if (prefs?.quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (isInQuietHours(currentTime, prefs.quietHoursStart, prefs.quietHoursEnd)) {
        return false;
      }
    }
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;

  const pref = userDoc.data()?.notificationPreference ?? 'both';
  // Push counts as "in-app" channel for preference purposes
  return pref === 'in-app' || pref === 'both';
}

async function resolveFormattedCaseId(complaintId?: string): Promise<string> {
  if (!complaintId) return 'N/A';

  for (const collectionName of ['complaints', 'reports']) {
    const snap = await db.collection(collectionName).doc(complaintId).get();
    if (snap.exists) {
      const data = snap.data();
      return (data?.caseId as string) || complaintId;
    }
  }

  return complaintId;
}

async function sendPushToUser(
  userId: string,
  notificationId: string,
  data: NotificationDoc
): Promise<number> {
  const tokenSnap = await db.collection('fcmTokens').where('userId', '==', userId).get();
  if (tokenSnap.empty) {
    console.log(`[onNotificationCreated] No FCM tokens for user ${userId}`);
    return 0;
  }

  const tokens: string[] = [];
  const tokenDocs: admin.firestore.QueryDocumentSnapshot[] = [];
  tokenSnap.forEach((docSnap) => {
    const token = docSnap.data()?.token as string | undefined;
    if (token) {
      tokens.push(token);
      tokenDocs.push(docSnap);
    }
  });

  if (tokens.length === 0) return 0;

  const actionUrl = data.actionUrl || '/notifications';
  const absoluteActionUrl = actionUrl.startsWith('http')
    ? actionUrl
    : `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://speak-up-gc-2026.vercel.app'}${actionUrl.startsWith('/') ? actionUrl : `/${actionUrl}`}`;

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: data.title,
      body: data.message,
    },
    data: {
      title: data.title,
      body: data.message,
      message: data.message,
      type: data.type,
      actionUrl: absoluteActionUrl,
      notificationId,
      complaintId: data.complaintId || '',
    },
    webpush: {
      fcmOptions: {
        link: absoluteActionUrl,
      },
      notification: {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      },
    },
  });

  // Drop invalid tokens
  const stale: Promise<admin.firestore.WriteResult>[] = [];
  response.responses.forEach((res, idx) => {
    if (res.success) return;
    const code = res.error?.code || '';
    if (
      code.includes('registration-token-not-registered') ||
      code.includes('invalid-registration-token') ||
      code.includes('invalid-argument')
    ) {
      stale.push(tokenDocs[idx].ref.delete());
    } else {
      console.warn(`[onNotificationCreated] FCM error for token ${idx}:`, res.error?.message);
    }
  });
  if (stale.length) {
    await Promise.allSettled(stale);
  }

  console.log(
    `[onNotificationCreated] Push sent to ${response.successCount}/${tokens.length} devices for ${userId}`
  );
  return response.successCount;
}

export const onNotificationCreated = firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap) => {
    const data = snap.data() as NotificationDoc;
    const { userId, type, title, message } = data;
    const notificationId = snap.id;

    if (!userId || !type || !title || !message) {
      console.warn('[onNotificationCreated] Missing required notification fields.');
      return null;
    }

    // ── 1) PWA / mobile push (independent of email) ─────────────────────────
    try {
      if (await shouldSendPush(userId, type)) {
        await sendPushToUser(userId, notificationId, data);
      } else {
        console.log(`[onNotificationCreated] Push skipped for user ${userId}, type ${type}`);
      }
    } catch (error) {
      console.error('[onNotificationCreated] Push failed:', error);
    }

    // ── 2) Email via Resend ─────────────────────────────────────────────────
    const emailAllowed = await shouldSendEmail(userId, type);
    if (!emailAllowed) {
      console.log(`[onNotificationCreated] Email skipped for user ${userId}, type ${type}`);
      return null;
    }

    const resend = getResendClient();
    if (!resend) {
      return null;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.warn(`[onNotificationCreated] User ${userId} not found.`);
      return null;
    }

    const email = userDoc.data()?.email as string | undefined;
    const toName = (userDoc.data()?.name as string | undefined) || email;
    if (!email) {
      console.warn(`[onNotificationCreated] No email for user ${userId}.`);
      return null;
    }

    const formattedCaseId = await resolveFormattedCaseId(data.complaintId);
    const createdAt = data.createdAt?.toDate?.() || new Date();
    const dateStr = createdAt.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const isSubmission = type === 'complaint_created';
    const statusLabel =
      (data.data?.status as string | undefined) ||
      (data.data?.newStatus as string | undefined) ||
      title;

    const { subject, html } = buildCaseNotificationEmail({
      toName: toName || 'there',
      title,
      message,
      caseId: formattedCaseId,
      dateStr,
      isSubmission,
      statusLabel,
      actionUrl: data.actionUrl,
    });

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: email,
        subject,
        html,
      });

      console.log(`[onNotificationCreated] Email sent to ${email}:`, result.data?.id);
      return result.data?.id ?? null;
    } catch (error) {
      console.error('[onNotificationCreated] Failed to send email:', error);
      return null;
    }
  });
