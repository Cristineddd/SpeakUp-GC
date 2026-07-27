/**
 * Tracks unread updates per case (chat messages + notifications).
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService } from '../services/messageService';
import { NotificationService } from '../services/notificationService';
import type { NotificationType } from '../types/notification';

/** Notifications that should NOT light up the case card (e.g. own submission confirmation). */
const CASE_CARD_EXCLUDED_NOTIFICATION_TYPES = new Set<NotificationType>([
  'complaint_created',
  'message_read',
  'system_announcement',
  'maintenance_scheduled',
  'account_updated',
]);

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

    const unsubMessages = MessageService.subscribeToUserChatRooms(user.uid, (rooms) => {
      const map: Record<string, number> = {};

      rooms.forEach((room) => {
        if (!room.complaintId || !room.lastMessage) return;
        const unread = room.unreadCount?.[user.uid] ?? 0;
        if (unread <= 0) return;
        map[room.complaintId] = (map[room.complaintId] || 0) + unread;
      });

      setMessageUnread(map);
      setListenersReady((prev) => ({ ...prev, messages: true }));
    });

    const unsubNotifications = NotificationService.subscribeToNotifications(
      user.uid,
      (notifications) => {
        const map: Record<string, number> = {};

        notifications
          .filter(
            (notification) =>
              notification.status === 'unread' &&
              notification.complaintId &&
              !CASE_CARD_EXCLUDED_NOTIFICATION_TYPES.has(notification.type)
          )
          .forEach((notification) => {
            const complaintId = notification.complaintId as string;
            map[complaintId] = (map[complaintId] || 0) + 1;
          });

        setNotificationUnread(map);
        setListenersReady((prev) => ({ ...prev, notifications: true }));
      },
      { unreadOnly: true }
    );

    return () => {
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
