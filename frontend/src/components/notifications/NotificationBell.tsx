import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Archive, ExternalLink } from 'lucide-react';
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
import type { Notification } from '../../types/notification';
import { getNotificationIcon, getNotificationColor } from '../../types/notification';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation } from '../../compat/router';
import { useToast } from '../../hooks/use-toast';

// Development flag for test notifications
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export const NotificationBell: React.FC = () => {
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

  // Check if user is in admin interface
  const isInAdminInterface = location.pathname.startsWith('/admin');

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

    // Create test notification (development only) - DISABLED
    const createTestNotification = async () => {
      // Test notifications disabled - only create real notifications
      return;
    };

    // Set up real-time listener
    const unsubscribe = NotificationService.subscribeToNotifications(
      currentUser.uid,
      (newNotifications) => {
        console.log('🔔 [BELL] Received notifications from service:', newNotifications.length);
        console.log('🔔 [BELL] Notifications data:', newNotifications);
        
        setNotifications(newNotifications);
        const unread = newNotifications.filter((n) => n.status === 'unread').length;
        setUnreadCount(unread);
        setLoading(false);
        
        console.log('🔔 [BELL] Unread count:', unread);
        
        // Test notifications disabled - only show real notifications
      },
      { limit: 20 }
    );

    // Test notifications disabled - only real notifications

    return () => {
      console.log('🔔 [BELL] Cleaning up notification listener');
      unsubscribe();
    };
  }, [currentUser, testNotificationCreated]);

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
    setOpen(false);
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
          size="icon"
          className="relative hover:bg-gray-100 dark:hover:bg-gray-700"
          disabled={loading}
          title="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
              disabled={markingAllRead}
            >
              {markingAllRead ? (
                <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              {markingAllRead ? 'Marking...' : 'Mark all read'}
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-3" />
              <p className="text-sm text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">No notifications</p>
              <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    notification.status === 'unread' ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${getNotificationColor(
                        notification.priority
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium text-gray-900 ${
                              notification.status === 'unread' ? 'font-semibold' : ''
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                            </span>
                            {notification.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                Important
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Unread indicator */}
                        {notification.status === 'unread' && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      {notification.status === 'unread' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          title="Mark as read"
                          disabled={markingRead === notification.id}
                        >
                          {markingRead === notification.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                // Stay in admin interface if already there, otherwise go to user notifications
                if (isInAdminInterface) {
                  // For admin users, just close dropdown since there's no separate admin notifications page
                  // All notifications are shown in the dropdown
                  setOpen(false);
                } else {
                  navigate('/notifications');
                  setOpen(false);
                }
              }}
            >
              {isInAdminInterface ? 'Close' : 'View all notifications'}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};