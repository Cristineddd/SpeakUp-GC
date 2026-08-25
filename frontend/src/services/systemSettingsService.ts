/**
 * System Settings Service
 * Manages global, admin-controlled feature toggles (e.g. AI chatbot enable/disable).
 *
 * Firestore layout:
 *   systemSettings/general -> { chatbotEnabled, updatedBy, updatedByName, updatedAt }
 *   systemAuditLogs/{id}   -> immutable log of every change made through this service
 */

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

const SYSTEM_SETTINGS_COLLECTION = 'systemSettings';
const GENERAL_SETTINGS_DOC = 'general';
const AUDIT_LOGS_COLLECTION = 'systemAuditLogs';

export interface SystemSettings {
  chatbotEnabled: boolean;
  maintenanceMode: boolean;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp | null;
}

const DEFAULT_SETTINGS: SystemSettings = {
  chatbotEnabled: true,
  maintenanceMode: false,
};

const settingsDocRef = () => doc(db, SYSTEM_SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);

function settingsFromSnap(data: Record<string, unknown> | undefined): SystemSettings {
  if (!data) return { ...DEFAULT_SETTINGS };
  return {
    chatbotEnabled: (data.chatbotEnabled as boolean | undefined) ?? true,
    maintenanceMode: (data.maintenanceMode as boolean | undefined) ?? false,
    updatedBy: data.updatedBy as string | undefined,
    updatedByName: data.updatedByName as string | undefined,
    updatedAt: (data.updatedAt as Timestamp | null | undefined) ?? null,
  };
}

/**
 * One-time fetch of the system settings document.
 * Falls back to defaults (chatbot enabled) if the document doesn't exist yet.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const snap = await getDoc(settingsDocRef());
    if (!snap.exists()) {
      return { ...DEFAULT_SETTINGS };
    }
    return settingsFromSnap(snap.data());
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'permission-denied') {
      console.warn('Error fetching system settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Real-time listener for system settings changes.
 * Used by both the admin Settings page and the complainant-side chatbot
 * so toggles apply instantly without a page refresh.
 */
export function subscribeToSystemSettings(
  callback: (settings: SystemSettings) => void
): Unsubscribe {
  let settingsUnsub: Unsubscribe | null = null;

  const listen = () => {
    settingsUnsub?.();
    settingsUnsub = onSnapshot(
      settingsDocRef(),
      (snap) => {
        callback(snap.exists() ? settingsFromSnap(snap.data()) : { ...DEFAULT_SETTINGS });
      },
      (error) => {
        const code = (error as { code?: string }).code;
        if (code !== 'permission-denied') {
          console.warn('System settings listener:', error);
        }
        callback({ ...DEFAULT_SETTINGS });
      }
    );
  };

  // Auth hydrates after first paint. Subscribing before that looks logged-out to
  // Firestore and Next.js surfaces the permission error in the overlay.
  const authUnsub = onAuthStateChanged(auth, (user) => {
    if (!user) {
      settingsUnsub?.();
      settingsUnsub = null;
      callback({ ...DEFAULT_SETTINGS });
      return;
    }
    listen();
  });

  return () => {
    authUnsub();
    settingsUnsub?.();
  };
}

/**
 * Toggle the AI chatbot feature on/off. Admin-only (enforced by Firestore rules).
 * Records the change in the immutable systemAuditLogs collection for accountability.
 */
export async function setChatbotEnabled(
  enabled: boolean,
  adminId: string,
  adminName: string
): Promise<void> {
  const previous = await getSystemSettings();

  await setDoc(
    settingsDocRef(),
    {
      chatbotEnabled: enabled,
      updatedBy: adminId,
      updatedByName: adminName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
    settingKey: 'chatbotEnabled',
    oldValue: previous.chatbotEnabled,
    newValue: enabled,
    changedBy: adminId,
    changedByName: adminName,
    timestamp: serverTimestamp(),
  });
}

/**
 * Toggle maintenance mode on/off. Admin-only (enforced by Firestore rules).
 * When enabled, non-admin/non-staff users are blocked from protected routes.
 */
export async function setMaintenanceMode(
  enabled: boolean,
  adminId: string,
  adminName: string
): Promise<void> {
  const previous = await getSystemSettings();

  await setDoc(
    settingsDocRef(),
    {
      maintenanceMode: enabled,
      updatedBy: adminId,
      updatedByName: adminName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
    settingKey: 'maintenanceMode',
    oldValue: previous.maintenanceMode,
    newValue: enabled,
    changedBy: adminId,
    changedByName: adminName,
    timestamp: serverTimestamp(),
  });
}
