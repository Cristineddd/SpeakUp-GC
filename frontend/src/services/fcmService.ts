/**
 * FCM Web Push for SpeakUp GC PWA (mobile + desktop).
 * Saves device tokens under fcmTokens/{tokenHash} and refreshes on login.
 */
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '../firebase';
import { NotificationService } from './notificationService';
import {
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
} from '../utils/browserNotifications';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
const SW_PATH = '/firebase-messaging-sw.js';
/** FCM default scope — must NOT be '/' or it conflicts with the PWA service worker. */
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const TOKEN_STORAGE_KEY = 'speakup_fcm_token';

let messagingPromise: Promise<Messaging | null> | null = null;

function tokenDocId(token: string): string {
  // Firestore doc ids have length limits; keep stable & safe charset
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return `t_${Math.abs(hash)}_${token.slice(-12).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        if (!(await isSupported())) {
          console.warn('[FCM] Messaging not supported in this browser');
          return null;
        }
        return getMessaging(app);
      } catch (err) {
        console.warn('[FCM] Failed to init messaging', err);
        return null;
      }
    })();
  }
  return messagingPromise;
}

export async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE);
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH, { scope: FCM_SW_SCOPE });
  } catch (err) {
    console.warn('[FCM] SW registration failed', err);
    return null;
  }
}

export function hasSavedPushToken(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_KEY);
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    isBrowserNotificationSupported() &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Request permission, get FCM token, persist to Firestore for this user.
 */
export async function enablePushNotifications(userId: string): Promise<{
  ok: boolean;
  token?: string;
  reason?: string;
}> {
  if (!userId) return { ok: false, reason: 'Not signed in' };
  if (!isPushSupported()) return { ok: false, reason: 'Push not supported on this device' };
  if (!VAPID_KEY) {
    return {
      ok: false,
      reason:
        'Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY — generate a Web Push certificate in Firebase Console → Project settings → Cloud Messaging.',
    };
  }

  const permission = await requestBrowserNotificationPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'Permission denied' : 'Permission not granted' };
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return { ok: false, reason: 'Messaging unavailable' };

  const registration = await registerMessagingServiceWorker();
  if (!registration) return { ok: false, reason: 'Service worker failed' };

  // Wait until SW is active
  await navigator.serviceWorker.ready;

  let token: string;
  try {
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (err: any) {
    console.error('[FCM] getToken failed', err);
    return { ok: false, reason: err?.message || 'Could not get push token' };
  }

  if (!token) return { ok: false, reason: 'Empty FCM token' };

  try {
    await setDoc(
      doc(db, 'fcmTokens', tokenDocId(token)),
      {
        userId,
        token,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      },
      { merge: true }
    );
    localStorage.setItem(TOKEN_STORAGE_KEY, token);

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const email = userDoc.exists() ? (userDoc.data()?.email as string) : '';
      await NotificationService.updatePreferences(userId, email || '', { pushEnabled: true });
    } catch (prefErr) {
      console.warn('[FCM] Could not sync pushEnabled preference', prefErr);
    }
  } catch (err: any) {
    console.error('[FCM] Failed to save token', err);
    return { ok: false, reason: err?.message || 'Could not save token' };
  }

  return { ok: true, token };
}

export async function disablePushNotifications(userId?: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  if (token) {
    try {
      await deleteDoc(doc(db, 'fcmTokens', tokenDocId(token)));
    } catch (err) {
      console.warn('[FCM] Could not delete token doc', err);
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  void userId;
}

/** Foreground messages while the app is open (optional toast/native). */
export async function listenForForegroundPush(
  handler: (payload: { title: string; body: string; actionUrl?: string }) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    handler({
      title: payload.notification?.title || payload.data?.title || 'SpeakUp GC',
      body: payload.notification?.body || payload.data?.body || payload.data?.message || '',
      actionUrl: payload.data?.actionUrl,
    });
  });
}

/** Re-register token after login if permission already granted. */
export async function syncPushTokenIfGranted(userId: string): Promise<void> {
  if (!userId || !isPushSupported() || !VAPID_KEY) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  await enablePushNotifications(userId);
}
