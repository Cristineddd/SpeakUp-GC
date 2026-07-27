/**
 * Tracks unread updates per case (chat messages + notifications).
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService } from '../services/messageService';
import { NotificationService } from '../services/notificationService';
import type { Notification, NotificationType } from '../types/notification';

/** Notifications that should NOT light up the case card (e.g. own submission confirmation). */
const CASE_CARD_EXCLUDED_NOTIFICATION_TYPES = new Set<NotificationType>([
  'complaint_created',
  'message_read',
  'system_announcement',
  'maintenance_scheduled',
  'account_updated',
]);

const INITIAL_STATUS_VALUES = new Set(['pending', 'submitted']);

function isActionableCaseNotification(notification: Notification): boolean {
  if (CASE_CARD_EXCLUDED_NOTIFICATION_TYPES.has(notification.type)) return false;

  if (notification.type === 'status_update') {
    const status = String(notification.data?.status || '').toLowerCase();
    if (INITIAL_STATUS_VALUES.has(status)) return false;
  }

  return true;
}

export function useCaseUnreadByComplaintId() {
  const { user } = useAuth();
  const [messageUnread, setMessageUnread] = useState<Record<string, number>>({});
  const [notificationUnread, setNotificationUnread] = useState<Record<string, number>>({});
  const [listenersReady, setListenersReady] = useState({ messages: false, notifications: false });

  useEffect(() => {
    if (!user?.uid) {
      setMessageUnread({});
      setNotificationUnread({});
      setListenersReady({ messages: false, notifications: false });
      return;
    }

    let serverSnapshots = 0;
    const cancelReadyFallback = () => {
      window.clearTimeout(readyFallback);
    };

    // Offline fallback: if only cached snapshots arrive, still unlock after a short wait.
    const readyFallback = window.setTimeout(() => {
      setListenersReady({ messages: true, notifications: true });
    }, 2500);

    const markMessagesReady = () => {
      setListenersReady((prev) => ({ ...prev, messages: true }));
    };

    const markNotificationsReady = () => {
      setListenersReady((prev) => ({ ...prev, notifications: true }));
    };

    const onServerSnapshot = (markReady: () => void) => {
      markReady();
      serverSnapshots += 1;
      if (serverSnapshots >= 2) {
        cancelReadyFallback();
      }
    };

    const unsubMessages = MessageService.subscribeToUserChatRooms(user.uid, (rooms, meta) => {
      const map: Record<string, number> = {};

      rooms.forEach((room) => {
        if (!room.complaintId || !room.lastMessage) return;
        const unread = room.unreadCount?.[user.uid] ?? 0;
        if (unread <= 0) return;
        map[room.complaintId] = (map[room.complaintId] || 0) + unread;
      });

      setMessageUnread(map);
      if (!meta?.fromCache) {
        onServerSnapshot(markMessagesReady);
      }
    });

    const unsubNotifications = NotificationService.subscribeToNotifications(
      user.uid,
      (notifications, meta) => {
        const map: Record<string, number> = {};

        notifications
          .filter(
            (notification) =>
              notification.status === 'unread' &&
              notification.complaintId &&
              isActionableCaseNotification(notification)
          )
          .forEach((notification) => {
            const complaintId = notification.complaintId as string;
            map[complaintId] = (map[complaintId] || 0) + 1;
          });

        setNotificationUnread(map);
        if (!meta?.fromCache) {
          onServerSnapshot(markNotificationsReady);
        }
      },
      { unreadOnly: true }
    );

    return () => {
      cancelReadyFallback();
      unsubMessages();
      unsubNotifications();
    };
  }, [user?.uid]);

  const isReady = listenersReady.messages && listenersReady.notifications;

  const byComplaintId = useMemo(() => {
    const merged: Record<string, number> = { ...notificationUnread };

    for (const [complaintId, count] of Object.entries(messageUnread)) {
      merged[complaintId] = (merged[complaintId] || 0) + count;
    }

    return merged;
  }, [messageUnread, notificationUnread]);

  const totalUnread = useMemo(
    () => Object.values(byComplaintId).reduce((sum, count) => sum + count, 0),
    [byComplaintId]
  );

  return {
    byComplaintId,
    messageUnread,
    notificationUnread,
    totalUnread,
    isReady,
  };
}
