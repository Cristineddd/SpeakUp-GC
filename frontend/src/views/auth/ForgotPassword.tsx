import React, { useState, useEffect } from "react";
import { ArrowLeft, Mail, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useSearchParams } from "../../compat/router";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";
import { useToast } from "../../hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Check if user came from password reset email
  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    if (mode === 'resetPassword' && oobCode) {
      // User clicked on the reset password email link
      // Redirect them to a custom password reset page or show instructions
      toast({
        title: "Password Reset Link Clicked",
        description: "Please complete your password reset by setting a new password.",
        variant: "default"
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@gordoncollege\.edu\.ph$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email Domain",
        description: "Only @gordoncollege.edu.ph email addresses are allowed.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("📨 Attempting to send password reset email to:", email);
      
      // Set up custom action code settings to point to our custom domain
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`, // Use current domain (localhost:8085 in dev)
        handleCodeInApp: false, // Don't handle in app, use our custom page
      };
      
      console.log("🔧 Action code settings:", actionCodeSettings);
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      
      setEmailSent(true);
      toast({
        title: "Reset Email Sent! ✨",
        description: `We've sent password reset instructions to ${email}`,
        variant: "default"
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send reset email. Please try again.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address. Please check your email or create a new account.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection and try again.";
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

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#1D9E75] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#178F65] opacity-60 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#22a05a] opacity-40 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-[440px] bg-[#1a1a2e] rounded-2xl shadow-2xl p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-[#1D9E75]/30 rounded-full flex items-center justify-center mb-5">
            <CheckCircle className="h-8 w-8 text-[#6ee7a0]" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Email Sent! 🎉</h2>
          
          <div className="bg-[#1e1f22] rounded-lg p-4 mb-5">
            <p className="text-sm text-[#b5bac1] mb-1">We sent reset instructions to:</p>
            <p className="font-semibold text-[#6ee7a0]">{email}</p>
          </div>

          <div className="bg-[#1e1f22] rounded-lg p-4 mb-5 text-left">
            <h3 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#6ee7a0]" />
              Next Steps
            </h3>
            <ol className="text-xs text-[#b5bac1] space-y-1 list-decimal list-inside">
              <li>Check your email inbox for the reset link</li>
              <li>Click the "Reset Password" button in the email</li>
              <li>Create a new secure password</li>
              <li>Return to SpeakUp GC and login</li>
            </ol>
          </div>

          <div className="bg-[#2b2d31] border border-[#f0b232]/20 rounded-lg p-3 mb-5">
            <p className="text-[11px] text-[#b5bac1]">
              <strong className="text-[#f0b232]">Can't find the email?</strong> Check your spam folder or try again.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => { setEmailSent(false); setEmail(""); }}
              className="w-full h-10 bg-[#2b2d31] hover:bg-[#35373c] text-[#b5bac1] text-sm rounded-[4px] border border-[#3f4147] transition-colors"
            >
              Send to Different Email
            </button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full h-10 bg-[#1D9E75] hover:bg-[#178F65] text-white text-sm font-medium rounded-[4px] transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1D9E75] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#178F65] opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#22a05a] opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#176840] opacity-30 blur-3xl" />
      </div>

      {/* Back to home */}
      <div className="absolute top-5 left-5 z-50">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-[#1a1a2e] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-8 pt-8 pb-2 text-center">
          <div className="mx-auto h-14 w-14 bg-[#1D9E75]/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-[#6ee7a0]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Reset Your Password</h1>
          <p className="text-sm text-[#b5bac1]">We'll send you a secure link to reset it.</p>
        </div>

        <div className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full h-11 px-3 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#1D9E75] hover:bg-[#178F65] text-white font-medium text-sm rounded-[4px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Reset Email
                </>
              )}
            </button>
          </form>

          <div className="mt-5 bg-[#1e1f22] rounded-lg p-3">
            <p className="text-[11px] text-[#72767d] flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#6ee7a0]" />
              Reset links expire after 1 hour. Check your spam folder if you don't see the email.
            </p>
          </div>

          <p className="text-sm text-[#b5bac1] mt-4">
            Remember your password?{" "}
            <Link to="/login" className="text-[#6ee7a0] hover:underline font-medium">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
