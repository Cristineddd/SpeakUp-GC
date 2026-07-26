/**
 * useSystemSettings
 * Real-time system-wide settings (chatbot, maintenance mode, etc.)
 * controlled by admins from the Settings page.
 */

import { useState, useEffect } from 'react';
import {
  subscribeToSystemSettings,
  type SystemSettings,
} from '../services/systemSettingsService';

const DEFAULTS: SystemSettings = {
  chatbotEnabled: true,
  maintenanceMode: false,
};

export function useSystemSettings(): { settings: SystemSettings; loading: boolean } {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSystemSettings((next) => {
      setSettings(next);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { settings, loading };
}
