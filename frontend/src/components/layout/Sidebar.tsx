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
import { useState } from "react";
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

  const navigation: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "File a Complaint", href: "/complaints/new", icon: FileText },
    { name: "My Cases", href: "/complaints", icon: Briefcase, badge: unreadCasesCount },
    { name: "Know Your Rights", href: "/group-chats", icon: ShieldCheck },
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

  return (
    <>
    {/* ── Desktop sidebar ── */}
    <aside className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-68 border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
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

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isKnowYourRights = item.href === "/group-chats";

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
                    "flex items-center gap-3 px-3.5 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative group",
                    active
                      ? "bg-[#16A34A] text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
                {/* Sub-navigation for Know Your Rights */}
                {isKnowYourRights && active && (
                  <div className="mt-1 ml-4 border-l-2 border-[#16A34A]/20 pl-3 space-y-0.5">
                    {subNav.map(sub => {
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.hash}
                          onClick={() => router.push(`/group-chats?tab=${sub.hash}`)}
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

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 w-full group"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-600" />
            <span>Sign Out</span>
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
