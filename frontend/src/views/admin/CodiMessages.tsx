import React, { useEffect, useState } from 'react';
import { useNavigate } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { MessageService } from '../../services/messageService';
import type { ChatRoom } from '../../types/message';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  MessageSquare,
  Clock,
  Loader2,
  ChevronRight,
  User,
  Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function safeToDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return isNaN(value.getTime()) ? new Date() : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return new Date();
    }
  }
  const parsed = new Date(value as string);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function CodiMessages() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 6000);

    let unsub = () => {};

    (async () => {
      try {
        await MessageService.cleanupOrphanedChatRoomsForParticipant(currentUser.uid);
        await MessageService.syncClosedComplaintChatRooms(currentUser.uid);
        await MessageService.dedupeChatRoomsForUser(currentUser.uid);
      } catch (error) {
        console.warn('Could not clean chat rooms:', error);
      }

      unsub = MessageService.subscribeToUserChatRooms(currentUser.uid, (rooms) => {
        setChatRooms(rooms);
        setLoading(false);
        clearTimeout(timeout);
      });
    })();

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [currentUser?.uid]);

  const getComplainantName = (room: ChatRoom) => {
    if (!currentUser) return 'Complainant';
    const otherId = room.participantIds.find((id) => id !== currentUser.uid);
    if (!otherId) return room.complainantName || 'Complainant';
    return room.participants[otherId]?.name || room.complainantName || 'Complainant';
  };

  const totalUnread = chatRooms.reduce(
    (sum, room) => sum + (room.unreadCount?.[currentUser?.uid || ''] || 0),
    0
  );

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Inbox</p>
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Conversations with complainants on your assigned cases.
          </p>
        </div>
        {totalUnread > 0 && (
          <Badge className="bg-[#1D9E75] text-white w-fit">
            {totalUnread} unread
          </Badge>
        )}
      </div>

      <div className="max-w-3xl bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#1D9E75]" />
          <h2 className="text-base font-semibold text-gray-900">Case Conversations</h2>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#1D9E75]" />
              <span className="text-sm text-gray-500">Loading conversations…</span>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 mb-1">No Messages Yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                Conversations appear here once you take a case and the complainant sends a message.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/reports')}
                className="border-[#1D9E75]/30 text-[#1D9E75] hover:bg-green-50"
              >
                Go to Case Queue
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {chatRooms.map((room) => {
                const unread = room.unreadCount?.[currentUser?.uid || ''] || 0;
                const complainantName = getComplainantName(room);
                const lastMsg = room.lastMessage;
                const updatedAt = safeToDate(room.updatedAt);

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => navigate(`/case-chat/${room.complaintId}`)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#1D9E75]/40 hover:bg-green-50/50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm text-gray-900 truncate">
                              {room.complaintTitle || 'Case Chat'}
                            </span>
                            {!room.isActive && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 shrink-0">
                                Closed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {unread > 0 && (
                              <Badge className="bg-[#1D9E75] text-white text-xs">
                                {unread > 9 ? '9+' : unread}
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#1D9E75] transition-colors" />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-500">{complainantName}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(updatedAt, { addSuffix: true })}
                          </span>
                        </div>

                        {lastMsg && (
                          <p className="text-sm text-gray-600 mt-1 truncate">
                            {lastMsg.content || 'Attachment'}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
