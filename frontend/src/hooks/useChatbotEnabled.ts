/**
 * useChatbotEnabled
 * Real-time flag for whether the AI chatbot (Laya) feature is currently
 * enabled, controlled by admins from the Settings page. Defaults to `true`
 * (enabled) until the first snapshot arrives, matching the system's default.
 */

import { useState, useEffect } from 'react';
import { subscribeToSystemSettings } from '../services/systemSettingsService';

export function useChatbotEnabled(): { chatbotEnabled: boolean; loading: boolean } {
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSystemSettings((settings) => {
      setChatbotEnabled(settings.chatbotEnabled);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { chatbotEnabled, loading };
}
