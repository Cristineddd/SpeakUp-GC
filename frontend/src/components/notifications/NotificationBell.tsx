import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { NotificationService } from '../../services/notificationService';
import type { Notification, NotificationType, NotificationPriority } from '../../types/notification';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate, useLocation } from '../../compat/router';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

// Severity types for color coding
type NotificationSeverity = 'important' | 'status_update' | 'general';

// Map notification types to severity
function getSeverity(type: NotificationType, priority: NotificationPriority): NotificationSeverity {
  if (priority === 'urgent' || priority === 'high') return 'important';
  if (type === 'status_update' || type === 'complaint_escalated' || type === 'deadline_approaching') return 'status_update';
  return 'general';
}

// Get severity colors
function getSeverityColors(severity: NotificationSeverity) {
  switch (severity) {
    case 'important':
      return {
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconText: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        unreadDot: 'bg-red-500'
      };
    case 'status_update':
      return {
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconText: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
        unreadDot: 'bg-amber-500'
      };
    case 'general':
    default:
      return {
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconText: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        unreadDot: 'bg-blue-500'
      };
  }
}

// Get icon based on severity
function getSeverityIcon(severity: NotificationSeverity) {
  switch (severity) {
    case 'important':
      return <AlertCircle className="h-4 w-4" />;
    case 'status_update':
      return <Info className="h-4 w-4" />;
    case 'general':
    default:
      return <CheckCircle className="h-4 w-4" />;
  }
}

// Get severity label
function getSeverityLabel(severity: NotificationSeverity): string {
  switch (severity) {
    case 'important':
      return 'Important';
    case 'status_update':
      return 'Status';
    case 'general':
    default:
      return 'General';
  }
}

// Development flag for test notifications
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

interface NotificationBellProps {
  variant?: 'default' | 'admin';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ variant = 'default' }) => {
  const { currentUser } = useAuth();
  const { role, isAdmin } = useRepresentativeRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testNotificationCreated, setTestNotificationCreated] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const isAdminVariant = variant === 'admin';
  // Check if user is in admin interface
  const isInAdminInterface = isAdminVariant || location.pathname.startsWith('/admin');

  // Debug mounting
  useEffect(() => {
    console.log('🔔 [BELL] Component mounted');
    return () => console.log('🔔 [BELL] Component unmounted');
  }, []);

  // Single combined effect for notification setup
  useEffect(() => {
    if (!currentUser) {
      console.log('🔔 [BELL] No current user, skipping notification setup');
      setLoading(false);
      return;
    }

    console.log('🔔 [BELL] Setting up notification listener for user:', currentUser.uid);
    console.log('🔔 [BELL] User object:', currentUser);
    
    setLoading(true);

    // Set up real-time listener
    const unsubscribe = NotificationService.subscribeToNotifications(
      currentUser.uid,
      (newNotifications) => {
        console.log('🔔 [BELL] Received notifications from service:', newNotifications.length);
        console.log('🔔 [BELL] Notifications data:', newNotifications);
        
        // Deduplicate notifications based on title, message, and createdAt
        const seen = new Map<string, Notification>();
        newNotifications.forEach(notif => {
          const key = `${notif.title}-${notif.message}-${new Date(notif.createdAt).getTime()}`;
          if (!seen.has(key) || notif.status === 'unread') {
            seen.set(key, notif);
          }
        });
        const deduplicated = Array.from(seen.values());
        
        setNotifications(deduplicated);
        const unread = deduplicated.filter((n) => n.status === 'unread').length;
        setUnreadCount(unread);
        setLoading(false);
        
        console.log('🔔 [BELL] Unread count:', unread);
      },
      { limit: 20 }
    );

    return () => {
      console.log('🔔 [BELL] Cleaning up notification listener');
      unsubscribe();
    };
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🔔 [BELL] Marking as read:', notificationId);
    
    setMarkingRead(notificationId);
    try {
      await NotificationService.markAsRead(notificationId);
      toast({
        title: 'Marked as read',
        description: 'Notification marked as read',
      });
    } catch (error) {
      console.error('❌ [BELL] Error marking as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark as read',
        variant: 'destructive',
      });
    } finally {
      setMarkingRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    console.log('🔔 [BELL] Marking all as read for user:', currentUser.uid);
    
    setMarkingAllRead(true);
    try {
      await NotificationService.markAllAsRead(currentUser.uid);
      toast({
        title: 'All marked as read',
        description: 'All notifications have been marked as read',
      });
    } catch (error) {
      console.error('❌ [BELL] Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🔔 [BELL] Deleting notification:', notificationId);
    try {
      await NotificationService.deleteNotification(notificationId);
      toast({
        title: 'Deleted',
        description: 'Notification deleted',
      });
    } catch (error) {
      console.error('❌ [BELL] Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    console.log('🔔 [BELL] Notification clicked:', notification.id);

    // Close dropdown immediately for better UX
    setOpen(false);

    // Mark as read if unread
    if (notification.status === 'unread') {
      console.log('🔔 [BELL] Auto-marking as read');
      try {
        await NotificationService.markAsRead(notification.id);
        // Update local state immediately for better UX
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, status: 'read' as const } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('❌ [BELL] Error auto-marking as read:', error);
      }
    }

    // Small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 100));

    // Navigate to action URL or notifications page
    if (notification.actionUrl) {
      console.log('🔔 [BELL] Navigating to:', notification.actionUrl);
      try {
        navigate(notification.actionUrl);
      } catch (navError) {
        console.error('❌ [BELL] Navigation error:', navError);
        // Fallback to notifications page if actionUrl is invalid
        navigate('/notifications');
      }
    } else {
      // Default to notifications page
      navigate('/notifications');
    }
  };

  if (!currentUser) {
    console.log('🔔 [BELL] No current user, returning null');
    return null;
  }

  console.log('🔔 [BELL] Rendering - notifications:', notifications.length, 'unread:', unreadCount, 'loading:', loading);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={isAdminVariant ? 'default' : 'icon'}
          className={cn(
            'relative transition-all',
            isAdminVariant
              ? cn(
                  'flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 shadow-sm hover:border-[#1D9E75]/35 hover:bg-emerald-50/70 sm:gap-2.5 sm:px-4 [&_svg]:h-[18px] [&_svg]:w-[18px]',
                  unreadCount > 0 && 'border-red-200 bg-red-50/60 hover:bg-red-50'
                )
              : cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100',
                  isInAdminInterface &&
                    'h-10 w-10 rounded-xl border-2 border-gray-200 bg-white shadow-sm hover:border-[#1D9E75]/40 hover:bg-emerald-50/60'
                )
          )}
          disabled={loading}
          title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <span className="relative inline-flex shrink-0 items-center justify-center">
            <Bell
              className={cn(
                isAdminVariant
                  ? 'h-[18px] w-[18px] text-gray-700'
                  : isInAdminInterface
                    ? 'h-5 w-5 text-gray-800'
                    : 'h-7 w-7 text-gray-700',
                unreadCount > 0 && 'text-[#1D9E75]'
              )}
              strokeWidth={2.25}
            />
            {unreadCount > 0 && isAdminVariant && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 sm:hidden" />
            )}
            {unreadCount > 0 && !isAdminVariant && (
              <span
                className={cn(
                  'absolute flex items-center justify-center rounded-full border-2 border-white bg-red-500 font-bold text-white shadow-sm',
                  isInAdminInterface
                    ? '-top-1.5 -right-1.5 min-w-[20px] h-5 px-1 text-[10px]'
                    : '-top-0.5 -right-0.5 min-w-[20px] h-5 px-1 text-[10px]'
                )}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>

          {isAdminVariant && (
            <>
              <span className="hidden text-sm font-medium leading-none text-gray-700 sm:inline">
                Notifications
              </span>
              {unreadCount > 0 && (
                <Badge className="h-5 min-w-[20px] shrink-0 rounded-full border-0 bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white hover:bg-red-500">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] p-0 border-gray-200 dark:border-gray-800 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white hover:bg-red-600 text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 h-8"
              disabled={markingAllRead}
            >
              {markingAllRead ? (
                <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[450px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-400 rounded-full mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification) => {
                const severity = getSeverity(notification.type, notification.priority);
                const colors = getSeverityColors(severity);
                const icon = getSeverityIcon(severity);
                const severityLabel = getSeverityLabel(severity);

                return (
                  <div
                    key={notification.id}
                    className="group relative px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon container */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg} ${colors.iconText}`}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${notification.status === 'unread' ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </h4>
                              {/* Unread dot */}
                              {notification.status === 'unread' && (
                                <div className={`w-1.5 h-1.5 rounded-full ${colors.unreadDot} flex-shrink-0`} />
                              )}
                            </div>
                            
                            {/* Severity badge */}
                            <Badge className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} mb-1.5 inline-block`}>
                              {severityLabel}
                            </Badge>
                            
                            {/* Truncated description */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                            
                            {/* Timestamp */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {format(notification.createdAt, 'MMM dd, yyyy • h:mm a')}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-600">
                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delete button - shows on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!isInAdminInterface) {
                navigate('/notifications');
              }
              setOpen(false);
            }}
            className="w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 h-9 rounded-xl"
          >
            {notifications.length > 0 && !isInAdminInterface ? 'View all notifications' : 'Close'}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};