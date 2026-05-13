import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { MoreHorizontal, Shield, UserX, UserCheck, UserCog, Briefcase } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { RepresentativeService } from '../../services/representativeService';
import type { RepresentativeRole } from '../../types/representative';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/representative';

interface User {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  emailVerified: boolean;
  representativeRole?: RepresentativeRole | null;
  department?: string;
  position?: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    role: '' as RepresentativeRole | '',
    position: ''
  });
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);
      
      // Fetch all representatives to check roles
      const representatives = await RepresentativeService.getAll();
      const representativeMap = new Map(
        representatives.map(rep => [rep.userId, rep])
      );
      
      const usersData = snapshot.docs.map(doc => {
        const userData = doc.data();
        const rep = representativeMap.get(doc.id);
        
        return {
          uid: doc.id,
          ...userData,
          representativeRole: rep?.role || null,
          department: rep?.department || userData.department,
          position: rep?.position || userData.position
        };
      }) as User[];
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdminStatus = async (uid: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isAdmin: !currentStatus
      });
      
      setUsers(users.map(user => 
        user.uid === uid 
          ? { ...user, isAdmin: !currentStatus }
          : user
      ));

      toast({
        title: "Success",
        description: `User admin status ${!currentStatus ? 'granted' : 'revoked'}`,
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete all their reports and complaints.')) {
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Delete representative record if exists
      const representative = await RepresentativeService.getByUserId(uid);
      if (representative) {
        await RepresentativeService.delete(representative.id);
      }
      
      // Delete all reports by this user
      const reportsQuery = query(
        collection(db, 'reports'),
        where('userId', '==', uid)
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      reportsSnapshot.docs.forEach((reportDoc) => {
        batch.delete(reportDoc.ref);
      });
      
      // Delete all complaints by this user
      const complaintsQuery = query(
        collection(db, 'complaints'),
        where('userId', '==', uid)
      );
      const complaintsSnapshot = await getDocs(complaintsQuery);
      complaintsSnapshot.docs.forEach((complaintDoc) => {
        batch.delete(complaintDoc.ref);
      });
      
      // Delete user document
      const userRef = doc(db, 'users', uid);
      batch.delete(userRef);
      
      // Commit all deletions
      await batch.commit();
      
      setUsers(users.filter(user => user.uid !== uid));
      
      toast({
        title: "Success",
        description: `User deleted successfully along with ${reportsSnapshot.size} report(s) and ${complaintsSnapshot.size} complaint(s)`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openAssignRoleDialog = (user: User) => {
    setSelectedUser(user);
    setRoleFormData({
      role: user.representativeRole || '',
      position: user.position || ''
    });
    setAssignRoleDialogOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !roleFormData.role) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if user already has a representative record
      const existingRep = await RepresentativeService.getByUserId(selectedUser.uid);

      if (existingRep) {
        // Update existing representative
        await RepresentativeService.update(existingRep.id, {
          role: roleFormData.role as RepresentativeRole,
          position: roleFormData.position
        });
      } else {
        // Create new representative record
        await RepresentativeService.create({
          userId: selectedUser.uid,
          email: selectedUser.email,
          displayName: selectedUser.displayName || selectedUser.email,
          role: roleFormData.role as RepresentativeRole,
          position: roleFormData.position,
          department: '',
          phone: ''
        });
      }

      toast({
        title: "Success",
        description: `${selectedUser.displayName} assigned as ${ROLE_LABELS[roleFormData.role as RepresentativeRole]}`,
      });

      setAssignRoleDialogOpen(false);
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const removeRepresentativeRole = async (user: User) => {
    if (!window.confirm(`Remove ${ROLE_LABELS[user.representativeRole!]} role from ${user.displayName}?`)) {
      return;
    }

    try {
      const representative = await RepresentativeService.getByUserId(user.uid);
      if (representative) {
        await RepresentativeService.delete(representative.id);
        toast({
          title: "Success",
          description: "Role removed successfully",
        });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-500">Manage user accounts and permissions.</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Representative Role</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.isAdmin && (
                    <Badge variant="default" className="bg-purple-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.representativeRole ? (
                    <Badge 
                      variant="outline" 
                      className={`border-${ROLE_COLORS[user.representativeRole]} text-${ROLE_COLORS[user.representativeRole]}`}
                    >
                      <Briefcase className="h-3 w-3 mr-1" />
                      {ROLE_LABELS[user.representativeRole]}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">No role</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.emailVerified ? (
                    <UserCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <UserX className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openAssignRoleDialog(user)}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        {user.representativeRole ? 'Change Role' : 'Assign Role'}
                      </DropdownMenuItem>
                      {user.representativeRole && (
                        <DropdownMenuItem
                          onClick={() => removeRepresentativeRole(user)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Remove Role
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => toggleAdminStatus(user.uid, user.isAdmin)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteUser(user.uid)}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Representative Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.displayName} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select 
                value={roleFormData.role} 
                onValueChange={(value) => setRoleFormData({ ...roleFormData, role: value as RepresentativeRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="handler">Case Handler</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {roleFormData.role === 'handler'
                  ? '⚙️ Can be assigned to process complaints'
                  : roleFormData.role === 'admin'
                  ? '🔧 Full administrative access'
                  : 'Select a role'}
              </p>
            </div>

            <div>
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={roleFormData.position}
                onChange={(e) => setRoleFormData({ ...roleFormData, position: e.target.value })}
                placeholder="Case Handler, Coordinator, Dean"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
