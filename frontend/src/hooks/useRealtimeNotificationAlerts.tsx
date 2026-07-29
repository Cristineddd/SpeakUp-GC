import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { useNavigate } from '../compat/router';
import { NotificationService } from '../services/notificationService';
import type { Notification } from '../types/notification';
import { ToastAction } from '../components/ui/toast';
import {
  getBrowserNotificationPermission,
  showBrowserNotification,
  truncateNotificationMessage,
} from '../utils/browserNotifications';
import { hasSavedPushToken, isPushConfigured } from '../services/fcmService';

function shouldAlert(notif: Notification): boolean {
  return notif.status === 'unread';
}

function alertForNotification(
  notif: Notification,
  navigate: (path: string) => void,
  toast: ReturnType<typeof useToast>['toast']
): void {
  const description = truncateNotificationMessage(notif.message);
  const navigateToAction = () => {
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else {
      navigate('/notifications');
    }
  };

  const browserPermission = getBrowserNotificationPermission();
  const pushActive =
    isPushConfigured() && browserPermission === 'granted' && hasSavedPushToken();

  // When FCM push is enabled, the service worker handles lock-screen alerts.
  if (document.hidden && pushActive) {
    return;
  }

  const useNative = browserPermission === 'granted' && document.hidden;

  if (useNative) {
    showBrowserNotification(notif.title, {
      body: description,
      tag: notif.id,
      onClick: navigateToAction,
    });
    return;
  }

  toast({
    title: notif.title,
    description,
    action: notif.actionUrl ? (
      <ToastAction altText="View update" onClick={navigateToAction}>
        View
      </ToastAction>
    ) : undefined,
  });
}

/**
 * Listens for new Firestore notifications and surfaces them proactively.
 * Free — uses existing Firestore onSnapshot + browser Notification API.
 */
export function useRealtimeNotificationAlerts(enabled = true): void {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !currentUser?.uid) {
      seenIdsRef.current = new Set();
      initializedRef.current = false;
      return;
    }

    const unsubscribe = NotificationService.subscribeToNotifications(
      currentUser.uid,
      (notifications, meta) => {
        if (!initializedRef.current) {
          notifications.forEach((n) => seenIdsRef.current.add(n.id));
          if (!meta?.fromCache) {
            initializedRef.current = true;
          }
          return;
        }

        notifications.forEach((notif) => {
          if (seenIdsRef.current.has(notif.id) || !shouldAlert(notif)) {
            return;
          }

          seenIdsRef.current.add(notif.id);
          alertForNotification(notif, navigate, toast);
        });
      },
      { limit: 30 }
    );

    return () => {
      unsubscribe();
      seenIdsRef.current = new Set();
      initializedRef.current = false;
    };
  }, [currentUser?.uid, enabled, navigate, toast]);
}
