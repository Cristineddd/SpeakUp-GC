import { Link, useLocation } from "../../compat/router";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Briefcase,
  ShieldCheck, 
  LogOut,
  UserCircle,
  Scale,
  Phone,
  HelpCircle,
  Heart,
  Gavel,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useUnreadCasesCount } from "../../hooks/useUnreadCasesCount";
const gcLogo = '/LOGO.png';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
}

export default function Sidebar() {
  const location = useLocation();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const unreadCasesCount = useUnreadCasesCount();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        // Keep loading until user is available
        return;
      }

      try {
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const role = userDoc.data()?.role || 'complainant';
          setUserRole(role);
        } else {
          setUserRole('complainant');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('complainant');
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    }
  }, [isCollapsed]);

  const navigation: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "File a Complaint", href: "/complaints/new", icon: FileText },
    { name: "My Cases", href: "/complaints", icon: Briefcase, badge: unreadCasesCount },
    { name: "Know Your Rights", href: "/know-your-rights", icon: ShieldCheck },
    { name: "My Profile", href: "/account", icon: UserCircle },
  ];

  const isActive = (path: string) => {
    // Exact match first
    if (location.pathname === path) return true;
    
    // For nested routes, but exclude more specific paths
    // e.g., /complaints/new should NOT activate /complaints
    if (path !== '/' && path !== '/complaints') {
      return location.pathname.startsWith(path + '/');
    }
    
    // Special handling for /complaints - only match if it's exactly /complaints
    // and NOT /complaints/new or other sub-routes
    if (path === '/complaints') {
      return location.pathname === '/complaints' || 
             (location.pathname.startsWith('/complaints/') && 
              !location.pathname.startsWith('/complaints/new'));
    }
    
    return false;
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    logout();
  };

  // Don't render sidebar for non-complainant roles
  if (!roleLoading && userRole && userRole !== 'complainant') {
    return null;
  }

  // Show loading skeleton while checking role
  if (roleLoading) {
    return (
      <>
      {/* Desktop loading skeleton */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-68 flex flex-col border-r border-gray-200 bg-white">
          <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
            <div className="flex items-center gap-3 w-full">
              <div className="w-11 h-11 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="flex-1 px-4 py-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </aside>
      
      {/* Mobile loading skeleton */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-12 h-12 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {/* ── Desktop sidebar ── */}
    <aside className="hidden lg:flex lg:flex-shrink-0">
      <div className={cn(
        "flex flex-col border-r border-gray-200 bg-white transition-all duration-300",
        isCollapsed ? "w-20" : "w-68"
      )}>
        {/* Logo & Collapse Button */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                <img 
                  src={gcLogo} 
                  alt="Gordon College" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-gray-900 leading-tight">SpeakUp GC</h1>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">Gordon College DEIU</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 flex items-center justify-center">
                <img 
                  src={gcLogo} 
                  alt="Gordon College" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <div className="px-4 py-2 border-b border-gray-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isKnowYourRights = item.href === "/know-your-rights";

            const subNav = [
              { label: "Legal Rights",  hash: "laws",      icon: Scale       },
              { label: "How to Report", hash: "reporting", icon: FileText     },
              { label: "FAQs",          hash: "faq",       icon: HelpCircle  },
              { label: "Wellness",      hash: "wellness",  icon: Heart       },
              { label: "GC Policies",   hash: "policy",    icon: Gavel       },
            ];

            return (
              <div key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all duration-200 relative group",
                    isCollapsed ? "px-3 py-3.5 justify-center" : "px-4 py-3.5",
                    active
                      ? "bg-[#16A34A] text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
                {/* Sub-navigation for Know Your Rights */}
                {isKnowYourRights && active && !isCollapsed && (
                  <div className="mt-1 ml-4 border-l-2 border-[#16A34A]/20 pl-3 space-y-0.5">
                    {subNav.map(sub => {
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.hash}
                          onClick={() => router.push(`/know-your-rights?tab=${sub.hash}`)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-[#16A34A] hover:bg-green-50 rounded-md transition-colors group text-left"
                        >
                          <SubIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 group-hover:text-[#16A34A]" />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Help Center Card */}
        {!isCollapsed && (
          <div className="px-4 py-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 bg-white shadow-sm shrink-0">
                  <HelpCircle className="h-4 w-4 text-[#16A34A]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#15803D] mb-1">Need Help?</p>
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">
                    Contact DEIU for support and guidance.
                  </p>
                  <Link
                    to="/know-your-rights?tab=faq"
                    className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] flex items-center gap-1"
                  >
                    View FAQs →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 rounded-xl transition-all duration-200 w-full group text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600",
              isCollapsed ? "px-3 py-3.5 justify-center" : "px-4 py-3.5"
            )}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-600" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>

    {/* ── Mobile bottom nav ── */}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-2 safe-area-inset-bottom">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const mobileLabel: Record<string, string> = {
          "Dashboard": "Home",
          "File a Complaint": "Report",
          "My Cases": "Cases",
          "Know Your Rights": "Rights",
          "My Profile": "Profile",
        };
        const label = mobileLabel[item.name] ?? item.name;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors relative",
              active ? "text-[#16A34A]" : "text-gray-400 hover:text-gray-700"
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>

    {/* Sign-out confirmation */}
    <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out of SpeakUp GC?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmLogout}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Sign Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
