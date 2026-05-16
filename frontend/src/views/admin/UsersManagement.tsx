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
import { Button } from "../../components/ui/button";
import { MoreHorizontal, UserX, UserCog, Search, Users2, RefreshCw } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { RepresentativeService } from '../../services/representativeService';
import type { RepresentativeRole } from '../../types/representative';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/representative';

interface User {
  uid: string;
  email: string;
  displayName: string;
  alias?: string;
  isAdmin: boolean;
  createdAt: string;
  emailVerified: boolean;
  representativeRole?: RepresentativeRole | null;
  department?: string;
  position?: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    role: '' as RepresentativeRole | '',
    position: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
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
      
      const usersData = snapshot.docs
        .map(doc => {
          const userData = doc.data();
          const rep = representativeMap.get(doc.id);
          
          return {
            uid: doc.id,
            ...userData,
            representativeRole: rep?.role || null,
            department: rep?.department || userData.department,
            position: rep?.position || userData.position
          };
        })
        .filter(user => !user.representativeRole) as User[]; // Exclude representatives
      
      setUsers(usersData);
      setFilteredUsers(usersData);
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

  // Filter and search effect
  useEffect(() => {
    let result = [...users];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.alias?.toLowerCase().includes(term) ||
        user.displayName?.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.position?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(result);
  }, [users, searchTerm]);

  // Calculate stats (only regular users, no representatives)
  const stats = {
    total: users.length,
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-50 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-500 text-sm">Manage user accounts and permissions.</p>
        </div>
        <Button 
          onClick={() => fetchUsers()} 
          variant="outline" 
          size="sm"
          className="w-fit"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 max-w-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="bg-green-500 rounded-lg p-2">
            <Users2 className="h-5 w-5 text-white" />
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        <p className="text-sm text-gray-600">Total Users</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        Showing <span className="font-semibold text-gray-900">{filteredUsers.length}</span> of <span className="font-semibold text-gray-900">{users.length}</span> users
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alias</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Users2 className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-lg font-medium">No users found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {(user.alias || user.displayName || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.alias || user.displayName || 'N/A'}</div>
                      {user.position && (
                        <div className="text-xs text-gray-500">{user.position}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(user.createdAt)}
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
                        Assign as Representative
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Representative Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.alias || selectedUser?.displayName} ({selectedUser?.email}). This user will be moved to the Representatives page.
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
