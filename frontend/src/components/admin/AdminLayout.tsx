import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from '../../compat/router';
import { 
  Users, 
  FileText, 
  Settings, 
  Layout, 
  BarChart,
  LogOut,
  UserPlus,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  User,
  Archive,
  MessageSquare,
} from 'lucide-react';
const gcLogo = '/LOGO.png';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { MessageService } from '../../services/messageService';
import { AdminReportService } from '../../services/adminReportService';
import {
  CASE_SEEN_EVENT,
  countUnseenActionableCases,
} from '../../utils/caseQueueBadge';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  description?: string;
  showPendingBadge?: boolean;
  showUnreadBadge?: boolean;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout, isAdmin, currentUser } = useAuth();
  const { role, representativeData } = useRepresentativeRole();
  const isCODI = !isAdmin && ((role as string) === 'codi' || role === 'handler');
  const representativeId = representativeData?.id ?? null;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const queueDocsRef = useRef<QueryDocumentSnapshot<DocumentData>[]>([]);

  const recalcQueueBadge = useCallback(() => {
    if (!currentUser?.uid) {
      setPendingReportsCount(0);
      return;
    }

    const cases = queueDocsRef.current.map((docSnap) => ({
      id: docSnap.id,
      status: String(docSnap.data().status || ''),
      assignedTo: docSnap.data().assignedTo as string | undefined,
    }));

    setPendingReportsCount(
      countUnseenActionableCases(cases, currentUser.uid, {
        isCODI,
        representativeId,
      })
    );
  }, [currentUser?.uid, isCODI, representativeId]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminSidebarCollapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  // Clean legacy orphaned complaints once on load (updates badge counts)
  useEffect(() => {
    AdminReportService.cleanupOrphanedComplaints().catch((error) => {
      console.warn('Could not clean orphaned complaints:', error);
    });
  }, []);

  // Recalculate sidebar badge when a case is marked reviewed
  useEffect(() => {
    const handleCaseSeen = () => recalcQueueBadge();
    window.addEventListener(CASE_SEEN_EVENT, handleCaseSeen);
    return () => window.removeEventListener(CASE_SEEN_EVENT, handleCaseSeen);
  }, [recalcQueueBadge]);

  // Real-time listener for unseen actionable cases (scoped for CODI)
  useEffect(() => {
    if (!currentUser?.uid) {
      setPendingReportsCount(0);
      return;
    }

    const activeCasesQuery = query(
      collection(db, 'complaints'),
      where('status', 'in', ['pending', 'submitted', 'inProgress'])
    );

    const unsubscribe = onSnapshot(
      activeCasesQuery,
      (snapshot) => {
        queueDocsRef.current = snapshot.docs;
        recalcQueueBadge();
      },
      (error) => {
        console.error('Error fetching active cases count:', error);
        setPendingReportsCount(0);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, recalcQueueBadge]);

  // Real-time unread messages count (CODI inbox)
  useEffect(() => {
    if (!isCODI || !currentUser?.uid) {
      setUnreadMessagesCount(0);
      return;
    }

    const unsubscribe = MessageService.subscribeToUserChatRooms(
      currentUser.uid,
      (rooms) => {
        const total = rooms.reduce(
          (sum, room) => sum + (room.unreadCount?.[currentUser.uid] || 0),
          0
        );
        setUnreadMessagesCount(total);
      }
    );

    return () => unsubscribe();
  }, [isCODI, currentUser?.uid]);

  // Navigation for CODI members (case management only)
  const handlerNav: NavItem[] = [
    {
      label: 'Dashboard',
      icon: Layout,
      href: '/admin/dashboard',
      description: 'Overview and priorities',
    },
    {
      label: 'Case Queue',
      icon: FileText,
      href: '/admin/reports',
      description: 'Open cases you have not reviewed yet',
      showPendingBadge: true,
    },
    {
      label: 'Messages',
      icon: MessageSquare,
      href: '/admin/messages',
      description: 'Conversations with complainants',
      showUnreadBadge: true,
    },
    {
      label: 'Closed Cases',
      icon: Archive,
      href: '/admin/closed-cases',
      description: 'Cases you have closed',
    },
    {
      label: 'My Performance',
      icon: BarChart,
      href: '/admin/analytics',
      description: 'Your assigned case stats',
    },
  ];

  // Full navigation for Admin
  const fullAdminNav: NavItem[] = [
    { 
      label: 'Dashboard', 
      icon: Layout, 
      href: '/admin/dashboard',
      description: undefined
    },
    { 
      label: 'Representatives', 
      icon: UserPlus, 
      href: '/admin/representatives',
      description: undefined
    },
    { 
      label: 'Users', 
      icon: Users, 
      href: '/admin/users',
      description: undefined
    },
    { 
      label: 'Reports', 
      icon: FileText, 
      href: '/admin/reports',
      description: undefined,
      showPendingBadge: true,
    },
    { 
      label: 'Analytics', 
      icon: BarChart, 
      href: '/admin/analytics',
      description: undefined
    },
    { 
      label: 'Closed Cases', 
      icon: Archive, 
      href: '/admin/closed-cases',
      description: 'View archived and resolved cases'
    },
    { 
      label: 'Compliance Reports', 
      icon: FileCheck, 
      href: '/admin/compliance-reports',
      description: 'GDPR & privacy compliant reports'
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      href: '/admin/settings',
      description: undefined
    },
  ];

  // Choose navigation based on role
  const navigationItems: NavItem[] = isCODI ? handlerNav : fullAdminNav;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar Layout */}
      <>
          {/* Sidebar */}
          <div className={cn(
            "fixed inset-y-0 left-0 bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 z-20",
            sidebarCollapsed ? "w-20" : "w-64"
          )}>
            <div className="flex flex-col h-full">
              {/* Logo & Collapse Button */}
              <div className="px-6 py-6 border-b border-gray-200">
                {!sidebarCollapsed ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                        <img
                          src={gcLogo}
                          alt="SpeakUp GC Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error('Failed to load logo:', e);
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA3YWI3IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJyczgtNCA4LTEwVjVsLTgtMy02IDJoMDFWMTJjMCA2LTggMTAtOCAxMHoiPjwvcGF0aD48L3N2Zz4=';
                          }}
                        />
                      </div>
                      <h1 className="text-xl font-bold text-gray-900 leading-tight whitespace-nowrap">SpeakUp GC</h1>
                    </div>
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Collapse sidebar"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2">
                    <div className="w-9 h-9 flex items-center justify-center">
                      <img
                        src={gcLogo}
                        alt="SpeakUp GC Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => setSidebarCollapsed(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Expand sidebar"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navigationItems.map((item) => {
                  const active = location.pathname === item.href;
                  const badgeCount = item.showPendingBadge
                    ? pendingReportsCount
                    : item.showUnreadBadge
                    ? unreadMessagesCount
                    : 0;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl transition-all duration-200 relative group",
                        sidebarCollapsed ? "px-3 py-3.5 justify-center" : "px-4 py-3.5",
                        active
                          ? "bg-[#1D9E75] text-white shadow-md"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                      title={sidebarCollapsed ? item.label : item.description}
                    >
                      <div className="relative">
                        <item.icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
                        {badgeCount > 0 && sidebarCollapsed && (
                          <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full ${item.showUnreadBadge ? 'bg-[#1D9E75]' : 'bg-red-500'}`}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {badgeCount > 0 && (
                            <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white rounded-full ${item.showUnreadBadge ? 'bg-[#1D9E75]' : 'bg-red-500'}`}>
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User Profile */}
              {!sidebarCollapsed && (
                <div className="px-5 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1D9E75] to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{user?.displayName || 'Admin'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isAdmin ? 'Administrator' : isCODI ? 'CODI' : 'Staff'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="px-3 py-3 flex justify-center border-t border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1D9E75] to-emerald-600 flex items-center justify-center" title={user?.displayName || 'Admin'}>
                    <User className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}

              {/* Sign Out */}
              <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowLogoutDialog(true)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all duration-200 w-full group text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600",
                    sidebarCollapsed ? "px-3 py-3.5 justify-center" : "px-4 py-3.5"
                  )}
                  title={sidebarCollapsed ? "Sign Out" : undefined}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-600" />
                  {!sidebarCollapsed && <span>Sign Out</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content with Topbar */}
          <div className={cn(
            "flex-1 min-h-screen transition-all duration-300 flex flex-col",
            sidebarCollapsed ? "ml-20" : "ml-64"
          )}>
            {/* Topbar */}
            <div className="sticky top-0 z-50 flex h-14 items-center justify-end border-b border-gray-200 bg-white px-4 sm:h-16 sm:px-6">
              <NotificationBell variant="admin" />
            </div>
            <main className="flex-1 bg-gradient-to-b from-gray-50/90 to-gray-100/80 p-8">
              {children}
            </main>
          </div>
        </>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You'll need to log back in to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => logout()} className="bg-red-500 hover:bg-red-600">
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminLayout;