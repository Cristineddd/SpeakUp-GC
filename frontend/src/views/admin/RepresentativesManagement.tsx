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
import type { Representative, RepresentativeRole, CreateRepresentativeData } from "../../types/representative";
import { ROLE_LABELS, ROLE_COLORS } from "../../types/representative";
import { UserPlus, User, Briefcase, Mail, Phone, Edit, Trash2, CheckCircle, XCircle, Info } from 'lucide-react';

const RepresentativesManagement = () => {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold">Staff Management</h1>
        <p className="text-gray-600 mt-1">
          Manage system access for Administrators and Case Handlers
        </p>
        <div className="mt-2 text-sm text-gray-500">
          <p>• <strong>Admin:</strong> Full system access including case assignment</p>
          <p>• <strong>Handler:</strong> Can be assigned to process complaints</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{representatives.length}</p>
                <p className="text-sm text-gray-600">Total Staff</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>



        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {representatives.filter(r => r.role === 'handler').length}
                </p>
                <p className="text-sm text-gray-600">Case Handlers</p>
              </div>
              <Briefcase className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {representatives.filter(r => r.role === 'admin').length}
                </p>
                <p className="text-sm text-gray-600">Administrators</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Representatives List */}
      <Card>
        <CardHeader>
          <CardTitle>All Representatives</CardTitle>
        </CardHeader>
        <CardContent>
          {representatives.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Representatives</h3>
              <p className="text-gray-600">Representatives are managed through the Users page. Assign users as representatives to have them appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {representatives.map((rep) => (
                <div key={rep.id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{rep.displayName}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={ROLE_COLORS[rep.role]}>
                              {ROLE_LABELS[rep.role]}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 ml-13">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {rep.email}
                        </div>
                        {rep.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {rep.phone}
                          </div>
                        )}
                        {/* Show case stats only for handlers, not admins */}
                        {rep.role === 'handler' && (
                          <div>
                            <strong>Active Cases:</strong> {rep.activeCases} | <strong>Resolved:</strong> {rep.resolvedCases}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(rep)}
                        title={rep.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {rep.isActive ? (
                          <XCircle className="h-4 w-4 text-orange-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rep)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rep.id)}
                        title="Delete"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default RepresentativesManagement;
