import React, { useState } from 'react';
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
  FileCheck
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

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { role } = useRepresentativeRole();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar Layout */}
      <>
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
            <div className="flex flex-col h-full">
              {/* Logo */}
              <div className="flex flex-col gap-2 px-6 py-4 border-b border-gray-200">
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
                  <span className="text-lg font-semibold">SpeakUp GC</span>
                </div>
                {role === 'handler' && !isAdmin && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Case Handler
                  </Badge>
                )}
                {isAdmin && (
                  <Badge variant="default" className="w-fit text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Administrator
                  </Badge>
                )}
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === item.href
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div>{item.label}</div>
                      {item.description && (
                        <div className={cn(
                          "text-xs mt-0.5",
                          location.pathname === item.href
                            ? "text-white/80"
                            : "text-gray-500"
                        )}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </nav>

              {/* User Section */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLogoutDialog(true)}
                    className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content — min height so the panel fills the viewport behind short pages */}
          <div className="min-h-screen pl-64">
            <main className="min-h-screen bg-gradient-to-b from-gray-50/90 to-gray-100/80 px-5 py-6 sm:px-8 sm:py-8">
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