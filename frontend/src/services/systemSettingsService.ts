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
import { db } from '../firebase';

const SYSTEM_SETTINGS_COLLECTION = 'systemSettings';
const GENERAL_SETTINGS_DOC = 'general';
const AUDIT_LOGS_COLLECTION = 'systemAuditLogs';

export interface SystemSettings {
  chatbotEnabled: boolean;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp | null;
}

const DEFAULT_SETTINGS: SystemSettings = {
  chatbotEnabled: true,
};

const settingsDocRef = () => doc(db, SYSTEM_SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);

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
    const data = snap.data();
    return {
      chatbotEnabled: data.chatbotEnabled ?? true,
      updatedBy: data.updatedBy,
      updatedByName: data.updatedByName,
      updatedAt: data.updatedAt ?? null,
    };
  } catch (error) {
    console.error('❌ Error fetching system settings:', error);
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
  return onSnapshot(
    settingsDocRef(),
    (snap) => {
      if (!snap.exists()) {
        callback({ ...DEFAULT_SETTINGS });
        return;
      }
      const data = snap.data();
      callback({
        chatbotEnabled: data.chatbotEnabled ?? true,
        updatedBy: data.updatedBy,
        updatedByName: data.updatedByName,
        updatedAt: data.updatedAt ?? null,
      });
    },
    (error) => {
      console.error('❌ Error subscribing to system settings:', error);
      // Fail open with defaults rather than breaking the caller
      callback({ ...DEFAULT_SETTINGS });
    }
  );
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
