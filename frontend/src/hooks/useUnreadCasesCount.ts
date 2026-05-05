/**
 * useUnreadCasesCount
 * Returns the total number of unread case-chat messages for the current user
 * by summing unreadCount[uid] across all their chat rooms.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService } from '../services/messageService';

export function useUnreadCasesCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setCount(0);
      return;
    }

    const unsub = MessageService.subscribeToUserChatRooms(user.uid, (rooms) => {
      const total = rooms.reduce((sum, room) => {
        // Only count rooms that have at least one real message (lastMessage exists).
        // This prevents phantom counts from auto-created but empty chat rooms.
        if (!room.lastMessage) return sum;
        const unread = room.unreadCount?.[user.uid] ?? 0;
        return sum + unread;
      }, 0);
      setCount(total);
    });

    return () => unsub();
  }, [user?.uid]);

  return count;
}
