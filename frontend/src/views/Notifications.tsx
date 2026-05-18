import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell, Check, CheckCheck, Trash2, Filter,
  Search, ExternalLink, AlertCircle, Circle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/notificationService';
import type { Notification, NotificationStatus, NotificationPriority } from '../types/notification';
import {
  getNotificationIcon, getNotificationColor, getNotificationBadgeColor, NOTIFICATION_TYPE_LABELS,
} from '../types/notification';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from '../compat/router';
import { useToast } from '../hooks/use-toast';
import { PageHeader, PageShell } from '../components/layout/PageHeader';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent double subscription in Strict Mode
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Memoize filtered notifications to prevent excessive re-renders
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter((n) => n.status === 'unread');
    } else if (activeTab === 'read') {
      filtered = filtered.filter((n) => n.status === 'read');
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((n) => n.priority === priorityFilter);
    }

    return filtered;
  }, [notifications, activeTab, searchQuery, priorityFilter]);

  // Memoize unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.status === 'unread').length;
  }, [notifications]);

  // Subscribe to notifications
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Cleanup previous subscription if exists (for Strict Mode)
    if (subscriptionRef.current) {
      console.log('[Notifications] Cleaning up previous subscription');
      subscriptionRef.current();
      subscriptionRef.current = null;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = NotificationService.subscribeToNotifications(
        currentUser.uid,
        (newNotifications) => {
          console.log('[Notifications] Received update:', newNotifications.length, 'notifications');
          setNotifications(newNotifications);
          setLoading(false);
          setError(null);
        }
      );

      subscriptionRef.current = unsubscribe;

      return () => {
        console.log('[Notifications] Component unmounting, cleaning up subscription');
        if (subscriptionRef.current) {
          subscriptionRef.current();
          subscriptionRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error setting up notifications subscription:', err);
      setError('Failed to load notifications');
      setLoading(false);
    }
  }, [currentUser, navigate]);

  // Handler for clicking a notification
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (notification.status === 'unread') {
        await NotificationService.markAsRead(notification.id);
      }
      
      // Navigate to the relevant page if there's an action URL
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
      toast({
        title: 'Error',
        description: 'Failed to process notification',
        variant: 'destructive',
      });
    }
  };

  const renderNotificationList = () => {
    if (loading) {
      return <div className="text-center py-8">Loading notifications...</div>;
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (filteredNotifications.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No notifications found
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`cursor-pointer transition-colors hover:bg-accent/50 ${
              notification.status === 'unread' ? 'bg-accent/10' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className={`rounded-full p-2 ${getNotificationColor(notification.priority)}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="space-x-2">
                    <Badge variant="outline">{NOTIFICATION_TYPE_LABELS[notification.type]}</Badge>
                    <Badge
                      variant="outline"
                      className={getNotificationBadgeColor(notification.priority)}
                    >
                      {notification.priority}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <h4 className="text-sm font-medium mt-2">{notification.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                {notification.actionUrl && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                    <ExternalLink className="h-4 w-4" />
                    {notification.actionLabel || 'View details'}
                  </div>
                )}
              </div>
              {notification.status === 'unread' ? (
                <div className="text-primary">
                  <Circle className="h-3 w-3 fill-current" />
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <CheckCheck className="h-4 w-4" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      toast({
        title: 'Success',
        description: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await NotificationService.markAllAsRead(currentUser.uid);
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      toast({
        title: 'Deleted',
        description: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllRead = async () => {
    if (!currentUser) return;
    try {
      await NotificationService.deleteAllRead(currentUser.uid);
      toast({
        title: 'Success',
        description: 'All read notifications deleted',
      });
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notifications',
        variant: 'destructive',
      });
    }
  };

  // Memoize read count as well
  const readCount = useMemo(() => {
    return notifications.filter((n) => n.status === 'read').length;
  }, [notifications]);

  if (!currentUser) return null;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Simple, clean header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Stay updated on your cases and account activity</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search bar with action buttons */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm h-9 border-0 focus-visible:ring-1"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-9 text-xs">
                  <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                  Mark all read
                </Button>
              )}
              {readCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleDeleteAllRead} className="h-9 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-white border border-gray-200">
            <TabsTrigger value="all" className="data-[state=active]:bg-gray-100">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-gray-100">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read" className="data-[state=active]:bg-gray-100">
              Read ({readCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {loading ? (
              <Card className="w-full">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </CardContent>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No notifications found
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery || priorityFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : "You're all caught up!"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => {
                // Clean message - remove redundant "Notes:" prefix and truncate
                const cleanMessage = notification.message.replace(/^Notes:\s*/i, '').trim();
                const truncatedMessage = cleanMessage.length > 150 
                  ? cleanMessage.substring(0, 150) + '...' 
                  : cleanMessage;
                
                return (
                  <Card
                    key={notification.id}
                    className={`w-full transition-all cursor-pointer border ${
                      notification.status === 'unread' 
                        ? 'bg-blue-50/30 border-blue-100 hover:border-blue-200 hover:shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Unread indicator dot */}
                        {notification.status === 'unread' && (
                          <div className="flex-shrink-0 mt-1.5">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          </div>
                        )}

                        {/* Content - no icons */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className={`text-sm font-semibold leading-snug ${
                              notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                          </div>

                          {/* Message */}
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                            {truncatedMessage}
                          </p>

                          {/* Footer: timestamp + actions */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
                              <span>•</span>
                              <span title={format(notification.createdAt, 'PPpp')}>
                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                              </span>
                            </div>

                            {/* Compact action buttons */}
                            <div className="flex gap-1">
                              {notification.status === 'unread' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}