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
    <PageShell>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on your cases and account activity"
        action={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            {readCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleDeleteAllRead}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete read
              </Button>
            )}
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notifications…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm h-10"
            />
          </div>
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as any)}>
            <SelectTrigger className="w-full md:w-44 h-10 text-sm">
              <Filter className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({readCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
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
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  notification.status === 'unread' ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getNotificationColor(
                        notification.priority
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3
                          className={`text-lg font-semibold ${
                            notification.status === 'unread' ? 'text-gray-900 font-bold' : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={getNotificationBadgeColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          {notification.status === 'unread' && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{notification.message}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
                          <span>•</span>
                          <span title={format(notification.createdAt, 'PPpp')}>
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                          </span>
                          {notification.actionUrl && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 flex items-center gap-1">
  
                              </span>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {notification.status === 'unread' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}