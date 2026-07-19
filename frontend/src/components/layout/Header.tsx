import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, UserPlus, Home, ShieldAlert, BookOpen, MessageSquare, LogIn, User, ChevronDown, Users, KeyRound, Shield, FileText, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useLocation, useNavigate } from "../../compat/router";
import { cn } from "../../lib/utils";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

interface SubMenuItem {
  name: string;
  href: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  submenu?: SubMenuItem[];
}

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handleAnchorClick = (href: string, e: React.MouseEvent) => {
    // Only handle anchor links on home page
    if (href.startsWith('/#') && location.pathname === '/') {
      e.preventDefault();
      const hash = href.replace('/#', '#');
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Update URL without triggering navigation
        window.history.pushState(null, '', hash);
      }
    }
    // For regular links, let the default Link behavior handle it
  };

  // Don't render anything while checking auth state to prevent UI flickering
  if (isLoading) {
    return null;
  }

  const isActive = (path: string) => {
    // For home page without hash
    if (path === '/') {
      return location.pathname === '/' && !location.hash;
    }
    
    // For hash links on home page
    if (path.startsWith('/#')) {
      const targetHash = path.replace('/#', '#');
      return location.pathname === '/' && location.hash === targetHash;
    }
    
    // For regular paths — exact match or child route match (e.g. /complaints matches /complaints/new)
    if (location.pathname === path) return true;
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;

    return false;
  };

  const publicNavigation: NavigationItem[] = [
    { name: "Home", href: "/", icon: Home },
    { 
      name: "Features", 
      href: "/#features", 
      icon: null
    },
    { 
      name: "About", 
      href: "/#about", 
      icon: null,
      submenu: [
        { name: "Our Mission", href: "#mission" },
        { name: "Our Team", href: "#team" }
      ]
    },
  ];

  const protectedNavigation: NavigationItem[] = user?.isAdmin ? [
    {
      name: "Admin",
      href: "/admin",
      icon: ShieldAlert,
    },
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Complaints", href: "/complaints", icon: FileText },
    { name: "Know Your Rights", href: "/know-your-rights", icon: ShieldCheck },
    { name: "Browse Groups", href: "/browse-groups", icon: Users },
    { name: "Learning Hub", href: "/learn", icon: BookOpen },
    { name: "AI Assistant", href: "/chat", icon: MessageSquare },
  ] : [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Complaints", href: "/complaints", icon: FileText },
    { name: "Know Your Rights", href: "/know-your-rights", icon: ShieldCheck },
    { name: "Browse Groups", href: "/browse-groups", icon: Users },
    { name: "Learning Hub", href: "/learn", icon: BookOpen },
    { name: "AI Assistant", href: "/chat", icon: MessageSquare },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowLogoutDialog(false);
    setIsMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleChangePassword = () => {
    setShowPasswordConfirmDialog(true);
  };

  const handleConfirmPasswordChange = async () => {
    try {
      setIsResettingPassword(true);
      if (user?.email) {
        await sendPasswordResetEmail(auth, user.email);
        setShowPasswordConfirmDialog(false);
        setShowPasswordResetDialog(true);
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Failed to send password reset email. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getFirstName = (displayName: string | undefined | null) => {
    if (!displayName) return 'Account';
    return displayName.split(' ')[0];
  };

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 w-full">
      <nav className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 lg:h-16">
          <div className="flex items-center flex-shrink-0 mr-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-primary/10 group-hover:scale-105 transition-transform duration-300">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
              </div>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-primary whitespace-nowrap">SpeakUp GC</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 mx-4 xl:mx-6">
            <div className="flex items-center gap-0.5 xl:gap-1 overflow-x-auto scrollbar-hide">
              {(isAuthenticated ? protectedNavigation : publicNavigation).map((item) => {
                const Icon = item.icon;
                const hasSubmenu = item.submenu && item.submenu.length > 0;

                if (!hasSubmenu) {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 xl:px-3 py-1.5 text-xs xl:text-sm font-medium whitespace-nowrap transition-colors duration-200 border-b-2 border-transparent",
                        isActive(item.href) 
                          ? 'text-primary border-primary'
                          : 'text-foreground/70 hover:text-foreground hover:border-foreground/30'
                      )}
                      onClick={(e) => handleAnchorClick(item.href, e)}
                    >
                      {item.name}
                    </Link>
                  );
                }

                return (
                  <div key={item.name} className="relative group" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => toggleDropdown(item.name)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 xl:px-3 py-1.5 text-xs xl:text-sm font-medium whitespace-nowrap transition-colors duration-200 border-b-2 border-transparent",
                        isActive(item.href) || 
                        (item.submenu?.some(subItem => {
                          const target = subItem.href.startsWith('#') ? `/${subItem.href}` : subItem.href;
                          return isActive(target);
                        }))
                          ? 'text-primary border-primary'
                          : 'text-foreground/70 hover:text-foreground hover:border-foreground/30'
                      )}
                      aria-haspopup="menu"
                      aria-expanded={openDropdown === item.name}
                    >
                      {item.name}
                      <ChevronDown
                        className={cn(
                          "ml-1 h-4 w-4 transition-transform duration-200",
                          openDropdown === item.name ? 'rotate-180' : ''
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    <div
                      className={cn(
                        "absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-background shadow-lg ring-1 ring-foreground/5 focus:outline-none transition-all duration-200 z-50",
                        openDropdown === item.name
                          ? 'opacity-100 translate-y-0 visible'
                          : 'opacity-0 -translate-y-2 invisible'
                      )}
                      role="menu"
                      aria-orientation="vertical"
                      tabIndex={-1}
                    >
                      <div className="py-1" role="none">
                        {item.submenu?.map((subItem) => {
                          const target = subItem.href.startsWith('#') ? `/${subItem.href}` : subItem.href;
                          return (
                            <Link
                              key={subItem.name}
                              to={target}
                              className={cn(
                                "block px-4 py-2 text-sm transition-colors duration-200",
                                isActive(target)
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                              )}
                              role="menuitem"
                              tabIndex={-1}
                              onClick={(e) => {
                                setOpenDropdown(null);
                                handleAnchorClick(target, e);
                              }}
                            >
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 xl:gap-3 ml-4 flex-shrink-0">
            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      <span>{getFirstName(user?.displayName)}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Account</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleChangePassword}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      <span>Change Password</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogoutClick}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login" className="flex items-center">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/signup" className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-foreground hover:bg-muted focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-background border-t border-border">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {(isAuthenticated ? protectedNavigation : publicNavigation).map((item) => {
              const Icon = item.icon;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isDropdownOpen = openDropdown === item.name;
              
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center">
                    <Link
                      to={item.href}
                      className={cn(
                        "flex-grow px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center",
                        isActive(item.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                      )}
                      onClick={(e) => {
                        handleAnchorClick(item.href, e);
                        if (!hasSubmenu) {
                          setIsMenuOpen(false);
                        }
                      }}
                    >
                      {Icon && <Icon className="mr-3 h-5 w-5" />}
                      {item.name}
                    </Link>
                    {hasSubmenu && (
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        className="p-2 -mr-2 text-foreground/70 hover:text-foreground"
                        aria-expanded={isDropdownOpen}
                      >
                        <ChevronDown 
                          className={cn(
                            "h-5 w-5 transition-transform duration-200",
                            isDropdownOpen ? 'rotate-180' : ''
                          )} 
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                  
                  {hasSubmenu && isDropdownOpen && (
                    <div className="ml-8 space-y-1">
                      {item.submenu?.map((subItem) => {
                        const target = subItem.href.startsWith('#') ? `/${subItem.href}` : subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            to={target}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors duration-200",
                              isActive(target)
                                ? 'bg-primary/10 text-primary'
                                : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                            )}
                            onClick={(e) => {
                              handleAnchorClick(target, e);
                              setIsMenuOpen(false);
                            }}
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-4 pb-2 border-t border-border mt-2">
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 mb-2">
                    <p className="text-xs text-muted-foreground">Account</p>
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      handleChangePassword();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground mb-2"
                  >
                    <KeyRound className="h-5 w-5" />
                    Change Password
                  </button>
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 hover:border-red-300 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90"
                  >
                    <UserPlus className="h-4 w-4" />
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be safely logged out of your SpeakUp GC account. You can log back in anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Change Confirmation Dialog */}
      <AlertDialog open={showPasswordConfirmDialog} onOpenChange={setShowPasswordConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
            <AlertDialogDescription>
              We'll send a password reset link to <strong>{user?.email}</strong>. Please check your email and follow the instructions to set a new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingPassword}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmPasswordChange}
              disabled={isResettingPassword}
            >
              {isResettingPassword ? "Sending..." : "Send Reset Link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Success Dialog */}
      <AlertDialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>✨ Password Reset Email Sent</AlertDialogTitle>
            <AlertDialogDescription>
              We've sent a password reset link to <strong>{user?.email}</strong>. Please check your email (including spam folder) and follow the instructions to set your new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPasswordResetDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};

export default Header;