import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  ArrowLeft, 
  CheckCircle,
  Loader,
  Check,
  Mail
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "../../compat/router";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import { PasswordStrengthChecker } from "../../components/auth/PasswordStrengthChecker";
import { validatePassword } from "../../utils/passwordValidation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "../../firebase";

export default function CompleteSignUp() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({
    password: false,
    confirmPassword: false,
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();

  useEffect(() => {
    const verifyEmailLink = async () => {
      try {
        // Check if this is a valid sign-in link
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          toast({
            title: "Invalid Link",
            description: "This verification link is invalid or has expired.",
            variant: "destructive",
          });
          navigate("/signup");
          return;
        }

        // Get the email from URL params or localStorage
        let email = searchParams.get('email');
        if (!email) {
          email = window.localStorage.getItem('emailForSignIn');
        }

        if (!email) {
          // Ask user to provide their email
          toast({
            title: "Email Required",
            description: "Please enter your email address to complete signup.",
            variant: "destructive",
          });
          navigate("/signup");
          return;
        }

        setFormData(prev => ({ ...prev, email }));
        setEmailVerified(true);
        setVerifying(false);

      } catch (error: any) {
        console.error("Email verification error:", error);
        toast({
          title: "Verification Failed",
          description: error.message || "Failed to verify email. Please try again.",
          variant: "destructive",
        });
        navigate("/signup");
      }
    };

    verifyEmailLink();
  }, [searchParams, navigate, toast]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Password strength validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Password Requirements Not Met",
        description: "Your password must have at least: 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Sign in with email link to verify, then update password
      await signInWithEmailLink(auth, formData.email, window.location.href);
      
      // Now create the account with password
      await register(formData.email, formData.password);

      // Clear localStorage
      window.localStorage.removeItem('emailForSignIn');
      window.localStorage.removeItem('agreeTerms');

      toast({
        title: "Account created!",
        description: "Your account has been successfully created.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Account creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-6xl flex items-stretch gap-8 relative z-10">
        {/* Left side - Benefits */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl backdrop-blur-sm border border-border/50 shadow-2xl">
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Complete Your Account
              </h2>
              <p className="text-lg text-muted-foreground">
                Your email has been verified! Now create a secure password.
              </p>
            </div>

            <div className="space-y-6 pt-8">
              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">Email Verified</h3>
                  <p className="text-muted-foreground">Your email address has been successfully verified.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">Secure Password</h3>
                  <p className="text-muted-foreground">Create a strong password to protect your account.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">Start Your Journey</h3>
                  <p className="text-muted-foreground">Access your safe space and connect with support.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Password Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-card/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 p-8">
              {/* Back Button */}
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Sign Up
              </Link>

              {/* Header */}
              <div className="mb-8 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">Create Password</h1>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2">
                  Set up a secure password for your SpeakUp GC account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                {/* Verified Email Display */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-green-700 font-medium">Verified Email</p>
                    <p className="text-sm font-semibold text-green-900">{formData.email}</p>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-5">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5 z-10 transition-colors duration-200" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        onFocus={() => setIsFocused(prev => ({ ...prev, password: true }))}
                        onBlur={(e) => setIsFocused(prev => ({ ...prev, password: !!e.target.value }))}
                        className="w-full h-14 pl-12 pr-14 rounded-xl border-2 border-border bg-background/80 backdrop-blur-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder-transparent hover:border-primary/50"
                        placeholder="Create a Password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-all duration-200 z-10 p-1 hover:bg-accent rounded-lg"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <label
                        htmlFor="password"
                        className={`absolute left-12 transition-all duration-300 pointer-events-none z-20 ${
                          isFocused.password || formData.password
                            ? '-top-2.5 text-xs bg-background px-2 text-primary font-semibold'
                            : 'top-1/2 -translate-y-1/2 text-muted-foreground'
                        }`}
                      >
                        Create a Password
                      </label>
                    </div>
                  </div>
                  
                  {/* Password Strength Checker */}
                  {formData.password && (
                    <div className="animate-in fade-in duration-200">
                      <PasswordStrengthChecker
                        password={formData.password}
                        showDetails={true}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5 z-10 transition-colors duration-200" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      onFocus={() => setIsFocused(prev => ({ ...prev, confirmPassword: true }))}
                      onBlur={(e) => setIsFocused(prev => ({ ...prev, confirmPassword: !!e.target.value }))}
                      className="w-full h-14 pl-12 pr-14 rounded-xl border-2 border-border bg-background/80 backdrop-blur-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder-transparent hover:border-primary/50"
                      placeholder="Confirm Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-all duration-200 z-10 p-1 hover:bg-accent rounded-lg"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <label
                      htmlFor="confirmPassword"
                      className={`absolute left-12 transition-all duration-300 pointer-events-none z-20 ${
                        isFocused.confirmPassword || formData.confirmPassword 
                          ? '-top-2.5 text-xs bg-background px-2 text-primary font-semibold' 
                          : 'top-1/2 -translate-y-1/2 text-muted-foreground'
                      }`}
                    >
                      Confirm Password
                    </label>
                  </div>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full h-14 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? (
                      <>
                        <Loader className="animate-spin h-5 w-5" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        Create Account
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
