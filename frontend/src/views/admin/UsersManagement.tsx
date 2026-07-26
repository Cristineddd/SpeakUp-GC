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
import { MoreHorizontal, UserX, UserCog, Search, Users2, RefreshCw, Eye, UserCheck, Clock, UserPlus, FileText, Ban, CheckCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { startOfMonth, startOfDay } from 'date-fns';
import { RepresentativeService } from '../../services/representativeService';
import { MessageService } from '../../services/messageService';
import type { RepresentativeRole } from '../../types/representative';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/representative';
import { DeleteUserModal } from '../../components/admin/DeleteUserModal';

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
  isSuspended?: boolean;
  reportsCount?: number;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    role: '' as RepresentativeRole | ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRepresentatives, setShowRepresentatives] = useState(false);
  const [viewUserDialogOpen, setViewUserDialogOpen] = useState(false);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
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
      
      // Fetch report counts for each user
      const reportsSnapshot = await getDocs(collection(db, 'reports'));
      const reportCounts = new Map<string, number>();
      reportsSnapshot.docs.forEach(doc => {
        const userId = doc.data().userId;
        if (userId) {
          reportCounts.set(userId, (reportCounts.get(userId) || 0) + 1);
        }
      });
      
      const allUsersData = snapshot.docs.map(doc => {
        const userData = doc.data();
        const rep = representativeMap.get(doc.id);
        
        return {
          uid: doc.id,
          ...userData,
          representativeRole: rep?.role || null,
          department: rep?.department || userData.department,
          position: rep?.position || userData.position,
          isSuspended: userData.isSuspended || false,
          reportsCount: reportCounts.get(doc.id) || 0
        };
      });
      
      console.log('📊 Total users from Firestore:', allUsersData.length);
      console.log('📊 Users with representative roles:', allUsersData.filter(u => u.representativeRole).length);
      
      // Store all users (we'll filter by showRepresentatives in the filter effect)
      const usersData = allUsersData as User[];
      
      console.log('📊 All users loaded:', usersData.length);
      
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

    // Filter representatives
    if (!showRepresentatives) {
      result = result.filter(user => !user.representativeRole);
    }

    // Apply status filter
    if (statusFilter === 'active') {
      result = result.filter(user => !user.isSuspended);
    } else if (statusFilter === 'suspended') {
      result = result.filter(user => user.isSuspended);
    }

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
  }, [users, searchTerm, statusFilter, showRepresentatives]);

  // Calculate stats (only regular users, no representatives)
  const stats = {
    total: users.length,
    activeToday: users.filter(user => {
      if (!user.reportsCount || user.reportsCount === 0) return false;
      // This is a simplified check - in production you'd check actual report timestamps
      return !user.isSuspended;
    }).length,
    newThisMonth: users.filter(user => {
      if (!user.createdAt) return false;
      try {
        const userDate = new Date(user.createdAt);
        const monthStart = startOfMonth(new Date());
        return userDate >= monthStart;
      } catch {
        return false;
      }
    }).length
  };


  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    const uid = userToDelete.uid;

    try {
      // Delete all chat rooms + messages first (includes rooms/messages for user's complaints)
      const { chatRoomsDeleted, messagesDeleted } = await MessageService.deleteAllDataForUser(uid);

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
      
      // Track which representatives need their case counts updated
      const representativesToUpdate = new Map<string, number>();
      
      reportsSnapshot.docs.forEach((reportDoc) => {
        const reportData = reportDoc.data();
        // Track assigned handler for active cases
        if (reportData.assignedTo && reportData.status !== 'resolved' && reportData.status !== 'dismissed') {
          const currentCount = representativesToUpdate.get(reportData.assignedTo) || 0;
          representativesToUpdate.set(reportData.assignedTo, currentCount + 1);
        }
        batch.delete(reportDoc.ref);
      });
      
      // Delete all complaints by this user (both userId and complainantId fields)
      const complaintsByUserIdQuery = query(
        collection(db, 'complaints'),
        where('userId', '==', uid)
      );
      const complaintsByComplainantIdQuery = query(
        collection(db, 'complaints'),
        where('complainantId', '==', uid)
      );
      const [complaintsByUserIdSnap, complaintsByComplainantIdSnap] = await Promise.all([
        getDocs(complaintsByUserIdQuery),
        getDocs(complaintsByComplainantIdQuery),
      ]);
      const complaintDocsToDelete = new Map<string, typeof complaintsByUserIdSnap.docs[0]>();
      complaintsByUserIdSnap.docs.forEach((d) => complaintDocsToDelete.set(d.id, d));
      complaintsByComplainantIdSnap.docs.forEach((d) => complaintDocsToDelete.set(d.id, d));

      complaintDocsToDelete.forEach((complaintDoc) => {
        const complaintData = complaintDoc.data();
        // Track assigned handler for active cases
        if (complaintData.assignedTo && complaintData.status !== 'resolved' && complaintData.status !== 'dismissed') {
          const currentCount = representativesToUpdate.get(complaintData.assignedTo) || 0;
          representativesToUpdate.set(complaintData.assignedTo, currentCount + 1);
        }
        batch.delete(complaintDoc.ref);
      });
      
      // Delete all notifications for this user
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', uid)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.docs.forEach((notifDoc) => {
        batch.delete(notifDoc.ref);
      });
      
      // Delete all internal notes created by this user
      const notesQuery = query(
        collection(db, 'internalNotes'),
        where('createdBy', '==', uid)
      );
      const notesSnapshot = await getDocs(notesQuery);
      notesSnapshot.docs.forEach((noteDoc) => {
        batch.delete(noteDoc.ref);
      });
      
      // Delete all activity logs for this user
      const activityQuery = query(
        collection(db, 'activities'),
        where('userId', '==', uid)
      );
      const activitySnapshot = await getDocs(activityQuery);
      activitySnapshot.docs.forEach((activityDoc) => {
        batch.delete(activityDoc.ref);
      });
      
      // Update representative activeCases counts
      for (const [repId, casesToSubtract] of representativesToUpdate.entries()) {
        const repRef = doc(db, 'representatives', repId);
        const repSnap = await getDoc(repRef);
        if (repSnap.exists()) {
          const repData = repSnap.data();
          const newActiveCases = Math.max(0, (repData.activeCases || 0) - casesToSubtract);
          batch.update(repRef, {
            activeCases: newActiveCases,
            updatedAt: new Date()
          });
        }
      }
      
      // Delete user document
      const userRef = doc(db, 'users', uid);
      batch.delete(userRef);
      
      // Commit all deletions
      await batch.commit();
      
      setUsers(users.filter(user => user.uid !== uid));
      
      const complaintsDeletedCount = complaintDocsToDelete.size;

      const totalDeleted = reportsSnapshot.size + complaintsDeletedCount + 
                          notificationsSnapshot.size + messagesDeleted + 
                          notesSnapshot.size + activitySnapshot.size + 
                          chatRoomsDeleted;
      
      toast({
        title: "User Completely Deleted",
        description: `Removed user and ${totalDeleted} associated records (${reportsSnapshot.size} reports, ${complaintsDeletedCount} complaints, ${chatRoomsDeleted} chat rooms, ${messagesDeleted} messages)`,
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
      role: user.representativeRole || ''
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
          role: roleFormData.role as RepresentativeRole
        });
      } else {
        // Create new representative record
        await RepresentativeService.create({
          userId: selectedUser.uid,
          email: selectedUser.email,
          displayName: selectedUser.displayName || selectedUser.email,
          role: roleFormData.role as RepresentativeRole,
          position: '',
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

  const toggleSuspendUser = async (user: User) => {
    const action = user.isSuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} ${user.alias || user.displayName}?`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isSuspended: !user.isSuspended
      });

      toast({
        title: "Success",
        description: `User ${action}d successfully`,
      });
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} user`,
        variant: "destructive",
      });
    }
  };

  const viewUserDetails = async (user: User) => {
    try {
      // Fetch user's reports
      const reportsQuery = query(
        collection(db, 'reports'),
        where('userId', '==', user.uid)
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      const reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUserReports(reports);
      setSelectedUser(user);
      setViewUserDialogOpen(true);
    } catch (error) {
      console.error('Error fetching user reports:', error);
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateValue: any) => {
    try {
      // Handle Firestore Timestamp
      if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // Handle YYYY-MM-DD string format
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return new Date(dateValue + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // Handle regular date strings
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Mask email for privacy (show first 4 chars + **** + domain)
  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const visibleChars = Math.min(4, localPart.length);
    const masked = localPart.substring(0, visibleChars) + '****';
    return `${masked}@${domain}`;
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
    <div className="w-full space-y-6 pb-10" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">User Accounts</p>
        <h1 className="text-xl font-bold text-gray-900">Users Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage user accounts and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E1F5EE' }}>
                <Users2 className="h-5 w-5" style={{ color: '#1D9E75' }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total Users</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E1F5EE' }}>
                <UserCheck className="h-5 w-5" style={{ color: '#1D9E75' }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeToday}</p>
            <p className="text-xs text-gray-500 mt-1">Active Today</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E1F5EE' }}>
                <UserPlus className="h-5 w-5" style={{ color: '#1D9E75' }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
            <p className="text-xs text-gray-500 mt-1">New This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="suspended">Suspended Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>
            Showing <span className="font-semibold text-gray-900">{filteredUsers.length}</span> of <span className="font-semibold text-gray-900">{users.length}</span> users
          </span>
          {filteredUsers.length < users.length && (
            <span className="text-xs text-amber-600 font-medium">
              ({users.length - filteredUsers.length} filtered out)
            </span>
          )}
          <button
            onClick={() => fetchUsers()}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alias</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
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
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold">
                      {(user.alias || user.displayName || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.alias === 'N/A' || !user.alias ? (
                          <span className="text-gray-400 italic">Anonymous User</span>
                        ) : (
                          user.alias || user.displayName || <span className="text-gray-400 italic">Anonymous User</span>
                        )}
                      </div>
                      {user.position && (
                        <div className="text-xs text-gray-500">{user.position}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {maskEmail(user.email)}
                </TableCell>
                <TableCell>
                  {user.isSuspended ? (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 px-3 py-1 text-xs font-bold">
                      <Ban className="h-3 w-3 mr-1" />
                      Suspended
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 px-3 py-1 text-xs font-bold">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm font-semibold text-gray-900">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-gray-400" />
                    {user.reportsCount || 0}
                  </div>
                </TableCell>
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
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => viewUserDetails(user)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openAssignRoleDialog(user)}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        Assign as Representative
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => handleDeleteClick(user)}
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

      {/* View User Dialog */}
      <Dialog open={viewUserDialogOpen} onOpenChange={setViewUserDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View information and report history for {selectedUser?.alias || selectedUser?.displayName}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Alias</Label>
                  <p className="font-medium">{selectedUser.alias || selectedUser.displayName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-medium">{maskEmail(selectedUser.email)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Position</Label>
                  <p className="font-medium">{selectedUser.position || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div className="mt-1">
                    {selectedUser.isSuspended ? (
                      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                        Suspended
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Created At</Label>
                  <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Total Reports</Label>
                  <p className="font-medium">{selectedUser.reportsCount || 0}</p>
                </div>
              </div>

              {/* Report History */}
              <div>
                <Label className="text-sm font-bold mb-2 block">Report History</Label>
                {userReports.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No reports submitted yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {userReports.map((report) => (
                      <div key={report.id} className="p-3 border rounded-lg bg-gray-50">
                        <p className="font-medium text-sm">{report.title || 'Untitled Report'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {report.category} • {formatDate(report.createdAt || report.reportedAt)}
                        </p>
                        {report.status && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {report.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUserDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Representative Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.alias || selectedUser?.displayName} ({selectedUser?.email ? maskEmail(selectedUser.email) : ''}). This user will be moved to the Representatives page.
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
                  <SelectItem value="handler">CODI Member</SelectItem>
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

      {/* Delete User Modal */}
      {userToDelete && (
        <DeleteUserModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          username={userToDelete.alias || userToDelete.displayName}
          reportCount={userToDelete.reportsCount || 0}
          onConfirmDelete={deleteUser}
        />
      )}
    </div>
  );
};

export default UsersManagement;
