'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, Smartphone } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeNotificationAlerts } from '../../hooks/useRealtimeNotificationAlerts';
import { useToast } from '../../hooks/use-toast';
import {
  dismissNotificationPrompt,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  wasNotificationPromptDismissed,
} from '../../utils/browserNotifications';
import {
  enablePushNotifications,
  isPushConfigured,
  isPushSupported,
  listenForForegroundPush,
  syncPushTokenIfGranted,
} from '../../services/fcmService';

/**
 * Mount inside protected routes.
 * - In-app toast when Firestore notification arrives (tab open)
 * - FCM / PWA push when app is backgrounded or closed (mobile install)
 */
export function NotificationAlertProvider({
  children,
  showPermissionPrompt = true,
}: {
  children: React.ReactNode;
  showPermissionPrompt?: boolean;
}) {
  useRealtimeNotificationAlerts(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [showPrompt, setShowPrompt] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Re-sync FCM token after login when permission already granted
  useEffect(() => {
    if (!currentUser?.uid) return;
    void syncPushTokenIfGranted(currentUser.uid);
  }, [currentUser?.uid]);

  // Foreground FCM → toast + optional native notification
  useEffect(() => {
    if (!currentUser?.uid) return;
    let unsubscribe = () => {};
    void listenForForegroundPush(({ title, body }) => {
      // Background/lock-screen pushes are handled by firebase-messaging-sw.js only.
      if (document.hidden) return;
      toast({
        title,
        description: body,
      });
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe();
  }, [currentUser?.uid, toast]);

  useEffect(() => {
    if (!showPermissionPrompt) return;
    if (!isBrowserNotificationSupported() && !isPushSupported()) return;

    const permission = getBrowserNotificationPermission();
    if (permission === 'granted' || permission === 'denied') return;
    if (wasNotificationPromptDismissed()) return;

    const timer = window.setTimeout(() => setShowPrompt(true), 2000);
    return () => window.clearTimeout(timer);
  }, [showPermissionPrompt]);

  const handleEnable = async () => {
    if (!currentUser?.uid) return;
    setRequesting(true);
    try {
      const result = await enablePushNotifications(currentUser.uid);
      if (result.ok) {
        dismissNotificationPrompt();
        setShowPrompt(false);
        toast({
          title: 'Push notifications enabled',
          description: 'You will get alerts on this device even when SpeakUp GC is closed.',
        });
      } else if (result.reason === 'Permission denied') {
        dismissNotificationPrompt();
        setShowPrompt(false);
        toast({
          title: 'Notifications blocked',
          description: 'Enable notifications in your browser or phone settings to receive case updates.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Could not enable push',
          description: result.reason || 'Try again, or install SpeakUp GC as an app on your phone.',
          variant: 'destructive',
        });
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
              {isPushSupported() ? (
                <Smartphone className="h-5 w-5 text-[#1D9E75]" />
              ) : (
                <Bell className="h-5 w-5 text-[#1D9E75]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Enable mobile push alerts</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Get case updates on your lock screen — even when SpeakUp GC is closed.
                {isPushSupported()
                  ? ' Best on installed PWA (Add to Home Screen).'
                  : ' Your browser may only support alerts while the site is open.'}
                {!isPushConfigured() ? ' (Admin: add VAPID key to finish setup.)' : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 bg-[#1D9E75] text-white hover:bg-[#178F65]"
                  onClick={handleEnable}
                  disabled={requesting}
                >
                  {requesting ? 'Enabling...' : 'Enable push'}
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
