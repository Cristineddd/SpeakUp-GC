import React, { useState } from "react";
import { 
  Shield, 
  Mail, 
  ArrowLeft, 
  Loader,
  Check,
  Eye,
  EyeOff,
  Lock
} from "lucide-react";
import { Link, useNavigate } from "../../compat/router";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import { PasswordStrengthChecker } from "../../components/auth/PasswordStrengthChecker";
import { validatePassword } from "../../utils/passwordValidation";
import { TermsModal } from "../../components/TermsModal";
import { auth } from "../../firebase";
import { signOut, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
const logoImage = "/LOGO.png";

export default function SignUp() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, signUpWithGoogle } = useAuth();

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@gordoncollege\.edu\.ph$/;
    if (!emailRegex.test(formData.email)) {
      toast({ title: "Invalid Email Domain", description: "Only @gordoncollege.edu.ph email addresses are allowed.", variant: "destructive" });
      return;
    }

    if (!formData.agreeTerms) {
      toast({ title: "Error", description: "You must agree to the Terms & Conditions and Privacy Policy", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      setStep('password');
      toast({ title: "Email Accepted!", description: "Please create a secure password for your account." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast({ title: "Password Requirements Not Met", description: "Your password must have at least: 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number", variant: "destructive" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await register(formData.email, formData.password);
      await signOut(auth);
      setAccountCreated(true);
      toast({ title: "Account created!", description: "Please check your email to verify your account before signing in." });
    } catch (error: any) {
      let errorMessage = "Failed to create account. Please try again.";
      if (error.code === "auth/email-already-in-use") errorMessage = "This email is already registered. Please sign in instead.";
      else if (error.code === "auth/weak-password") errorMessage = "Password is too weak. Please use a stronger password.";
      else if (error.code === "auth/invalid-email") errorMessage = "Invalid email address.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#1D9E75] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#178F65] opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#22a05a] opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#176840] opacity-30 blur-3xl" />
        <div className="absolute top-[10%] right-[15%] w-16 h-16 rounded-xl bg-white/5 rotate-12 animate-pulse" />
        <div className="absolute bottom-[15%] left-[10%] w-20 h-20 rounded-full bg-white/5 animate-pulse delay-700" />
        <div className="absolute top-[60%] right-[8%] w-12 h-12 rounded-lg bg-white/5 -rotate-12 animate-pulse delay-1000" />
      </div>

      {/* Back to home */}
      <div className="absolute top-5 left-5 z-50">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Centered card */}
      <div className="relative z-10 w-full max-w-[480px] bg-[#1a1a2e] rounded-2xl shadow-2xl overflow-hidden">
        {/* Card top: logo + heading */}
        <div className="px-8 pt-8 pb-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={String(logoImage)} alt="SpeakUp GC" className="h-9 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="text-xl font-bold text-white">SpeakUp GC</span>
          </div>
        </div>

        {/* Card body */}
        <div className="px-8 pb-8 pt-2">
          {accountCreated ? (
            /* ──── Account Created ──── */
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-[#1D9E75]/30 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-[#6ee7a0]" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Check Your Email</h1>
                <p className="text-sm text-[#b5bac1]">
                  We sent a verification link to<br/>
                  <span className="font-semibold text-white">{formData.email}</span>
                </p>
              </div>

              <div className="bg-[#1e1f22] rounded-lg p-4 text-left text-sm text-[#b5bac1] space-y-2">
                <p className="flex items-start gap-2"><Check className="w-4 h-4 text-[#6ee7a0] mt-0.5 flex-shrink-0" /> Click the verification link in the email</p>
                <p className="flex items-start gap-2"><Check className="w-4 h-4 text-[#6ee7a0] mt-0.5 flex-shrink-0" /> Your account will be activated</p>
                <p className="flex items-start gap-2"><Check className="w-4 h-4 text-[#6ee7a0] mt-0.5 flex-shrink-0" /> Sign in to access SpeakUp GC</p>
              </div>

              <div className="bg-[#2b2d31] border border-[#f0b232]/20 rounded-lg p-3 flex items-start gap-3 text-left">
                <div className="flex-shrink-0 w-5 h-5 bg-[#f0b232]/20 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-[#f0b232] font-bold text-[10px]">!</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#f0b232] mb-0.5">Check Your Spam Folder</p>
                  <p className="text-[11px] text-[#b5bac1]">The email may be in your Spam or Junk folder.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      if (!formData.email || !formData.password) { toast({ title: 'Missing credentials', description: 'Please re-enter your credentials.', variant: 'destructive' }); return; }
                      await signInWithEmailAndPassword(auth, formData.email, formData.password);
                      const u = auth.currentUser;
                      if (u) {
                        await u.reload();
                        if (u.emailVerified) { toast({ title: 'Email Verified', description: 'Redirecting to dashboard.' }); navigate('/dashboard'); return; }
                        else { toast({ title: 'Not Verified', description: 'Email not yet verified.', variant: 'destructive' }); await signOut(auth); }
                      }
                    } catch (err: any) { toast({ title: 'Check Failed', description: err.message, variant: 'destructive' }); }
                    finally { setLoading(false); }
                  }}
                  className="flex-1 h-10 bg-[#1D9E75] hover:bg-[#178F65] text-white font-medium text-sm rounded-[4px] transition-colors"
                >Check Verification</button>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      if (!formData.email || !formData.password) { toast({ title: 'Missing credentials', description: 'Please re-enter your credentials.', variant: 'destructive' }); return; }
                      await signInWithEmailAndPassword(auth, formData.email, formData.password);
                      const u = auth.currentUser;
                      if (u) { await sendEmailVerification(u); toast({ title: 'Verification Sent', description: 'A new verification email was sent.' }); await signOut(auth); }
                    } catch (err: any) { toast({ title: 'Resend Failed', description: err.message, variant: 'destructive' }); }
                    finally { setLoading(false); }
                  }}
                  className="flex-1 h-10 bg-[#2b2d31] hover:bg-[#35373c] text-[#b5bac1] font-medium text-sm rounded-[4px] border border-[#3f4147] transition-colors"
                >Resend Email</button>
              </div>

              <button onClick={() => { setAccountCreated(false); setStep('email'); setFormData({ email: '', password: '', confirmPassword: '', agreeTerms: false }); }} className="text-[#3a9d68] hover:underline text-xs">
                Create a different account
              </button>
            </div>
          ) : step === 'email' ? (
            /* ──── STEP 1: Email ──── */
            <>
              <h1 className="text-2xl font-bold text-white mb-1 text-center">Create an account</h1>
              <p className="text-sm text-[#b5bac1] text-center mb-5">Join the SpeakUp GC community</p>

              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">Email <span className="text-red-400">*</span></label>
                  <input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} className="w-full h-11 px-3 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#3a7d5c] transition-all" placeholder="you@email.com" required />
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-3 p-3 bg-[#1e1f22] rounded-lg">
                  <input type="checkbox" checked={formData.agreeTerms} onChange={(e) => setFormData(prev => ({ ...prev, agreeTerms: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-[#3f4147] bg-[#1e1f22] text-[#3a7d5c] focus:ring-[#3a7d5c] cursor-pointer accent-[#3a7d5c]" required />
                  <label className="text-xs text-[#b5bac1] leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#3a9d68] hover:underline">Terms & Conditions</button>
                    {" "}and{" "}
                    <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-[#3a9d68] hover:underline">Privacy Policy</button>
                  </label>
                </div>

                <button type="submit" disabled={loading || !formData.agreeTerms || !formData.email} className="w-full h-11 bg-[#3a7d5c] hover:bg-[#2e6349] text-white font-medium text-sm rounded-[4px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <><Loader className="animate-spin h-4 w-4" /> Processing…</> : "Continue"}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#3f4147]" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-[#1a1a2e] px-2 text-[#72767d]">OR</span></div>
              </div>

              {/* Google Sign Up */}
              <button
                type="button"
                onClick={async () => {
                  try { 
                    setIsGoogleLoading(true); 
                    await signUpWithGoogle(); 
                    navigate('/dashboard'); 
                  }
                  catch (error: any) { 
                    let msg = error.message || "Failed to sign up with Google";
                    if (error.message?.includes('@gordoncollege.edu.ph')) {
                      msg = "Only @gordoncollege.edu.ph email addresses are allowed. Please use your Gordon College email.";
                    }
                    toast({ title: "Sign Up Failed", description: msg, variant: "destructive" }); 
                  }
                  finally { setIsGoogleLoading(false); }
                }}
                disabled={isGoogleLoading}
                className="w-full h-11 bg-white hover:bg-gray-100 text-[#1a1a2e] font-medium text-sm rounded-[4px] transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGoogleLoading ? <><Loader className="animate-spin h-4 w-4" /> Signing up…</> : (
                  <>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <p className="text-sm text-[#b5bac1] mt-4">Already have an account?{" "}<Link to="/login" className="text-[#3a9d68] hover:underline font-medium">Log In</Link></p>
            </>
          ) : (
            /* ──── STEP 2: Password ──── */
            <>
              <h1 className="text-2xl font-bold text-white mb-1 text-center">Create a password</h1>
              <p className="text-sm text-[#b5bac1] text-center mb-5">Secure your account</p>

              {/* Email display */}
              <div className="bg-[#1e1f22] rounded-lg p-3 flex items-center gap-3 mb-4">
                <Mail className="w-4 h-4 text-[#3a9d68] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#72767d]">Creating account for</p>
                  <p className="text-sm font-medium text-white truncate">{formData.email}</p>
                </div>
                <button onClick={() => setStep('email')} className="text-[11px] text-[#3a9d68] hover:underline flex-shrink-0">Change</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleChange("password", e.target.value)} className="w-full h-11 px-3 pr-10 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#3a7d5c] transition-all" placeholder="Create a password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formData.password && <div className="mt-2"><PasswordStrengthChecker password={formData.password} showDetails={true} /></div>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">Confirm Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} className="w-full h-11 px-3 pr-10 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#3a7d5c] transition-all" placeholder="Confirm your password" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-white transition-colors">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full h-11 bg-[#3a7d5c] hover:bg-[#2e6349] text-white font-medium text-sm rounded-[4px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <><Loader className="animate-spin h-4 w-4" /> Creating account…</> : "Create Account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="Terms & Conditions">
        <div className="space-y-6 text-foreground">
          <div>
            <h3 className="text-lg font-semibold mb-2">Welcome to SpeakUp GC</h3>
            <p className="text-muted-foreground">By using our platform, you agree to these terms and conditions. Please read them carefully to understand your rights and responsibilities.</p>
          </div>
          <div><h3 className="font-semibold mb-2">Acceptance of Terms</h3><p className="text-muted-foreground">By accessing and using SpeakUp GC, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p></div>
          <div><h3 className="font-semibold mb-2">User Responsibilities</h3><p className="text-muted-foreground">You agree to provide accurate information, maintain the confidentiality of your account, and use SpeakUp GC only for lawful purposes. Misuse of the platform may result in account suspension.</p></div>
          <div><h3 className="font-semibold mb-2">Reporting & Confidentiality</h3><p className="text-muted-foreground">All reports are treated confidentially and reviewed by authorized personnel. False reporting or abuse of the system is prohibited and may lead to disciplinary action.</p></div>
          <div><h3 className="font-semibold mb-2">Intellectual Property</h3><p className="text-muted-foreground">All content, features, and functionality on SpeakUp GC are owned by us and protected by copyright, trademark, and other laws. Unauthorized use is prohibited.</p></div>
          <div><h3 className="font-semibold mb-2">Limitation of Liability</h3><p className="text-muted-foreground">SpeakUp GC provides tools and resources to support you, but we are not liable for any direct, indirect, or consequential damages arising from your use of the platform.</p></div>
          <div><h3 className="font-semibold mb-2">Changes to Terms</h3><p className="text-muted-foreground">We reserve the right to modify these terms at any time. Continued use of SpeakUp GC after changes constitutes acceptance of the revised terms.</p></div>
          <p className="text-sm text-muted-foreground italic">Last updated: March 17, 2026</p>
        </div>
      </TermsModal>

      {/* Privacy Policy Modal */}
      <TermsModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Privacy Policy">
        <div className="space-y-6 text-foreground">
          <div><h3 className="text-lg font-semibold mb-2">Privacy Policy</h3><p className="text-muted-foreground">Your privacy is our priority. SpeakUp GC is committed to protecting your personal information and ensuring a safe, confidential environment for all users.</p></div>
          <div><h3 className="font-semibold mb-2">Information We Collect</h3><p className="text-muted-foreground">We collect only essential information needed to provide our services: your email, account details, and any reports you choose to submit. All data is encrypted and stored securely.</p></div>
          <div><h3 className="font-semibold mb-2">How We Use Your Information</h3><p className="text-muted-foreground">Your information is used solely to deliver SpeakUp GC services, connect you with support resources, and improve our platform. We never sell or share your personal data with third parties.</p></div>
          <div><h3 className="font-semibold mb-2">Data Security</h3><p className="text-muted-foreground">We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your information from unauthorized access.</p></div>
          <div><h3 className="font-semibold mb-2">Your Rights</h3><p className="text-muted-foreground">You have the right to access, update, or delete your personal information at any time. You can also request a copy of your data or withdraw consent for data processing.</p></div>
          <div><h3 className="font-semibold mb-2">Confidential Reporting</h3><p className="text-muted-foreground">All reports submitted through SpeakUp GC are treated with strict confidentiality. Access is limited to authorized personnel directly involved in case resolution.</p></div>
          <div><h3 className="font-semibold mb-2">Contact Us</h3><p className="text-muted-foreground">If you have questions about our privacy practices or wish to exercise your privacy rights, please contact us at privacy@speakupgc.com.</p></div>
          <p className="text-sm text-muted-foreground italic">Last updated: March 17, 2026</p>
        </div>
      </TermsModal>
    </div>
  );
}
