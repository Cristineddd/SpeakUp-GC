import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AlertCircle, Bell, Shield, MapPin, Plus, Edit, Trash2, Building2, Bot } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useChatbotEnabled } from '../../hooks/useChatbotEnabled';
import { setChatbotEnabled as setChatbotEnabledSetting } from '../../services/systemSettingsService';

interface Location {
  id: string;
  name: string;
  category: string;
}

const Settings = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { chatbotEnabled, loading: chatbotSettingLoading } = useChatbotEnabled();
  const [savingChatbotToggle, setSavingChatbotToggle] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '' });

  const categories = ['Room', 'Building', 'Department', 'Common Area', 'Other'];

  useEffect(() => {
    const locationsQuery = query(collection(db, 'locations'), orderBy('name'));
    const unsubscribe = onSnapshot(
      locationsQuery,
      (snapshot) => {
        const locationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          category: doc.data().category
        }));
        setLocations(locationsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching locations:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingLocation) {
        await updateDoc(doc(db, 'locations', editingLocation.id), {
          name: formData.name.trim(),
          category: formData.category,
          updatedAt: new Date()
        });
        toast({
          title: 'Success',
          description: 'Location updated successfully'
        });
      } else {
        await addDoc(collection(db, 'locations'), {
          name: formData.name.trim(),
          category: formData.category,
          createdAt: new Date()
        });
        toast({
          title: 'Success',
          description: 'Location added successfully'
        });
      }
      setDialogOpen(false);
      setFormData({ name: '', category: '' });
      setEditingLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Error',
        description: 'Failed to save location',
        variant: 'destructive'
      });
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setFormData({ name: location.name, category: location.category });
    setDialogOpen(true);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await deleteDoc(doc(db, 'locations', id));
      toast({
        title: 'Success',
        description: 'Location deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive'
      });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setFormData({ name: '', category: '' });
    setEditingLocation(null);
  };

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
          <div>
            <Label htmlFor="current-password">Current Password</Label>
            <Input id="current-password" type="password" />
          </div>
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input id="confirm-password" type="password" />
          </div>
          <Button>Update Password</Button>
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
            <Switch id="maintenance-mode" />
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
                  disabled={chatbotSettingLoading || savingChatbotToggle}
                  onCheckedChange={handleToggleChatbot}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Location Management */}
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
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Total locations: {locations.length}</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingLocation(null)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
                  <DialogDescription>
                    {editingLocation ? 'Update the location details below' : 'Add a new location to the system'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitLocation}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">Location Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Room 101, Main Building, Library"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                      >
                        <option value="">Select category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
                    <Button type="submit">{editingLocation ? 'Update' : 'Add'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No locations added yet</p>
              <p className="text-sm mt-1">Click "Add Location" to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-500">{location.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditLocation(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
