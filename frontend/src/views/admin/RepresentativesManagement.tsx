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
    <div className="w-full space-y-6 pb-10" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Staff Management</p>
          <h1 className="text-xl font-bold text-gray-900">Representatives</h1>
          <p className="text-sm text-gray-500 mt-1">Manage Administrators and Case Handlers</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefreshStats}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setDialogOpen(true)} 
            size="sm"
            style={{ backgroundColor: '#1D9E75', color: 'white' }}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Staff
          </Button>
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
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E1F5EE' }}>
                <Users className="h-5 w-5" style={{ color: '#1D9E75' }} />
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Total Staff</p>
            <p className="text-2xl font-bold text-gray-900">{representatives.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">All representatives</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E1F5EE' }}>
                <Briefcase className="h-5 w-5" style={{ color: '#1D9E75' }} />
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Case Handlers</p>
            <p className="text-2xl font-bold text-gray-900">
              {representatives.filter(r => r.role === 'handler').length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Process complaints</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E1F5EE' }}>
                <Shield className="h-5 w-5" style={{ color: '#1D9E75' }} />
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Administrators</p>
            <p className="text-2xl font-bold text-gray-900">
              {representatives.filter(r => r.role === 'admin').length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Full system access</p>
          </CardContent>
        </Card>
      </div>

      {/* Representatives List */}
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b pb-4 pt-6">
          <CardTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#E1F5EE' }}>
              <Users className="h-5 w-5" style={{ color: '#1D9E75' }} />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {representatives.map((rep) => {
                const initials = rep.displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <div key={rep.id} className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">{initials}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-semibold text-gray-900">{rep.displayName}</h3>
                              <Badge className={`${ROLE_COLORS[rep.role]} px-2 py-0.5 text-[10px] font-semibold`}>
                                {ROLE_LABELS[rep.role]}
                              </Badge>
                              {!rep.isActive && (
                                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span>{rep.email}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            >
                              <MoreVertical className="h-5 w-5 text-gray-600" />
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
