import { useState, useEffect } from 'react';
import { useNavigate, Link } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import RepresentativeService from '../../services/representativeService';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Shield, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { getAuthErrorMessage } from '../../utils/auth/firebaseErrorMessages';

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle, currentUser, isAdmin } = useAuth();
  const { role, loading: roleLoading } = useRepresentativeRole();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndRegisterAdmin = async () => {
      if (currentUser && !roleLoading) {
        // If user is admin but not in representatives collection, auto-register them
        if (isAdmin && !role) {
          console.log('🔧 Admin user not in representatives collection, auto-registering...');
          try {
            await RepresentativeService.autoRegisterAsAdmin(
              currentUser.uid,
              currentUser.email || '',
              currentUser.displayName || undefined
            );
            console.log('✅ Admin auto-registered successfully, refreshing...');
            // Refresh to load the new role
            window.location.reload();
            return;
          } catch (error) {
            console.error('❌ Error auto-registering admin:', error);
          }
        }

        // Allow access if user is admin OR has any representative role (admin, handler)
        if (isAdmin || role) {
          navigate('/admin');
        } else {
          setError('Access denied. You must be an administrator or CODI member to access this area.');
        }
      }
    };

    checkAndRegisterAdmin();
  }, [currentUser, isAdmin, role, roleLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(formData.email, formData.password); // Login and check admin status
      // Will automatically redirect if successful
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, 'Invalid email or password. Please try again.'));
      console.error('Admin login error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setGoogleLoading(true);
      await loginWithGoogle();
      // The effect above routes admins and CODI members once auth state settles.
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, 'Google Sign-In failed. Please try again.'));
      console.error('Admin Google login error:', err);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 font-sans flex flex-col">
      <main className="relative flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 -top-20 h-[22rem] w-[28rem] bg-gradient-to-br from-[#1D9E75]/20 via-emerald-200/35 to-transparent blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-[20rem] w-[24rem] bg-gradient-to-tl from-teal-200/35 via-[#1D9E75]/10 to-transparent blur-3xl" />
        </div>

        <div className="relative w-full max-w-md bg-white border border-[#d4e4db] rounded-2xl shadow-xl shadow-gray-900/5 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-[#1D9E75]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a2e1f] mb-1">Admin Panel</h1>
            <p className="text-sm text-[#7a8f82]">Sign in to manage cases and reports</p>
            <span className="inline-block mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#1D9E75] bg-[#f0f7f3] border border-[#d4e4db] rounded-full px-3 py-1">
              Admin • CODI Members
            </span>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200 text-red-700">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#4b5e52]">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a8f82]" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-11 pl-10 pr-3 rounded-xl text-sm text-[#1a2e1f] placeholder-[#9ca8a0] bg-[#f5f9f7] border-[1.5px] border-[#d4e4db] focus:outline-none focus:border-[#1D9E75] transition-colors"
                  placeholder="admin@speakupgc.com"
                  required
                  disabled={loading || googleLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#4b5e52]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a8f82]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full h-11 pl-10 pr-10 rounded-xl text-sm text-[#1a2e1f] placeholder-[#9ca8a0] bg-[#f5f9f7] border-[1.5px] border-[#d4e4db] focus:outline-none focus:border-[#1D9E75] transition-colors"
                  placeholder="Enter your password"
                  required
                  disabled={loading || googleLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8f82] hover:text-[#1a2e1f] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <Link to="/forgot-password" className="inline-block text-xs font-medium text-[#1D9E75] hover:underline">
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-11 bg-[#1D9E75] hover:bg-[#178F65] text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#1D9E75]/20"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Signing in…
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Access Admin Panel
                </>
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e2ece7]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 font-medium text-[#7a8f82]">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full h-11 bg-white hover:bg-[#f0f7f3] text-[#1a2e1f] font-medium text-sm rounded-xl border-[1.5px] border-[#d4e4db] transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1a2e1f] border-t-transparent" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
