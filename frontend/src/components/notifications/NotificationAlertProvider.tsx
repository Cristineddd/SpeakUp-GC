'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useRealtimeNotificationAlerts } from '../../hooks/useRealtimeNotificationAlerts';
import {
  dismissNotificationPrompt,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
  wasNotificationPromptDismissed,
} from '../../utils/browserNotifications';

/**
 * Mount inside protected routes. Enables free proactive alerts:
 * - In-app toast when a new notification arrives (tab open)
 * - OS/browser notification when permission granted (tab in background)
 */
export function NotificationAlertProvider({ children }: { children: React.ReactNode }) {
  useRealtimeNotificationAlerts(true);

  const [showPrompt, setShowPrompt] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isBrowserNotificationSupported()) return;

    const permission = getBrowserNotificationPermission();
    if (permission === 'granted' || permission === 'denied') return;
    if (wasNotificationPromptDismissed()) return;

    const timer = window.setTimeout(() => setShowPrompt(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const result = await requestBrowserNotificationPermission();
      if (result === 'granted' || result === 'denied') {
        dismissNotificationPrompt();
        setShowPrompt(false);
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    dismissNotificationPrompt();
    setShowPrompt(false);
  };

  return (
    <>
      {children}

      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-[9998] mx-auto max-w-md sm:left-auto sm:right-6">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Bell className="h-5 w-5 text-[#1D9E75]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Get case updates instantly</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Allow notifications to know when your case status changes — free, no email needed.
                Works while SpeakUp GC is open in your browser.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 bg-[#1D9E75] text-white hover:bg-[#178F65]"
                  onClick={handleEnable}
                  disabled={requesting}
                >
                  {requesting ? 'Enabling...' : 'Enable notifications'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={handleDismiss}>
                  Not now
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
