/**
 * Tracks unread updates per case (chat messages + notifications).
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService } from '../services/messageService';
import { NotificationService } from '../services/notificationService';

export function useCaseUnreadByComplaintId() {
  const { user } = useAuth();
  const [messageUnread, setMessageUnread] = useState<Record<string, number>>({});
  const [notificationUnread, setNotificationUnread] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user?.uid) {
      setMessageUnread({});
      setNotificationUnread({});
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
    });

    const unsubNotifications = NotificationService.subscribeToNotifications(
      user.uid,
      (notifications) => {
        const map: Record<string, number> = {};

        notifications
          .filter((notification) => notification.status === 'unread' && notification.complaintId)
          .forEach((notification) => {
            const complaintId = notification.complaintId as string;
            map[complaintId] = (map[complaintId] || 0) + 1;
          });

        setNotificationUnread(map);
      },
      { unreadOnly: true }
    );

    return () => {
      unsubMessages();
      unsubNotifications();
    };
  }, [user?.uid]);

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
  };
}
