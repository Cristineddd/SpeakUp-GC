import React, { useState, useEffect } from "react";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useSearchParams } from "../../compat/router";
import { useToast } from "../../hooks/use-toast";
import { sendBrandedPasswordResetEmail } from "../../lib/sendPasswordResetEmail";
import { getAuthErrorMessage } from "../../utils/auth/firebaseErrorMessages";
import { isAdminEmail } from "../../utils/admin/adminConfig";

const LOGIN_HREF = "/?auth=login";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    if (mode === "resetPassword" && oobCode) {
      toast({
        title: "Password Reset Link Clicked",
        description: "Please complete your password reset by setting a new password.",
        variant: "default",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@gordoncollege\.edu\.ph$/;
    if (!emailRegex.test(email) && !isAdminEmail(email)) {
      toast({
        title: "Invalid Email Domain",
        description: "Only @gordoncollege.edu.ph email addresses are allowed.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await sendBrandedPasswordResetEmail(email);
      setEmailSent(true);
      toast({
        title: "Reset Email Sent",
        description: `We've sent password reset instructions to ${email}`,
        variant: "default",
      });
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: getAuthErrorMessage(error, "Failed to send reset email. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 font-sans flex flex-col">
      <main className="relative flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 -top-20 h-[22rem] w-[28rem] bg-gradient-to-br from-[#1D9E75]/20 via-emerald-200/35 to-transparent blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-[20rem] w-[24rem] bg-gradient-to-tl from-teal-200/35 via-[#1D9E75]/10 to-transparent blur-3xl" />
        </div>

        <div className="relative w-full max-w-md bg-white border border-[#d4e4db] rounded-2xl shadow-xl shadow-gray-900/5 p-6 sm:p-8">
          {emailSent ? (
            <div className="text-center">
              <div className="mx-auto h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                <CheckCircle className="h-7 w-7 text-[#1D9E75]" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#1a2e1f] mb-1">Check your email</h1>
              <p className="text-sm text-[#7a8f82] mb-5">We sent reset instructions to</p>
              <div className="bg-[#f0f7f3] border border-[#d4e4db] rounded-xl px-4 py-3 mb-5">
                <p className="font-semibold text-[#1D9E75] text-sm break-all">{email}</p>
              </div>
              <ol className="text-left text-sm text-[#4b5e52] space-y-2 mb-5 bg-[#f8faf9] border border-[#e2ece7] rounded-xl p-4 list-decimal list-inside">
                <li>Open the SpeakUp GC email</li>
                <li>Click Reset Password</li>
                <li>Choose a new password</li>
                <li>Sign in with your new password</li>
              </ol>
              <p className="text-xs text-[#a16207] bg-[#fef9ee] border border-[#f5d990] rounded-xl px-3 py-2.5 mb-5">
                Can’t find it? Check spam or junk, then try again.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  className="w-full h-11 bg-white hover:bg-[#f0f7f3] text-[#1a2e1f] text-sm font-medium rounded-xl border border-[#d4e4db] transition-colors"
                >
                  Use a different email
                </button>
                <Link
                  to={LOGIN_HREF}
                  className="flex items-center justify-center gap-2 w-full h-11 bg-[#1D9E75] hover:bg-[#178F65] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                <img src="/LOGO.png" alt="" className="w-10 h-10 object-contain mb-2" />
                <span className="text-sm font-semibold text-[#7a8f82]">SpeakUp GC</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-[#1a2e1f] mb-1">
                Reset your password
              </h1>
              <p className="text-sm text-center text-[#7a8f82] mb-7">
                Enter your Gordon College email and we’ll send a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#4b5e52]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a8f82]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@gordoncollege.edu.ph"
                      className="w-full h-11 pl-10 pr-3 rounded-xl text-sm text-[#1a2e1f] placeholder-[#9ca8a0] bg-[#f5f9f7] border-[1.5px] border-[#d4e4db] focus:outline-none focus:border-[#1D9E75] transition-colors"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#1D9E75] hover:bg-[#178F65] text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#1D9E75]/20"
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

              <p className="mt-5 text-xs text-[#7a8f82] flex items-start gap-2 bg-[#f0f7f3] border border-[#d4e4db] rounded-xl px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#1D9E75]" />
                Reset links expire after 1 hour. Check your spam folder if you don’t see the email.
              </p>

              <p className="text-sm text-[#4b5e52] mt-5 text-center">
                Remember your password?{" "}
                <Link to={LOGIN_HREF} className="text-[#1D9E75] hover:underline font-semibold">
                  Log In
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
