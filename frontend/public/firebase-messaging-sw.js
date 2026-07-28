/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging service worker — background / killed PWA push.
 * Scope: /. Registered by fcmService.ts (works alongside next-pwa's sw.js).
 *
 * Keep firebaseConfig in sync with NEXT_PUBLIC_FIREBASE_* in .env.local
 */
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAgAOpKNbb8pDk1l32S5bV7hdir2uK0U5U',
  authDomain: 'speakupgc-2026.firebaseapp.com',
  projectId: 'speakupgc-2026',
  storageBucket: 'speakupgc-2026.firebasestorage.app',
  messagingSenderId: '389978822342',
  appId: '1:389978822342:web:0fef9ce1fef27ead7a69c7',
  measurementId: 'G-ZSN7N8QDW6',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'SpeakUp GC';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';
  const actionUrl = payload.data?.actionUrl || payload.fcmOptions?.link || '/notifications';
  const tag = payload.data?.notificationId || payload.data?.tag || 'speakup-gc';

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag,
    renotify: true,
    data: { actionUrl, ...payload.data },
    vibrate: [120, 60, 120],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.actionUrl || '/notifications';
  const url = new URL(target, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(url);
            } catch (_) {
              /* older browsers */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});
