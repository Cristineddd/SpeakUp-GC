import React, { useState, useEffect } from "react";
import {
  X, ArrowRight, ArrowLeft, UserPlus, LogIn, Mail, Lock,
  MessageSquare, Users, Shield, Sparkles, CheckCircle2, Eye, EyeOff, Loader, Check
} from "lucide-react";
import { useNavigate } from "../compat/router";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { PasswordStrengthChecker } from "./auth/PasswordStrengthChecker";
import { validatePassword } from "../utils/passwordValidation";
import { TermsModal } from "./TermsModal";
import { auth } from "../firebase";
import { signOut, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { GOOGLE_SIGN_IN_ENABLED } from "../config";

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: ModalView;
}

type ModalView = "choose" | "login" | "signup-email" | "signup-password" | "signup-done" | "explore";

const WalkthroughModal: React.FC<WalkthroughModalProps> = ({ isOpen, onClose, initialView }) => {
  const [view, setView] = useState<ModalView>("choose");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loginWithGoogle, register, signUpWithGoogle, isAuthenticated, currentUser, isAdmin, isLoading } = useAuth();

  // Set to true right after a login/signup call succeeds. AuthContext updates
  // `currentUser` asynchronously (via Firebase's onAuthStateChanged listener),
  // separately from the sign-in promise resolving — navigating immediately after
  // that promise resolves races ahead of the context update and gets bounced back
  // to /login by ProtectedRoute. Waiting for `currentUser`/`isAuthenticated` here
  // (same pattern as views/auth/Login.tsx) avoids that race.
  const [pendingRedirect, setPendingRedirect] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({ email: "", password: "", confirmPassword: "", agreeTerms: false });
  const [signupStep, setSignupStep] = useState<"email" | "password">("email");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isSignupGoogleLoading, setIsSignupGoogleLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setView(initialView || "choose");
      setDirection("forward");
      setLoginData({ email: "", password: "" });
      setSignupData({ email: "", password: "", confirmPassword: "", agreeTerms: false });
      setSignupStep("email");
    }
  }, [isOpen, initialView]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Fires once AuthContext has caught up with a successful sign-in (currentUser
  // populated via Firebase's onAuthStateChanged listener) so ProtectedRoute won't
  // bounce the user back to /login. Includes a safety timeout in case the context
  // update stalls. Must stay above the `if (!isOpen)` early return below so hook
  // order stays consistent across renders (Rules of Hooks).
  useEffect(() => {
    if (!pendingRedirect) return;

    const finishRedirect = () => {
      setPendingRedirect(false);
      setIsLoginLoading(false);
      setIsGoogleLoading(false);
      setIsSignupGoogleLoading(false);
      setIsSignupLoading(false);
      localStorage.setItem("speakup_walkthrough_seen", "true");
      onClose();
      navigate(isAdmin ? "/admin" : "/dashboard");
    };

    if (isAuthenticated && currentUser && !isLoading) {
      finishRedirect();
      return;
    }

    const timeout = setTimeout(finishRedirect, 8000);
    return () => clearTimeout(timeout);
  }, [pendingRedirect, isAuthenticated, currentUser, isLoading, isAdmin, onClose, navigate]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem("speakup_walkthrough_seen", "true");
    onClose();
  };

  const goTo = (next: ModalView) => {
    const viewOrder: ModalView[] = ["choose", "login", "signup-email", "signup-password", "signup-done", "explore"];
    const curIdx = viewOrder.indexOf(view);
    const nextIdx = viewOrder.indexOf(next);
    setDirection(nextIdx >= curIdx ? "forward" : "back");
    setView(next);
  };

  // ─── Login handlers ───
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast({ title: "Missing fields", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    setIsLoginLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast({ title: "Login Successful", description: "Welcome back! Redirecting..." });
      setPendingRedirect(true);
    } catch (error: any) {
      let msg = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found") msg = "No account found with this email.";
      else if (error.code === "auth/wrong-password") msg = "Incorrect password.";
      else if (error.code === "auth/too-many-requests") msg = "Too many attempts. Try later.";
      else if (error.code === "auth/invalid-email") msg = "Invalid email address.";
      else if (error.message) msg = error.message;
      toast({ title: "Login failed", description: msg, variant: "destructive" });
      setIsLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast({ title: "Login Successful", description: "Welcome back! Redirecting..." });
      setPendingRedirect(true);
    } catch (error: any) {
      let msg = "Google Sign-In failed.";
      if (error.message?.includes('@gordoncollege.edu.ph')) msg = "Only @gordoncollege.edu.ph email addresses are allowed. Please use your Gordon College email.";
      else if (error.message?.includes("not registered")) msg = "This Google account is not registered. Please sign up first.";
      else if (error.message) msg = error.message;
      toast({ title: "Sign-In Failed", description: msg, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  // ─── Signup handlers ───
  const handleSignupEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@gordoncollege\.edu\.ph$/;
    if (!emailRegex.test(signupData.email)) {
      toast({ title: "Invalid Email Domain", description: "Only @gordoncollege.edu.ph email addresses are allowed.", variant: "destructive" });
      return;
    }
    if (!signupData.agreeTerms) {
      toast({ title: "Error", description: "You must agree to the Terms & Conditions and Privacy Policy", variant: "destructive" });
      return;
    }
    setSignupStep("password");
    goTo("signup-password");
    toast({ title: "Email Accepted!", description: "Please create a secure password for your account." });
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pv = validatePassword(signupData.password);
    if (!pv.isValid) {
      toast({ title: "Password Requirements Not Met", description: "Must have 8+ chars, uppercase, lowercase, and a number", variant: "destructive" });
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsSignupLoading(true);
    try {
      await register(signupData.email, signupData.password);
      await signOut(auth);
      goTo("signup-done");
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
    } catch (error: any) {
      let msg = "Failed to create account.";
      if (error.code === "auth/email-already-in-use") msg = "This email is already registered. Please sign in instead.";
      else if (error.code === "auth/weak-password") msg = "Password is too weak.";
      else if (error.code === "auth/invalid-email") msg = "Invalid email address.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSignupLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsSignupGoogleLoading(true);
    try {
      await signUpWithGoogle();
      toast({ title: "Account Created!", description: "Welcome to SpeakUp GC!" });
      setPendingRedirect(true);
    } catch (error: any) {
      let msg = error.message || "Failed to sign up with Google";
      if (error.message?.includes('@gordoncollege.edu.ph')) {
        msg = "Only @gordoncollege.edu.ph email addresses are allowed. Please use your Gordon College email.";
      }
      toast({ title: "Sign Up Failed", description: msg, variant: "destructive" });
      setIsSignupGoogleLoading(false);
    }
  };

  // Google SVG icon
  const GoogleIcon = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  // Color tokens (light green theme matching Landing page)
  const colors = {
    // Primary green
    primary: "#1D9E75",
    primaryHover: "#178F65",
    primaryLight: "rgba(26, 122, 69, 0.08)",
    primaryBorder: "rgba(26, 122, 69, 0.2)",
    // Text
    heading: "#1a2e1f",
    body: "#4b5e52",
    muted: "#7a8f82",
    placeholder: "#9ca8a0",
    // Surfaces
    modalBg: "#ffffff",
    inputBg: "#f5f9f7",
    inputBorder: "#d4e4db",
    inputFocus: "#1D9E75",
    cardBg: "#f0f7f3",
    cardBorder: "#d4e4db",
    divider: "#e2ece7",
    // Accent colors for icon badges
    loginBadge: "from-emerald-500 to-teal-600",
    signupBadge: "from-emerald-400 to-green-600",
    exploreBadge: "from-amber-400 to-orange-500",
    // Warning
    warningBg: "#fef9ee",
    warningBorder: "#f5d990",
    warningText: "#a16207",
    warningMuted: "#b88c2a",
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

        {/* Modal */}
        <div
          className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
          style={{ background: colors.modalBg, border: `1px solid ${colors.cardBorder}` }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3.5 right-3.5 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all"
            style={{ background: colors.primaryLight, color: colors.muted }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.primaryBorder; e.currentTarget.style.color = colors.heading; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.primaryLight; e.currentTarget.style.color = colors.muted; }}
          >
            <X size={15} />
          </button>

          {/* Progress bar */}
          <div className="h-1 flex-shrink-0" style={{ background: colors.divider }}>
            <div
              className="h-full transition-all duration-500 ease-out rounded-r-full"
              style={{
                width: view === "choose" ? "20%" : view === "login" ? "50%" : view === "signup-email" ? "40%" : view === "signup-password" ? "70%" : view === "signup-done" ? "90%" : "100%",
                background: colors.primary
              }}
            />
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 p-6 sm:p-7">
            {/* Logo */}
            <div className="flex flex-col items-center justify-center gap-1.5 mb-6">
              <img src="/LOGO.png" alt="GC Logo" className="w-10 h-10 object-contain" />
              <span className="text-sm font-semibold tracking-tight" style={{ color: colors.muted }}>SpeakUp GC</span>
            </div>

            {/* Animated view content */}
            <div
              key={view}
              className={`animate-in fade-in ${direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4"} duration-300`}
            >

              {/* ══════════ CHOOSE: LOGIN or SIGNUP ══════════ */}
              {view === "choose" && (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-center mb-1" style={{ color: colors.heading }}>Join the Community</h2>
                  <p className="text-sm text-center mb-8" style={{ color: colors.body }}>How would you like to continue?</p>

                  <div className="space-y-3">
                    <button
                      onClick={() => goTo("signup-email")}
                      className="w-full h-14 text-white font-medium text-sm rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-3"
                      style={{ background: colors.primary }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.primaryHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = colors.primary}
                    >
                      <UserPlus size={18} />
                      Create a New Account
                    </button>
                    <button
                      onClick={() => goTo("login")}
                      className="w-full h-14 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-3"
                      style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.heading }}
                    >
                      <LogIn size={18} />
                      I Already Have an Account
                    </button>
                  </div>
                </>
              )}

              {/* ══════════ LOGIN FORM ══════════ */}
              {view === "login" && (
                <>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-1" style={{ color: colors.heading }}>Welcome back!</h2>
                  <p className="text-sm text-center mb-7" style={{ color: colors.muted }}>Sign in to continue reporting safely</p>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.body }}>Email <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.muted }} />
                        <input
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData(p => ({ ...p, email: e.target.value }))}
                          className="w-full h-11 pl-10 pr-3 rounded-xl text-sm focus:outline-none transition-all"
                          style={{ background: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, color: colors.heading }}
                          onFocus={(e) => e.currentTarget.style.borderColor = colors.inputFocus}
                          onBlur={(e) => e.currentTarget.style.borderColor = colors.inputBorder}
                          placeholder="you@gordoncollege.edu.ph"
                          required
                          disabled={isLoginLoading || isGoogleLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.body }}>Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.muted }} />
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          value={loginData.password}
                          onChange={(e) => setLoginData(p => ({ ...p, password: e.target.value }))}
                          className="w-full h-11 pl-10 pr-10 rounded-xl text-sm focus:outline-none transition-all"
                          style={{ background: colors.inputBg, border: `1.5px solid ${colors.inputBorder}`, color: colors.heading }}
                          onFocus={(e) => e.currentTarget.style.borderColor = colors.inputFocus}
                          onBlur={(e) => e.currentTarget.style.borderColor = colors.inputBorder}
                          placeholder="Enter your password"
                          required
                          disabled={isLoginLoading || isGoogleLoading}
                        />
                        <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: colors.muted }}>
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoginLoading || isGoogleLoading}
                      className="w-full h-11 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                      style={{ background: colors.primary }}
                      onMouseEnter={(e) => !isLoginLoading && (e.currentTarget.style.background = colors.primaryHover)}
                      onMouseLeave={(e) => e.currentTarget.style.background = colors.primary}
                    >
                      {isLoginLoading ? <><Loader className="animate-spin h-4 w-4" /> Logging in…</> : "Log In"}
                    </button>
                  </form>

                  {GOOGLE_SIGN_IN_ENABLED && (
                    <>
                      {/* Divider */}
                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: `1px solid ${colors.divider}` }} /></div>
                        <div className="relative flex justify-center text-xs"><span className="px-2 font-medium" style={{ background: colors.modalBg, color: colors.muted }}>OR</span></div>
                      </div>

                      <button
                        type="button"
                        disabled={isGoogleLoading || isLoginLoading}
                        onClick={handleGoogleLogin}
                        className="w-full h-11 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:shadow-sm"
                        style={{ background: "#fff", border: `1.5px solid ${colors.cardBorder}`, color: colors.heading }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.cardBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                      >
                        {isGoogleLoading ? <><Loader className="animate-spin h-4 w-4" /> Signing in…</> : <><GoogleIcon /> Continue with Google</>}
                      </button>
                    </>
                  )}

                  <p className="text-sm mt-5 text-center" style={{ color: colors.body }}>
                    Need an account?{" "}
                    <button onClick={() => goTo("signup-email")} className="hover:underline font-semibold" style={{ color: colors.primary }}>Sign Up</button>
                  </p>
                </>
              )}

              {/* ══════════ SIGNUP – Email Step ══════════ */}
              {view === "signup-email" && (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-center mb-1" style={{ color: colors.heading }}>Create an account</h2>
                  <p className="text-sm text-center mb-6" style={{ color: colors.body }}>Join the SpeakUp GC community</p>

                  <form onSubmit={handleSignupEmailSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.body }}>Email <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.muted }} />
                        <input
                          type="email"
                          value={signupData.email}
                          onChange={(e) => setSignupData(p => ({ ...p, email: e.target.value }))}
                          className="w-full h-11 pl-10 pr-3 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                          style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.heading }}
                          placeholder="you@gordoncollege.edu.ph"
                          required
                        />
                      </div>
                    </div>

                    {/* Terms Agreement */}
                    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
                      <input
                        type="checkbox"
                        checked={signupData.agreeTerms}
                        onChange={(e) => setSignupData(p => ({ ...p, agreeTerms: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded cursor-pointer accent-emerald-600"
                        required
                      />
                      <label className="text-xs leading-relaxed cursor-pointer" style={{ color: colors.body }}>
                        I agree to the{" "}
                        <button type="button" onClick={() => setShowTermsModal(true)} className="hover:underline font-semibold" style={{ color: colors.primary }}>Terms & Conditions</button>
                        {" "}and{" "}
                        <button type="button" onClick={() => setShowPrivacyModal(true)} className="hover:underline font-semibold" style={{ color: colors.primary }}>Privacy Policy</button>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSignupLoading || !signupData.agreeTerms || !signupData.email}
                      className="w-full h-11 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: colors.primary }}
                      onMouseEnter={(e) => !isSignupLoading && (e.currentTarget.style.background = colors.primaryHover)}
                      onMouseLeave={(e) => e.currentTarget.style.background = colors.primary}
                    >
                      {isSignupLoading ? <><Loader className="animate-spin h-4 w-4" /> Continuing…</> : "Continue"}
                    </button>
                  </form>

                  {GOOGLE_SIGN_IN_ENABLED && (
                    <>
                      {/* Divider */}
                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: `1px solid ${colors.divider}` }} /></div>
                        <div className="relative flex justify-center text-xs"><span className="px-2" style={{ background: colors.modalBg, color: colors.muted }}>OR</span></div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleSignup}
                        disabled={isSignupGoogleLoading}
                        className="w-full h-11 font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.heading }}
                      >
                        {isSignupGoogleLoading ? <><Loader className="animate-spin h-4 w-4" /> Signing up…</> : <><GoogleIcon /> Continue with Google</>}
                      </button>
                    </>
                  )}

                  <p className="text-sm mt-4 text-center" style={{ color: colors.body }}>
                    Already have an account?{" "}
                    <button onClick={() => goTo("login")} className="hover:underline font-semibold" style={{ color: colors.primary }}>Log In</button>
                  </p>
                </>
              )}

              {/* ══════════ SIGNUP – Password Step ══════════ */}
              {view === "signup-password" && (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-center mb-1" style={{ color: colors.heading }}>Create a password</h2>
                  <p className="text-sm text-center mb-5" style={{ color: colors.body }}>Secure your account</p>

                  {/* Email display */}
                  <div className="rounded-lg p-3 flex items-center gap-3 mb-5" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
                    <Mail className="w-4 h-4 flex-shrink-0" style={{ color: colors.primary }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px]" style={{ color: colors.muted }}>Creating account for</p>
                      <p className="text-sm font-medium truncate" style={{ color: colors.heading }}>{signupData.email}</p>
                    </div>
                    <button onClick={() => goTo("signup-email")} className="text-[11px] hover:underline flex-shrink-0 font-semibold" style={{ color: colors.primary }}>Change</button>
                  </div>

                  <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.body }}>Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.muted }} />
                        <input
                          type={showSignupPassword ? "text" : "password"}
                          value={signupData.password}
                          onChange={(e) => setSignupData(p => ({ ...p, password: e.target.value }))}
                          className="w-full h-11 pl-10 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                          style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.heading }}
                          placeholder="Create a password"
                          required
                        />
                        <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: colors.muted }}>
                          {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {signupData.password && <div className="mt-2"><PasswordStrengthChecker password={signupData.password} showDetails={true} /></div>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.body }}>Confirm Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.muted }} />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData(p => ({ ...p, confirmPassword: e.target.value }))}
                          className="w-full h-11 pl-10 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                          style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.heading }}
                          placeholder="Confirm your password"
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: colors.muted }}>
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSignupLoading}
                      className="w-full h-11 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: colors.primary }}
                      onMouseEnter={(e) => !isSignupLoading && (e.currentTarget.style.background = colors.primaryHover)}
                      onMouseLeave={(e) => e.currentTarget.style.background = colors.primary}
                    >
                      {isSignupLoading ? <><Loader className="animate-spin h-4 w-4" /> Creating account…</> : "Create Account"}
                    </button>
                  </form>
                </>
              )}

              {/* ══════════ SIGNUP DONE – Verify Email ══════════ */}
              {view === "signup-done" && (
                <div className="space-y-5 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: colors.primaryLight }}>
                      <Mail className="w-8 h-8" style={{ color: colors.primary }} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: colors.heading }}>Check Your Email</h2>
                    <p className="text-sm" style={{ color: colors.body }}>
                      We sent a verification link to<br />
                      <span className="font-semibold" style={{ color: colors.heading }}>{signupData.email}</span>
                    </p>
                  </div>

                  <div className="rounded-lg p-4 text-left text-sm space-y-2" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.body }}>
                    <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.primary }} /> Click the verification link in the email</p>
                    <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.primary }} /> Your account will be activated</p>
                    <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.primary }} /> Sign in to access SpeakUp GC</p>
                  </div>

                  <div className="rounded-lg p-3 flex items-start gap-3 text-left" style={{ background: colors.warningBg, border: `1px solid ${colors.warningBorder}` }}>
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${colors.warningBorder}40` }}>
                      <span className="font-bold text-[10px]" style={{ color: colors.warningText }}>!</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: colors.warningText }}>Check Your Spam Folder</p>
                      <p className="text-[11px]" style={{ color: colors.warningMuted }}>The email may be in your Spam or Junk folder.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={async () => {
                        try {
                          setIsSignupLoading(true);
                          if (!signupData.email || !signupData.password) { toast({ title: "Missing credentials", variant: "destructive" }); return; }
                          await signInWithEmailAndPassword(auth, signupData.email, signupData.password);
                          const u = auth.currentUser;
                          if (u) {
                            await u.reload();
                            if (u.emailVerified) { toast({ title: "Email Verified", description: "Redirecting to dashboard." }); setPendingRedirect(true); return; }
                            else { toast({ title: "Not Verified", description: "Email not yet verified.", variant: "destructive" }); await signOut(auth); }
                          }
                        } catch (err: any) { toast({ title: "Check Failed", description: err.message, variant: "destructive" }); }
                        finally { setIsSignupLoading(false); }
                      }}
                      disabled={isSignupLoading}
                      className="flex-1 h-10 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
                      style={{ background: colors.primary }}
                      onMouseEnter={(e) => !isSignupLoading && (e.currentTarget.style.background = colors.primaryHover)}
                      onMouseLeave={(e) => e.currentTarget.style.background = colors.primary}
                    >
                      {isSignupLoading ? "Checking…" : "Check Verification"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setIsSignupLoading(true);
                          if (!signupData.email || !signupData.password) { toast({ title: "Missing credentials", variant: "destructive" }); return; }
                          await signInWithEmailAndPassword(auth, signupData.email, signupData.password);
                          const u = auth.currentUser;
                          if (u) { await sendEmailVerification(u); toast({ title: "Verification Sent" }); await signOut(auth); }
                        } catch (err: any) { toast({ title: "Resend Failed", description: err.message, variant: "destructive" }); }
                        finally { setIsSignupLoading(false); }
                      }}
                      disabled={isSignupLoading}
                      className="flex-1 h-10 font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
                      style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.body }}
                    >
                      Resend Email
                    </button>
                  </div>

                  <button onClick={() => goTo("login")} className="hover:underline text-sm font-semibold" style={{ color: colors.primary }}>
                    Go to Log In →
                  </button>
                </div>
              )}

              {/* ══════════ EXPLORE (final) ══════════ */}
              {view === "explore" && (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-center mb-1" style={{ color: colors.heading }}>What You Can Do</h2>
                  <p className="text-sm text-center mb-5" style={{ color: colors.body }}>Once you're in, explore these features</p>
                  <div className="grid grid-cols-2 gap-2.5 mb-6">
                    {[
                      { icon: MessageSquare, title: "Report Issues", desc: "Submit and track your reports easily" },
                      { icon: Users, title: "Community", desc: "Connect with others in your area" },
                      { icon: Shield, title: "Secure", desc: "Your data is always protected" },
                      { icon: Sparkles, title: "AI Assistant", desc: "Get help and learn with our built-in AI" },
                    ].map((c) => {
                      const CIcon = c.icon;
                      return (
                        <div key={c.title} className="p-3 rounded-xl transition-colors hover:shadow-sm" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
                          <CIcon className="w-5 h-5 mb-2" style={{ color: colors.primary }} />
                          <p className="text-sm font-semibold mb-0.5" style={{ color: colors.heading }}>{c.title}</p>
                          <p className="text-[11px] leading-snug" style={{ color: colors.muted }}>{c.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="w-full h-11 text-white font-medium text-sm rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    style={{ background: colors.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.primaryHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = colors.primary}
                  >
                    <CheckCircle2 size={16} />
                    Done — Close Walkthrough
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Footer: back only — hidden on login, signup-email, choose, signup-done */}
          {view !== "choose" && view !== "login" && view !== "signup-email" && view !== "signup-done" && (
            <div className="px-6 sm:px-8 pb-5 pt-3 flex items-center flex-shrink-0" style={{ borderTop: `1px solid ${colors.divider}` }}>
              <button
                onClick={() => {
                  if (view === "signup-password") goTo("signup-email");
                  else if (view === "explore") goTo("choose");
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: colors.muted }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="Terms & Conditions">
        <div className="space-y-6 text-foreground">
          <div><h3 className="text-lg font-semibold mb-2">Welcome to SpeakUp GC</h3><p className="text-muted-foreground">By using our platform, you agree to these terms and conditions. Please read them carefully to understand your rights and responsibilities.</p></div>
          <div><h3 className="font-semibold mb-2">Acceptable Use</h3><p className="text-muted-foreground">SpeakUp GC is a platform for reporting gender-based violence and harassment incidents in accordance with Philippine law. You agree to use this platform only for legitimate reporting purposes and not for false, malicious, or defamatory complaints.</p></div>
          <div><h3 className="font-semibold mb-2">Eligibility</h3><p className="text-muted-foreground">This platform is available to students, faculty, staff, and authorized personnel of Gordon College. By using SpeakUp GC, you confirm that you are eligible to file complaints under the Gordon College Committee on Decorum and Investigation (CODI).</p></div>
          <div><h3 className="font-semibold mb-2">Prohibited Actions</h3><p className="text-muted-foreground">You may not use SpeakUp GC to: (a) submit false or fabricated reports; (b) harass, threaten, or defame any individual; (c) violate any applicable laws or regulations; or (d) interfere with the proper functioning of the platform.</p></div>
          <div><h3 className="font-semibold mb-2">Governing Law</h3><p className="text-muted-foreground">This platform operates under Republic Act No. 11313 (Safe Spaces Act), Republic Act No. 7877 (Anti-Sexual Harassment Act), and the Gordon College Committee on Decorum and Investigation (GC-CODI) procedures. All complaints are subject to investigation and resolution in accordance with these legal frameworks.</p></div>
          <div><h3 className="font-semibold mb-2">Modifications</h3><p className="text-muted-foreground">Gordon College reserves the right to modify these terms at any time. Continued use of the platform constitutes acceptance of any changes.</p></div>
          <p className="text-sm text-muted-foreground italic">Last updated: March 17, 2026</p>
        </div>
      </TermsModal>

      {/* Privacy Policy Modal */}
      <TermsModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Privacy Policy">
        <div className="space-y-6 text-foreground">
          <div><h3 className="text-lg font-semibold mb-2">Privacy Policy</h3><p className="text-muted-foreground">Your privacy is our priority. SpeakUp GC is committed to protecting your personal information and ensuring a safe, confidential environment for all users.</p></div>
          <div><h3 className="font-semibold mb-2">Data Collection & Use</h3><p className="text-muted-foreground">All complaints submitted through SpeakUp GC are handled with strict confidentiality by the Diversity, Equity, and Inclusion Unit (DEIU) of Gordon College. Your identity will never be disclosed to respondents or any other party without your explicit consent.</p></div>
          <div><h3 className="font-semibold mb-2">Legal Compliance</h3><p className="text-muted-foreground">This system complies with Republic Act No. 10173 (Data Privacy Act of 2012), Republic Act No. 11313 (Safe Spaces Act), and the Gordon College Committee on Decorum and Investigation (CODI).</p></div>
          <div><h3 className="font-semibold mb-2">Data Security</h3><p className="text-muted-foreground">You may file complaints as an identified complainant or anonymously. Your data is stored securely using industry-standard encryption and accessed only by authorized DEIU personnel for investigation purposes.</p></div>
          <div><h3 className="font-semibold mb-2">Your Rights</h3><p className="text-muted-foreground">Under RA 10173, you have the right to access, correct, and request deletion of your personal data. You may also withdraw consent at any time, subject to legal and contractual restrictions.</p></div>
          <p className="text-sm text-muted-foreground italic">Last updated: March 17, 2026</p>
        </div>
      </TermsModal>
    </>
  );
};

export default WalkthroughModal;