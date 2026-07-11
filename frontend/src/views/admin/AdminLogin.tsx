import { useState, useEffect } from 'react';
import { useNavigate, Link } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import RepresentativeService from '../../services/representativeService';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser, isAdmin } = useAuth();
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
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      console.error('Admin login error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#2b583f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#1e4530] opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#3a7d5c] opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#234d38] opacity-30 blur-3xl" />
      </div>

      {/* Back */}
      <div className="absolute top-5 left-5 z-50">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-[#1a1a2e] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-8 pt-8 pb-2 text-center">
          <div className="mx-auto h-14 w-14 bg-[#3a7d5c]/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-[#3a9d68]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin Panel</h1>
          <p className="text-sm text-[#b5bac1]">Sign in to access the admin dashboard</p>
          <p className="text-[11px] text-[#72767d] mt-1">Admin • CODI Members</p>
        </div>

        <div className="px-8 pb-8 pt-4">
          {/* Info box */}
          <div className="bg-[#1e1f22] rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-white mb-0.5">Staff / Administrator Login</p>
            <p className="text-[11px] text-[#72767d]">Manage cases, view reports, and administer the system</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-300">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-11 px-3 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#3a7d5c] transition-all"
                placeholder="admin@speakupgc.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full h-11 px-3 pr-10 rounded-[4px] bg-[#1e1f22] border-none text-white text-sm placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#3a7d5c] transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#3a7d5c] hover:bg-[#2e6349] text-white font-medium text-sm rounded-[4px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              <Shield className="h-4 w-4" />
              {loading ? 'Signing in…' : 'Access Admin Panel'}
            </button>
          </form>

          <p className="text-[11px] text-[#72767d] mt-4">
            Regular user?{" "}
            <Link to="/login" className="text-[#3a9d68] hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
