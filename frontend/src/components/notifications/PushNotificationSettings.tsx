'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import {
  disablePushNotifications,
  enablePushNotifications,
  hasSavedPushToken,
  isPushConfigured,
  isPushSupported,
  syncPushTokenIfGranted,
} from '../../services/fcmService';
import { getBrowserNotificationPermission } from '../../utils/browserNotifications';
import { cn } from '../../lib/utils';

/**
 * Device-level push toggle — lock-screen alerts via FCM/PWA.
 */
export function PushNotificationSettings({ className }: { className?: string }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    void syncPushTokenIfGranted(currentUser.uid);
    setPushEnabled(
      getBrowserNotificationPermission() === 'granted' && hasSavedPushToken()
    );
  }, [currentUser?.uid]);

  const handleTogglePush = async () => {
    if (!currentUser?.uid) return;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePushNotifications(currentUser.uid);
        setPushEnabled(false);
        toast({
          title: 'Push disabled',
          description: 'This device will no longer receive lock-screen alerts.',
        });
      } else {
        const result = await enablePushNotifications(currentUser.uid);
        if (result.ok) {
          setPushEnabled(true);
          toast({
            title: 'Push enabled',
            description: 'You will get case updates even when SpeakUp GC is closed.',
          });
        } else {
          toast({
            title: 'Could not enable push',
            description: result.reason || 'Install SpeakUp GC as an app, then try again.',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <Card className={cn('border-0 shadow-sm', className)}>
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#1D9E75]" />
              Mobile Push (PWA)
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Lock-screen alerts when SpeakUp GC is closed or in the background.
            </CardDescription>
          </div>
          <Badge
            className={cn(
              'text-xs font-semibold',
              pushEnabled
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            )}
          >
            {pushEnabled ? 'On' : 'Off'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>iPhone:</strong> Safari → Share → Add to Home Screen, open the app, then enable push
          (iOS 16.4+). <strong>Android:</strong> Chrome → Install app / Add to Home screen.
        </p>
        {!isPushConfigured() && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Admin setup needed: add <code className="font-mono">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code> in
            Vercel env (Firebase → Project settings → Cloud Messaging → Web Push certificates).
          </p>
        )}
        <Button
          size="sm"
          onClick={handleTogglePush}
          disabled={pushBusy || !isPushSupported() || !currentUser?.uid}
          className={cn(
            'rounded-lg',
            pushEnabled
              ? 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'
              : 'bg-[#1D9E75] hover:bg-[#178F65] text-white'
          )}
          variant={pushEnabled ? 'outline' : 'default'}
        >
          {pushBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
          ) : (
            <Smartphone className="h-3.5 w-3.5 mr-2" />
          )}
          {!isPushSupported()
            ? 'Not supported on this browser'
            : pushEnabled
              ? 'Disable push on this device'
              : 'Enable push on this device'}
        </Button>
      </CardContent>
    </Card>
  );
}
