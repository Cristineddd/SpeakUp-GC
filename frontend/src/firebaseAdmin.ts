import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

let app: App;

function initAdminApp(): App {
  if (getApps().length) {
    return getApps()[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY for Admin SDK'
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

try {
  app = initAdminApp();
} catch {
  // Lazy — routes that need admin will throw a clearer error on use
  app = undefined as unknown as App;
}

export function getAdminApp(): App {
  if (!app) {
    app = initAdminApp();
  }
  return app;
}

export const adminDb = (() => {
  try {
    return getFirestore(getAdminApp());
  } catch {
    return null as unknown as ReturnType<typeof getFirestore>;
  }
})();

export function getAdminMessaging() {
  return getMessaging(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
