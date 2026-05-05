/**
 * GroupChats – main page
 * Split layout: left sidebar with group list, right with active chat
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GroupChatService } from '../services/groupChatService';
import type {
  GroupChat,
  GroupMessage,
  GroupCategory,
  TypingIndicator,
} from '../types/groupChat';
import {
  GROUP_CATEGORY_LABELS,
  GROUP_CATEGORY_COLORS,
} from '../types/groupChat';
import { Timestamp } from 'firebase/firestore';
import { format, isToday, isYesterday } from 'date-fns';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  MessageSquare,
  Plus,
  Send,
  Search,
  Users,
  Hash,
  Pin,
  Trash2,
  MoreVertical,
  Smile,
  EyeOff,
  Eye,
  ChevronLeft,
  Settings,
  UserPlus,
  LogOut,
  Crown,
  Shield,
  Circle,
  Reply,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Link } from '../compat/router';

/* ──────────── Helpers ──────────── */

function tsToDate(ts: Timestamp | string | undefined): Date {
  if (!ts) return new Date(0);
  if (ts instanceof Timestamp) return ts.toDate();
  return new Date(ts);
}

function formatMessageTime(ts: Timestamp | string | undefined): string {
  const d = tsToDate(ts);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a');
  return format(d, 'MMM d, h:mm a');
}

function formatGroupTime(ts: Timestamp | string | undefined): string {
  const d = tsToDate(ts);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

/* ──────────── Component ──────────── */

const GroupChats: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Groups state
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);

  // Create group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState<GroupCategory>('general');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userId = currentUser?.uid || '';
  const displayName = currentUser?.displayName || currentUser?.email || 'User';
  const isAdmin = (currentUser as any)?.isAdmin || false;

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ─── Subscribe to groups ─── */
  useEffect(() => {
    if (!userId) return;
    const unsub = GroupChatService.subscribeToUserGroups(userId, setGroups);

    // Set online presence
    GroupChatService.setPresence(userId, displayName, true);

    return () => {
      unsub();
      GroupChatService.setPresence(userId, displayName, false);
    };
  }, [userId, displayName]);

  /* ─── Subscribe to messages for active group ─── */
  useEffect(() => {
    if (!activeGroupId || !userId) return;

    const unsubMsg = GroupChatService.subscribeToMessages(activeGroupId, (msgs) => {
      setMessages(msgs);
      // Mark as read
      GroupChatService.markAsRead(activeGroupId, userId);
    });

    const unsubTyping = GroupChatService.subscribeToTyping(
      activeGroupId,
      userId,
      setTypingUsers
    );

    return () => {
      unsubMsg();
      unsubTyping();
      // Stop typing when leaving
      GroupChatService.setTyping(activeGroupId, userId, displayName, false);
    };
  }, [activeGroupId, userId, displayName]);

  /* ─── Subscribe to presence of active group members ─── */
  useEffect(() => {
    if (!activeGroup) return;
    const unsub = GroupChatService.subscribeToPresence(
      activeGroup.memberIds,
      setPresenceMap
    );
    return unsub;
  }, [activeGroup?.id, activeGroup?.memberIds.length]);

  /* ─── Auto-scroll ─── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ─── Handlers ─── */

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const group = await GroupChatService.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        category: newGroupCategory,
        createdBy: userId,
        createdByName: displayName,
      });
      setActiveGroupId(group.id);
      setShowCreateDialog(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupCategory('general');
      toast({ title: 'Group created!', description: `"${group.name}" is ready.` });
    } catch (err) {
      console.error('Create group error:', err);
      toast({ title: 'Error', description: 'Failed to create group.', variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeGroupId || !activeGroup) return;

    const memberInfo = activeGroup.members?.[userId];
    const role = memberInfo?.role || 'member';

    try {
      await GroupChatService.sendMessage({
        groupId: activeGroupId,
        senderId: userId,
        senderName: displayName,
        senderRole: role as any,
        content: input.trim(),
        isAnonymous,
        replyTo: replyTo?.id,
        replyToContent: replyTo?.content?.substring(0, 80),
        replyToSenderName: replyTo?.senderName,
      });
      setInput('');
      setReplyTo(null);
      GroupChatService.setTyping(activeGroupId, userId, displayName, false);
    } catch (err) {
      console.error('Send error:', err);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Typing indicator
    if (activeGroupId) {
      GroupChatService.setTyping(activeGroupId, userId, displayName, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        GroupChatService.setTyping(activeGroupId, userId, displayName, false);
      }, 3000);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await GroupChatService.deleteMessage(msgId, userId);
    } catch {
      toast({ title: 'Error', description: 'Cannot delete message.', variant: 'destructive' });
    }
  };

  const handlePinMessage = async (msgId: string, isPinned: boolean) => {
    if (!activeGroupId) return;
    try {
      await GroupChatService.togglePinMessage(activeGroupId, msgId, !isPinned, userId);
    } catch {
      toast({ title: 'Error', description: 'Cannot pin message.', variant: 'destructive' });
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    try {
      await GroupChatService.toggleReaction(msgId, emoji, userId);
    } catch {
      // silent
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroupId) return;
    try {
      await GroupChatService.leaveGroup(activeGroupId, userId, displayName);
      setActiveGroupId(null);
      toast({ title: 'Left group' });
    } catch {
      toast({ title: 'Error', description: 'Cannot leave group.', variant: 'destructive' });
    }
  };

  const selectGroup = (gId: string) => {
    setActiveGroupId(gId);
    setShowMobileChat(true);
    setMessages([]);
  };

  const canModerate = (group: GroupChat | null) => {
    if (!group) return false;
    return group.adminIds?.includes(userId) || isAdmin;
  };

  const onlineMemberCount = activeGroup
    ? activeGroup.memberIds.filter((id) => presenceMap[id]).length
    : 0;

  /* ──────────── Render ──────────── */
  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden bg-background">
      {/* ── LEFT: Group List Sidebar ── */}
      <aside
        className={`$${
          showMobileChat ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Group Chats
          </h2>
          <div className="flex items-center gap-2">
            <Link to="/browse-groups">
              <Button size="sm" variant="outline">
                <Search className="h-4 w-4 mr-1" /> Browse
              </Button>
            </Link>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups…"
              className="pl-9"
            />
          </div>
        </div>

        {/* Group list */}
        <ScrollArea className="flex-1">
          {filteredGroups.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No groups yet</p>
              <p className="text-sm mt-1">Create one or browse existing groups!</p>
              <Link
                to="/browse-groups"
                className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
              >
                <Users className="h-4 w-4" /> Browse Groups
              </Link>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const unread = group.unreadCount?.[userId] || 0;
              const isActive = group.id === activeGroupId;
              return (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors ${
                    isActive ? 'bg-accent/50 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      <Hash className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {group.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatGroupTime(group.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            GROUP_CATEGORY_COLORS[group.category] || GROUP_CATEGORY_COLORS.general
                          }`}
                        >
                          {GROUP_CATEGORY_LABELS[group.category] || '💬'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {group.memberCount || group.memberIds.length} members
                        </span>
                      </div>
                      {group.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {group.lastMessage}
                        </p>
                      )}
                    </div>
                    {unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                        {unread}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </aside>

      {/* ── RIGHT: Chat Area ── */}
      <main
        className={`${
          showMobileChat ? 'flex' : 'hidden md:flex'
        } flex-col flex-1 bg-background`}
      >
        {!activeGroup ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <MessageSquare className="h-20 w-20 mb-4 opacity-20" />
            <h3 className="text-xl font-semibold mb-2">Welcome to SpeakUp GC</h3>
            <p className="text-center max-w-md">
              Select a group chat from the sidebar to start a conversation, or create a new group to
              speak up and collaborate with your community.
            </p>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create a Group
              </Button>
              <Link to="/browse-groups">
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" /> Browse Groups
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button
                className="md:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setShowMobileChat(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                <Hash className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground truncate">{activeGroup.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeGroup.memberCount || activeGroup.memberIds.length} members
                  {onlineMemberCount > 0 && ` · ${onlineMemberCount} online`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                      <Users className="h-4 w-4 mr-2" /> {activeGroup.memberCount} Members
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {canModerate(activeGroup) && (
                      <DropdownMenuItem
                        onClick={() =>
                          toast({ title: 'Group Settings', description: 'Coming soon!' })
                        }
                      >
                        <Settings className="h-4 w-4 mr-2" /> Group Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLeaveGroup} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Leave Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-1 max-w-3xl mx-auto">
                {messages.map((msg) => {
                  const isMine = msg.senderId === userId;
                  const isSystem = msg.type === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`group flex gap-2 py-1 ${
                        isMine ? 'flex-row-reverse' : 'flex-row'
                      } animate-fadeIn`}
                    >
                      {/* Avatar */}
                      {!isMine && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold mt-1">
                          {msg.isAnonymous ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            msg.senderName.charAt(0).toUpperCase()
                          )}
                        </div>
                      )}

                      <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                        {/* Sender name */}
                        {!isMine && (
                          <div className="flex items-center gap-1 mb-0.5 px-1">
                            <span className="text-xs font-semibold text-foreground/80">
                              {msg.isAnonymous ? 'Anonymous' : msg.senderName}
                            </span>
                            {msg.senderRole === 'admin' && (
                              <Crown className="h-3 w-3 text-amber-500" />
                            )}
                            {msg.senderRole === 'moderator' && (
                              <Shield className="h-3 w-3 text-blue-500" />
                            )}
                            {msg.isAnonymous && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">
                                anon
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Reply context */}
                        {msg.replyTo && msg.replyToContent && (
                          <div
                            className={`text-xs px-3 py-1 mb-1 rounded border-l-2 border-primary/50 bg-muted/50 text-muted-foreground truncate ${
                              isMine ? 'ml-auto' : ''
                            }`}
                          >
                            <span className="font-medium">{msg.replyToSenderName}</span>:{' '}
                            {msg.replyToContent}
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={`relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            msg.isDeleted
                              ? 'bg-muted text-muted-foreground italic'
                              : isMine
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md'
                          } ${msg.isPinned ? 'ring-2 ring-amber-400/50' : ''}`}
                        >
                          {msg.isPinned && (
                            <Pin className="absolute -top-2 -right-2 h-3.5 w-3.5 text-amber-500" />
                          )}
                          {msg.content}
                        </div>

                        {/* Reactions */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 px-1">
                            {Object.entries(msg.reactions).map(([emoji, userIds]) =>
                              userIds.length > 0 ? (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                                    userIds.includes(userId)
                                      ? 'border-primary bg-primary/10'
                                      : 'border-border bg-muted/50 hover:bg-muted'
                                  }`}
                                >
                                  {emoji} {userIds.length}
                                </button>
                              ) : null
                            )}
                          </div>
                        )}

                        {/* Timestamp + actions */}
                        <div
                          className={`flex items-center gap-1.5 mt-0.5 px-1 ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span className="text-[10px] text-muted-foreground">
                            {formatMessageTime(msg.createdAt)}
                          </span>

                          {/* Hover actions */}
                          <div className="hidden group-hover:flex items-center gap-0.5">
                            {/* Reply */}
                            <button
                              onClick={() => setReplyTo(msg)}
                              className="p-0.5 hover:bg-muted rounded"
                              title="Reply"
                            >
                              <Reply className="h-3 w-3 text-muted-foreground" />
                            </button>

                            {/* Reactions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-0.5 hover:bg-muted rounded" title="React">
                                  <Smile className="h-3 w-3 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="flex gap-1 p-1 min-w-0">
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="hover:bg-muted p-1 rounded text-sm"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Admin actions */}
                            {canModerate(activeGroup) && (
                              <>
                                <button
                                  onClick={() => handlePinMessage(msg.id, !!msg.isPinned)}
                                  className="p-0.5 hover:bg-muted rounded"
                                  title={msg.isPinned ? 'Unpin' : 'Pin'}
                                >
                                  <Pin className="h-3 w-3 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-0.5 hover:bg-destructive/10 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-1 text-xs text-muted-foreground animate-pulse">
                {typingUsers.map((t) => t.displayName).join(', ')}{' '}
                {typingUsers.length === 1 ? 'is' : 'are'} typing…
              </div>
            )}

            {/* Reply bar */}
            {replyTo && (
              <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center gap-2">
                <Reply className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 text-sm truncate text-muted-foreground">
                  Replying to <span className="font-medium">{replyTo.senderName}</span>:{' '}
                  {replyTo.content.substring(0, 60)}
                </div>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4 rotate-90" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-end gap-2 max-w-3xl mx-auto">
                {/* Anonymous toggle */}
                <Button
                  variant={isAnonymous ? 'default' : 'outline'}
                  size="icon"
                  className="flex-shrink-0 h-10 w-10"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  title={isAnonymous ? 'Sending anonymously' : 'Sending as yourself'}
                >
                  {isAnonymous ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>

                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isAnonymous
                      ? 'Type anonymously… (Shift+Enter for new line)'
                      : 'Type a message… (Shift+Enter for new line)'
                  }
                  className="flex-1 min-h-[40px] max-h-32 resize-none text-sm"
                  rows={1}
                />

                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-shrink-0 h-10 w-10"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {isAnonymous && (
                <p className="text-[10px] text-amber-600 mt-1 text-center">
                  🕶️ Anonymous mode — your identity is hidden from other members
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Create Group Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Group Chat</DialogTitle>
            <DialogDescription>
              Create a space for your community to discuss topics, share concerns, or collaborate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Campus Safety Talk"
                maxLength={60}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <Textarea
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="What is this group about?"
                rows={2}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select
                value={newGroupCategory}
                onValueChange={(v) => setNewGroupCategory(v as GroupCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GROUP_CATEGORY_LABELS) as GroupCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {GROUP_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupChats;
