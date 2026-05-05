import React, { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, Mail, Lock, ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate, Link } from "../../compat/router";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
const logoImage = "/LOGO.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loginWithGoogle, isAuthenticated, isLoading, currentUser } = useAuth();
  
  // Check if admin/staff user is trying to access this page - redirect them
  useEffect(() => {
    if (isAuthenticated && currentUser && !isLoading) {
      const isAdmin = currentUser.isAdmin || false;
      const hasStaffRole = currentUser.role === 'admin' || currentUser.role === 'dean_coor' || currentUser.role === 'representative';
      
      if (isAdmin || hasStaffRole) {
        console.warn('🚫 Admin/Staff user detected on complainant login - redirecting to admin');
        navigate('/admin');
        return;
      }
      
      if (currentUser.role === 'user' || !currentUser.role) {
        console.log('✅ Regular user detected - redirecting to dashboard');
        navigate('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, currentUser, isLoading, navigate]);
  
  // Redirect based on user role after authentication
  useEffect(() => {
    if (isAuthenticated && currentUser && !isLoading) {
      const userRole = currentUser.role || 'user';
      switch (userRole) {
        case "user":
        default:
          navigate("/dashboard");
          break;
      }
    }
  }, [isAuthenticated, navigate, currentUser, isLoading]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsEmailLoading(true);

    try {
      await login(formData.email, formData.password);
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting...",
        variant: "default",
      });
    } catch (error: any) {
      let errorMessage = "Login failed. Please try again.";
      
      if (error.message?.includes('verify your email')) {
        toast({
          title: "Email Not Verified",
          description: (
            <div className="space-y-2">
              <p>{error.message}</p>
              <button
                onClick={() => navigate('/verify-email')}
                className="text-sm underline text-blue-600 hover:text-blue-700"
              >
                Go to verification page
              </button>
            </div>
          ),
          variant: "destructive",
          duration: 7000,
        });
        return;
      }
      
      switch (error.code) {
        case "auth/user-not-found": errorMessage = "No account found with this email."; break;
        case "auth/wrong-password": errorMessage = "Incorrect password."; break;
        case "auth/too-many-requests": errorMessage = "Too many attempts. Try later."; break;
        case "auth/invalid-email": errorMessage = "Invalid email address."; break;
        case "auth/user-disabled": errorMessage = "This account has been disabled."; break;
        default: errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting...",
        variant: "default",
      });
    } catch (error: any) {
      let errorMessage = "Google Sign-In failed. Please try again.";
      
      if (error.message?.includes('not registered')) {
        errorMessage = "This Google account is not registered. Please sign up first.";
      } else if (error.message?.includes('No account found')) {
        errorMessage = "No account found. Please sign up first using Google on the signup page.";
      } else if (error.message?.includes('cancelled')) {
        errorMessage = "Sign-in was cancelled.";
      } else if (error.message?.includes('popup blocked')) {
        errorMessage = "Pop-up was blocked. Please allow pop-ups and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (isLoading && !isEmailLoading && !isGoogleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a7a45]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a7a45] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#155f36] opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#22a05a] opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#176840] opacity-30 blur-3xl" />
        <div className="absolute top-[10%] right-[15%] w-16 h-16 rounded-xl bg-white/5 rotate-12 animate-pulse" />
        <div className="absolute bottom-[15%] left-[10%] w-20 h-20 rounded-full bg-white/5 animate-pulse delay-700" />
        <div className="absolute top-[60%] right-[8%] w-12 h-12 rounded-lg bg-white/5 -rotate-12 animate-pulse delay-1000" />
        <div className="absolute top-[20%] left-[20%] w-10 h-10 rounded-full bg-white/5 animate-pulse delay-500" />
      </div>

      {/* Back to home */}
      <div className="absolute top-5 left-5 z-50">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Centered card */}
      <div className="relative z-10 w-full max-w-[480px] bg-[#1a1a2e] rounded-2xl shadow-2xl overflow-hidden">
        {/* Card top: logo + heading */}
        <div className="px-8 pt-8 pb-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={String(logoImage)} alt="SpeakUp GC" className="h-9 w-auto" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            <span className="text-xl font-bold text-white">SpeakUp GC</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back!</h1>
          <p className="text-sm text-[#b5bac1]">We're so excited to see you again!</p>
        </div>

        {/* Card body */}
        <div className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
                Email or Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full h-11 px-3 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#1a7a45] transition-all"
                placeholder="you@email.com"
                required
                disabled={isEmailLoading || isGoogleLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="w-full h-11 px-3 pr-10 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#1a7a45] transition-all"
                  placeholder="Enter your password"
                  required
                  disabled={isEmailLoading || isGoogleLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-white transition-colors"
                  disabled={isEmailLoading || isGoogleLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <Link
                to="/forgot-password"
                className="text-xs text-[#1a7a45] hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isEmailLoading || isGoogleLoading}
              className="w-full h-11 bg-[#1a7a45] hover:bg-[#155f36] text-white font-medium text-sm rounded-[4px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isEmailLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Logging in…</span>
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#3f4147]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#1a1a2e] px-2 text-[#72767d]">OR</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            disabled={isGoogleLoading || isEmailLoading}
            onClick={handleGoogleLogin}
            className="w-full h-11 bg-white hover:bg-gray-100 text-[#1a1a2e] font-medium text-sm rounded-[4px] transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1a1a2e] border-t-transparent" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Footer links */}
          <p className="text-sm text-[#b5bac1] mt-4">
            Need an account?{" "}
            <Link to="/signup" className="text-[#3a9d68] hover:underline font-medium">
              Register
            </Link>
          </p>

          <p className="text-[11px] text-[#72767d] mt-3">
            Staff or Administrator?{" "}
            <Link to="/admin/login" className="text-[#3a9d68] hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;