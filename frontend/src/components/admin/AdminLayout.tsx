import React, { useState, useEffect } from 'react';
import { Link, useLocation } from '../../compat/router';
import { 
  Users, 
  FileText, 
  Settings, 
  Layout, 
  BarChart,
  Shield,
  LogOut,
  UserPlus,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  User
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

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { role } = useRepresentativeRole();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  // Real-time listener for pending reports count
  useEffect(() => {
    const reportsQuery = query(
      collection(db, 'reports'),
      where('status', 'in', ['pending', 'inProgress'])
    );

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        setPendingReportsCount(snapshot.size);
      },
      (error) => {
        console.error('Error fetching pending reports count:', error);
        setPendingReportsCount(0);
      }
    );

    return () => unsubscribe();
  }, []);

  // Navigation for Handlers (Case Management Only)
  const handlerNav = [
    {
      label: 'My Cases',
      icon: FileText,
      href: '/admin/reports',
      description: 'View and manage assigned cases'
    },
    {
      label: 'Analytics',
      icon: BarChart,
      href: '/admin/analytics',
      description: 'View analytics and reports summary'
    },
  ];

  // Full navigation for Admin
  const fullAdminNav = [
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
      description: undefined
    },
    { 
      label: 'Analytics', 
      icon: BarChart, 
      href: '/admin/analytics',
      description: undefined
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
  let navigationItems = fullAdminNav;
  
  if (role === 'handler' && !isAdmin) {
    navigationItems = handlerNav;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar Layout */}
      <>
          {/* Sidebar */}
          <div className={cn(
            "fixed inset-y-0 left-0 bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300",
            sidebarCollapsed ? "w-20" : "w-64"
          )}>
            <div className="flex flex-col h-full">
              {/* Logo */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <img
                    src={gcLogo}
                    alt="SpeakUp GC Logo"
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      console.error('Failed to load logo:', e);
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA3YWI3IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyczgtNCA4LTEwVjVsLTgtMy02IDJoMDFWMTJjMCA2LTggMTAtOCAxMHoiPjwvcGF0aD48L3N2Zz4=';
                    }}
                  />
                  {!sidebarCollapsed && <span className="text-lg font-semibold">SpeakUp GC</span>}
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 py-6 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 mx-3 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === item.href
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                    title={sidebarCollapsed ? item.label : item.description}
                  >
                    {location.pathname === item.href && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                    )}
                    <div className="relative">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {item.label === 'Reports' && pendingReportsCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">{pendingReportsCount}</span>
                        </div>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div>{item.label}</div>
                      </div>
                    )}
                  </Link>
                ))}
              </nav>

              {/* User Section */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2 py-2">
                  {!sidebarCollapsed ? (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate mb-1.5">
                          {user?.displayName}
                        </p>
                        <div>
                          {role === 'handler' && !isAdmin && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                              <FileText className="h-3 w-3 mr-1" />
                              Handler
                            </Badge>
                          )}
                          {isAdmin && (
                            <Badge variant="default" className="text-[10px] px-2 py-0.5">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLogoutDialog(true)}
                        className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100"
                        title="Logout"
                      >
                        <LogOut className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowLogoutDialog(true)}
                      className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 mx-auto"
                      title="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content with Topbar */}
          <div className={cn(
            "flex-1 min-h-screen transition-all duration-300 flex flex-col",
            sidebarCollapsed ? "ml-20" : "ml-64"
          )}>
            {/* Topbar */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden md:block">
                      <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                      {isAdmin && (
                        <p className="text-xs text-gray-500">Administrator</p>
                      )}
                      {role === 'handler' && !isAdmin && (
                        <p className="text-xs text-gray-500">Case Handler</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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