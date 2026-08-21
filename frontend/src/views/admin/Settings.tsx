import React, { useState, useEffect } from 'react';
import { useNavigate } from '../../compat/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { AlertCircle, Bell, Shield, MapPin, Bot, ArrowRight } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { setChatbotEnabled as setChatbotEnabledSetting, setMaintenanceMode as setMaintenanceModeSetting } from '../../services/systemSettingsService';
import { changePassword, sendPasswordResetToCurrentUser } from '../../services/authPasswordService';
import { validatePassword } from '../../utils/passwordValidation';
import { getAuthErrorMessage } from '../../utils/auth/firebaseErrorMessages';
import { PushNotificationSettings } from '../../components/notifications/PushNotificationSettings';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { settings, loading: systemSettingsLoading } = useSystemSettings();
  const { chatbotEnabled, maintenanceMode } = settings;
  const [savingChatbotToggle, setSavingChatbotToggle] = useState(false);
  const [savingMaintenanceToggle, setSavingMaintenanceToggle] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const isPasswordAccount = user?.providerData?.some((p) => p.providerId === 'password') ?? false;
  const [locationCount, setLocationCount] = useState<number | null>(null);

  useEffect(() => {
    const locationsQuery = query(collection(db, 'locations'), orderBy('name'));
    const unsubscribe = onSnapshot(
      locationsQuery,
      (snapshot) => setLocationCount(snapshot.size),
      (error) => {
        console.error('Error fetching location count:', error);
        setLocationCount(0);
      }
    );
    return () => unsubscribe();
  }, []);
  const handleToggleChatbot = async (enabled: boolean) => {
    if (!isAdmin || !user) {
      toast({
        title: 'Not authorized',
        description: 'Only admins can change this setting.',
        variant: 'destructive'
      });
      return;
    }

    setSavingChatbotToggle(true);
    try {
      await setChatbotEnabledSetting(
        enabled,
        user.uid,
        user.displayName || user.email || 'Admin'
      );
      toast({
        title: enabled ? 'Chatbot enabled' : 'Chatbot disabled',
        description: enabled
          ? 'Complainants can now use the AI chatbot assistant.'
          : 'The AI chatbot assistant is now hidden from complainants.'
      });
    } catch (error) {
      console.error('Error updating chatbot setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the chatbot setting. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSavingChatbotToggle(false);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    if (!isAdmin || !user) {
      toast({
        title: 'Not authorized',
        description: 'Only admins can change this setting.',
        variant: 'destructive'
      });
      return;
    }

    setSavingMaintenanceToggle(true);
    try {
      await setMaintenanceModeSetting(
        enabled,
        user.uid,
        user.displayName || user.email || 'Admin'
      );
      toast({
        title: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
        description: enabled
          ? 'Complainants are now blocked from accessing the system.'
          : 'Complainants can access the system again.'
      });
    } catch (error) {
      console.error('Error updating maintenance mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to update maintenance mode. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSavingMaintenanceToggle(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all password fields.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match.',
        variant: 'destructive'
      });
      return;
    }

    const validation = validatePassword(passwordData.new);
    if (!validation.isValid) {
      toast({
        title: 'Password requirements not met',
        description: validation.feedback.join('. '),
        variant: 'destructive'
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      await changePassword(passwordData.current, passwordData.new);
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.'
      });
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: unknown) {
      console.error('Error updating password:', error);
      toast({
        title: 'Error',
        description: getAuthErrorMessage(error, 'Failed to update password. Please try again.', {
          'auth/invalid-credential': 'Current password is incorrect.',
          'auth/wrong-password': 'Current password is incorrect.',
        }),
        variant: 'destructive',
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    setSendingResetEmail(true);
    try {
      await sendPasswordResetToCurrentUser();
      toast({
        title: 'Reset email sent',
        description: `A password reset link was sent to ${user?.email}.`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email.',
        variant: 'destructive'
      });
    } finally {
      setSendingResetEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Configuration</p>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure system preferences and security</p>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure how you want to receive notifications about reports and user activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">Receive updates via email</p>
            </div>
            <Switch id="email-notifications" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="urgent-alerts">Urgent Alerts</Label>
              <p className="text-sm text-gray-500">Get immediate notifications for urgent reports</p>
            </div>
            <Switch id="urgent-alerts" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <PushNotificationSettings />

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your admin account security preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPasswordAccount ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData((p) => ({ ...p, current: e.target.value }))}
                  disabled={updatingPassword}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData((p) => ({ ...p, new: e.target.value }))}
                  disabled={updatingPassword}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData((p) => ({ ...p, confirm: e.target.value }))}
                  disabled={updatingPassword}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={updatingPassword}>
                {updatingPassword ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Your account uses Google Sign-In. To set or change a password, request a reset link below.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendResetEmail}
                disabled={sendingResetEmail}
              >
                {sendingResetEmail ? 'Sending…' : 'Send Password Reset Email'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            System Preferences
          </CardTitle>
          <CardDescription>
            Configure system-wide settings and defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
              <p className="text-sm text-gray-500">Temporarily disable user access</p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={maintenanceMode}
              disabled={systemSettingsLoading || savingMaintenanceToggle}
              onCheckedChange={handleToggleMaintenance}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-archive">Auto-Archive Reports</Label>
              <p className="text-sm text-gray-500">Automatically archive resolved reports after 30 days</p>
            </div>
            <Switch id="auto-archive" defaultChecked />
          </div>

          {/* AI Chatbot toggle — admin-only, enforced by isAdmin + Firestore rules */}
          {isAdmin && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2 pr-4">
                  <Bot className="h-4 w-4 text-qc-sage mt-0.5 flex-shrink-0" />
                  <div>
                    <Label htmlFor="chatbot-enabled">AI Chatbot Assistant</Label>
                    <p className="text-sm text-gray-500">
                      Allow complainants to use the virtual assistant (Laya) for FAQs and case status inquiries.
                    </p>
                  </div>
                </div>
                <Switch
                  id="chatbot-enabled"
                  checked={chatbotEnabled}
                  disabled={systemSettingsLoading || savingChatbotToggle}
                  onCheckedChange={handleToggleChatbot}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Location Management — summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Management
          </CardTitle>
          <CardDescription>
            Manage rooms, buildings, and departments for complaint filing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {locationCount === null
                ? 'Loading location count…'
                : `${locationCount} location${locationCount === 1 ? '' : 's'}`}
            </p>
            <Button onClick={() => navigate('/admin/locations')} size="sm">
              Manage Locations
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
