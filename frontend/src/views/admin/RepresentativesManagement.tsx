/**
 * Representatives Management Page
 * Admin page to manage case handlers and administrators
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useToast } from "../../hooks/use-toast";
import { RepresentativeService } from "../../services/representativeService";
import { recalculateAllRepresentativeCases } from "../../services/representativeStatsService";
import type { Representative, RepresentativeRole, CreateRepresentativeData } from "../../types/representative";
import { ROLE_LABELS, ROLE_COLORS } from "../../types/representative";
import { UserPlus, User, Briefcase, Mail, Phone, Edit, Trash2, CheckCircle, XCircle, Info, BarChart3, MoreVertical, Shield, Users, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

const RepresentativesManagement = () => {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<CreateRepresentativeData>({
    userId: '',
    email: '',
    displayName: '',
    role: 'handler',
    department: '',
    position: '',
    phone: ''
  });

  useEffect(() => {
    fetchRepresentatives();
  }, []);

  const fetchRepresentatives = async () => {
    try {
      setLoading(true);
      const reps = await RepresentativeService.getAll();
      setRepresentatives(reps);
    } catch (error) {
      console.error('Error fetching representatives:', error);
      toast({
        title: 'Error',
        description: 'Failed to load representatives',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Basic validation
      if (!formData.email || !formData.displayName) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      // Use email as userId if not provided
      const dataToSubmit = {
        ...formData,
        userId: formData.userId || formData.email
      };

      if (editingRep) {
        // Update existing
        await RepresentativeService.update(editingRep.id, {
          displayName: formData.displayName,
          role: formData.role,
          department: '',
          position: '',
          phone: formData.phone
        });
        toast({
          title: 'Success',
          description: 'Representative updated successfully'
        });
      } else {
        // Create new
        await RepresentativeService.create(dataToSubmit);
        toast({
          title: 'Success',
          description: 'Representative added successfully'
        });
      }

      // Reset and close
      resetForm();
      setDialogOpen(false);
      fetchRepresentatives();

    } catch (error: any) {
      console.error('Error saving representative:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save representative',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (rep: Representative) => {
    setEditingRep(rep);
    setFormData({
      userId: rep.userId,
      email: rep.email,
      displayName: rep.displayName,
      role: rep.role,
      department: '',
      position: '',
      phone: rep.phone
    });
    setDialogOpen(true);
  };

  const handleDelete = async (repId: string) => {
    if (!confirm('Are you sure you want to remove this representative?')) {
      return;
    }

    try {
      await RepresentativeService.delete(repId);
      toast({
        title: 'Success',
        description: 'Representative removed successfully'
      });
      fetchRepresentatives();
    } catch (error) {
      console.error('Error deleting representative:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove representative',
        variant: 'destructive'
      });
    }
  };

  const handleRefreshStats = async () => {
    try {
      setRefreshing(true);
      const result = await recalculateAllRepresentativeCases();
      
      toast({
        title: 'Stats Refreshed',
        description: `Updated ${result.updated} representative(s). ${result.errors > 0 ? `${result.errors} error(s).` : ''}`,
      });
      
      // Refresh the list to show updated counts
      await fetchRepresentatives();
    } catch (error) {
      console.error('Error refreshing stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh statistics',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleActive = async (rep: Representative) => {
    try {
      await RepresentativeService.update(rep.id, {
        isActive: !rep.isActive
      });
      toast({
        title: 'Success',
        description: `Representative ${rep.isActive ? 'deactivated' : 'activated'}`
      });
      fetchRepresentatives();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      email: '',
      displayName: '',
      role: 'handler',
      department: '',
      position: '',
      phone: ''
    });
    setEditingRep(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-10">
      {/* Header Banner */}
      <div className="relative rounded-xl border-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-6 py-6 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-2">
              <UserPlus className="h-4 w-4 text-white" />
              <p className="text-xs font-bold uppercase tracking-wider text-white">Staff Management</p>
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Representatives</h1>
            <p className="text-sm text-white/90 font-medium mt-1">
              Manage Administrators and Case Handlers
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleRefreshStats}
              disabled={refreshing}
              className="bg-white/20 text-white hover:bg-white/30 font-bold shadow-lg backdrop-blur-sm border border-white/30"
              size="lg"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Stats'}
            </Button>
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="bg-white text-green-600 hover:bg-white/90 font-bold shadow-lg"
              size="lg"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRep ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
              <DialogDescription>
                {editingRep ? 'Update staff member information' : 'Add a new staff member to the system'}
              </DialogDescription>
            </DialogHeader>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>Important:</strong> After adding a representative, you must:
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Create a Firebase Authentication account with this email</li>
                  <li>Get the User UID from Firebase Console</li>
                  <li>Edit this representative and add the User ID</li>
                  <li>The representative can then log in at /admin/login</li>
                </ol>
                <p className="mt-2 text-xs">
                  Handlers will see only their assigned cases when they log in.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userId">User ID (Firebase UID)</Label>
                  <Input
                    id="userId"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="Paste Firebase Auth UID here"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get this from Firebase Console → Authentication → Users
                  </p>
                </div>

                <div>
                  <Label htmlFor="displayName">Full Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@university.edu"
                    disabled={!!editingRep}
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as RepresentativeRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="handler">Case Handler</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === 'admin' 
                      ? 'Full system access including case assignment' 
                      : 'Can be assigned to process complaints'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>
                {editingRep ? 'Update' : 'Add'} Representative
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Staff</p>
              <p className="text-5xl font-black text-gray-900">{representatives.length}</p>
              <p className="text-sm text-gray-500 font-medium">All representatives</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Case Handlers</p>
              <p className="text-5xl font-black text-gray-900">
                {representatives.filter(r => r.role === 'handler').length}
              </p>
              <p className="text-sm text-gray-500 font-medium">Process complaints</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-lime-500 to-green-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Administrators</p>
              <p className="text-5xl font-black text-gray-900">
                {representatives.filter(r => r.role === 'admin').length}
              </p>
              <p className="text-sm text-gray-500 font-medium">Full system access</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Representatives List */}
      <Card className="border-0 bg-white shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 pb-6 pt-6">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            All Representatives
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {representatives.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Representatives</h3>
              <p className="text-gray-600">Representatives are managed through the Users page. Assign users as representatives to have them appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {representatives.map((rep) => {
                const initials = rep.displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <div key={rep.id} className="group relative rounded-2xl border-2 border-gray-100 bg-gradient-to-r from-white to-gray-50 p-6 transition-all hover:border-green-200 hover:shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                            <span className="text-xl font-bold text-white">{initials}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold text-gray-900">{rep.displayName}</h3>
                              <Badge className={`${ROLE_COLORS[rep.role]} px-3 py-1 text-xs font-bold`}>
                                {ROLE_LABELS[rep.role]}
                              </Badge>
                              {!rep.isActive && (
                                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 px-3 py-1 text-xs font-bold">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span className="font-medium">{rep.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm ml-18">
                          {rep.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span>{rep.phone}</span>
                            </div>
                          )}
                          {rep.role === 'handler' && (
                            <div className="flex items-center gap-4 text-gray-700">
                              <div className="flex items-center gap-1">
                                <strong className="text-gray-900">Active Cases:</strong> 
                                <span className="font-semibold text-green-600">{rep.activeCases || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <strong className="text-gray-900">Resolved:</strong> 
                                <span className="font-semibold text-emerald-600">{rep.resolvedCases || 0}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleEdit(rep)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(rep)}>
                              {rep.isActive ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2 text-orange-600" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  <span>Activate</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(rep.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Staff
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RepresentativesManagement;
