import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "../../compat/router";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../../firebase";
import { useToast } from "../../hooks/use-toast";
import { ArrowLeft, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

const LOGIN_HREF = "/?auth=login";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 font-sans flex flex-col">
      <header className="w-full px-4 sm:px-6 pt-4 z-10">
        <div className="flex h-14 items-center justify-between bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl px-5 shadow-lg shadow-gray-900/5">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img src="/LOGO.png" alt="SpeakUp GC" className="w-8 h-8 object-contain flex-shrink-0" />
            <span className="font-bold text-gray-900 text-sm truncate">SpeakUp GC</span>
          </Link>
          <Link to={LOGIN_HREF} className="text-sm font-medium text-[#1D9E75] hover:text-[#178F65] transition-colors">
            Log In
          </Link>
        </div>
      </header>
      <main className="relative flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 -top-20 h-[22rem] w-[28rem] bg-gradient-to-br from-[#1D9E75]/20 via-emerald-200/35 to-transparent blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-[20rem] w-[24rem] bg-gradient-to-tl from-teal-200/35 via-[#1D9E75]/10 to-transparent blur-3xl" />
        </div>
        <div className="relative w-full max-w-md bg-white border border-[#d4e4db] rounded-2xl shadow-xl shadow-gray-900/5 p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [isValidCode, setIsValidCode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(true);
  const [resetComplete, setResetComplete] = useState(false);

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode || mode !== 'resetPassword') {
        toast({
          title: "Invalid Reset Link",
          description: "This password reset link is invalid or has expired.",
          variant: "destructive"
        });
        navigate('/forgot-password');
        return;
      }

      try {
        // Verify the password reset code and get the email
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setIsValidCode(true);
      } catch (error: any) {
        console.error("Error verifying reset code:", error);
        let errorMessage = "This password reset link is invalid or has expired.";
        
        if (error.code === 'auth/expired-action-code') {
          errorMessage = "This password reset link has expired. Please request a new one.";
        } else if (error.code === 'auth/invalid-action-code') {
          errorMessage = "This password reset link is invalid. Please request a new one.";
        }
        
        toast({
          title: "Invalid Reset Link",
          description: errorMessage,
          variant: "destructive"
        });
        
        // Redirect to forgot password page after a delay
        setTimeout(() => navigate('/forgot-password'), 3000);
      } finally {
        setIsCheckingCode(false);
      }
    };

    verifyCode();
  }, [oobCode, mode, navigate, toast]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Password Required",
        description: "Please enter and confirm your new password.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive"
      });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Password Too Weak",
        description: "Please ensure your password meets all security requirements.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setResetComplete(true);
      
      toast({
        title: "Password Reset Successful! 🎉",
        description: "Your password has been updated successfully.",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      let errorMessage = "Failed to reset password. Please try again.";
      
      if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.code === 'auth/expired-action-code') {
        errorMessage = "This password reset link has expired. Please request a new one.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingCode) {
    return (
      <AuthShell>
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1D9E75] border-t-transparent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1a2e1f] mb-1">Verifying reset link</h2>
          <p className="text-sm text-[#7a8f82]">Please wait a moment…</p>
        </div>
      </AuthShell>
    );
  }

  if (resetComplete) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
            <CheckCircle className="h-7 w-7 text-[#1D9E75]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1a2e1f] mb-2">Password updated</h2>
          <p className="text-sm text-[#4b5e52] mb-4">You can now sign in with your new password for</p>
          <div className="bg-[#f0f7f3] border border-[#d4e4db] rounded-xl px-4 py-3 mb-6">
            <p className="font-semibold text-[#1D9E75] text-sm break-all">{email}</p>
          </div>
          <Link
            to={LOGIN_HREF}
            className="w-full inline-flex items-center justify-center gap-2 h-11 bg-[#1D9E75] hover:bg-[#178F65] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Continue to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (!isValidCode) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto h-14 w-14 bg-red-50 rounded-full flex items-center justify-center mb-5">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1a2e1f] mb-2">Invalid reset link</h2>
          <p className="text-sm text-[#4b5e52] mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="space-y-2">
            <Link
              to="/forgot-password"
              className="w-full inline-flex items-center justify-center h-11 bg-[#1D9E75] hover:bg-[#178F65] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Request a new link
            </Link>
            <Link
              to={LOGIN_HREF}
              className="w-full inline-flex items-center justify-center gap-2 h-11 text-[#4b5e52] hover:text-[#1a2e1f] text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  const passwordValidation = validatePassword(newPassword);

  return (
    <AuthShell>
      <div className="flex flex-col items-center mb-6">
        <img src="/LOGO.png" alt="" className="w-10 h-10 object-contain mb-2" />
        <span className="text-sm font-semibold text-[#7a8f82]">SpeakUp GC</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-[#1a2e1f] mb-1">
        Set a new password
      </h2>
      <p className="text-sm text-center text-[#7a8f82] mb-5">
        Create a strong password for your account
      </p>
      <div className="bg-[#f0f7f3] border border-[#d4e4db] rounded-xl px-4 py-3 mb-6 text-center">
        <p className="text-xs text-[#7a8f82] mb-0.5">Resetting password for</p>
        <p className="text-sm font-semibold text-[#1D9E75] break-all">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wide text-[#4b5e52]">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              className="w-full h-11 pl-3 pr-10 rounded-xl text-sm text-[#1a2e1f] placeholder-[#9ca8a0] bg-[#f5f9f7] border-[1.5px] border-[#d4e4db] focus:outline-none focus:border-[#1D9E75] transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8f82] hover:text-[#1a2e1f]"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-[#4b5e52]">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="w-full h-11 pl-3 pr-10 rounded-xl text-sm text-[#1a2e1f] placeholder-[#9ca8a0] bg-[#f5f9f7] border-[1.5px] border-[#d4e4db] focus:outline-none focus:border-[#1D9E75] transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8f82] hover:text-[#1a2e1f]"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {newPassword && (
          <div className="bg-[#f8faf9] border border-[#e2ece7] rounded-xl p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4b5e52] mb-2">Password requirements</h4>
            <div className="space-y-1 text-xs">
              <div className={`flex items-center gap-2 ${passwordValidation.minLength ? "text-[#1D9E75]" : "text-red-500"}`}>
                <CheckCircle size={12} className={passwordValidation.minLength ? "opacity-100" : "opacity-30"} />
                At least 8 characters
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasUpperCase ? "text-[#1D9E75]" : "text-red-500"}`}>
                <CheckCircle size={12} className={passwordValidation.hasUpperCase ? "opacity-100" : "opacity-30"} />
                One uppercase letter
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasLowerCase ? "text-[#1D9E75]" : "text-red-500"}`}>
                <CheckCircle size={12} className={passwordValidation.hasLowerCase ? "opacity-100" : "opacity-30"} />
                One lowercase letter
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasNumbers ? "text-[#1D9E75]" : "text-red-500"}`}>
                <CheckCircle size={12} className={passwordValidation.hasNumbers ? "opacity-100" : "opacity-30"} />
                One number
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? "text-[#1D9E75]" : "text-red-500"}`}>
                <CheckCircle size={12} className={passwordValidation.hasSpecialChar ? "opacity-100" : "opacity-30"} />
                One special character
              </div>
            </div>
          </div>
        )}

        {confirmPassword && (
          <p className={`text-sm ${newPassword === confirmPassword ? "text-[#1D9E75]" : "text-red-500"}`}>
            {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || !passwordValidation.isValid || newPassword !== confirmPassword}
          className="w-full h-11 bg-[#1D9E75] hover:bg-[#178F65] text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#1D9E75]/20"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Updating…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Update Password
            </>
          )}
        </button>
      </form>

      <div className="text-center mt-5">
        <Link
          to={LOGIN_HREF}
          className="inline-flex items-center gap-2 text-sm text-[#4b5e52] hover:text-[#1a2e1f] font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    </AuthShell>
  );
};

export default ResetPassword;
