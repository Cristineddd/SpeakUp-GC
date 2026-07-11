/**
 * DashboardRouter — SpeakUp GC
 *
 * Routes authenticated users to the correct role-specific dashboard:
 *   - System Admin / DEIU Admin    → /admin
 *   - CODI / Case Handler          → /admin/reports (case queue)
 *   - Respondent / Defendant       → /dashboard/respondent
 *   - Complainant (default)        → renders <Dashboard /> in-place
 *
 * Role resolution order:
 *   1. Firebase custom claims / Firestore `users/{uid}.role`
 *   2. localStorage `userProfile.userRole` (set after profile completion)
 *   3. Defaults to Complainant view
 *
 * Tech stack: React, Firebase Auth, Firestore, Next.js (useRouter)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserRole } from '../../types/users';
import Dashboard from '../../views/dashboard/Dashboard';
import RespondentDashboard from '../../views/dashboard/RespondentDashboard';
import CaseHandlerDashboard from '../../views/dashboard/CaseHandlerDashboard';

// ─── Spinner helper ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D9E75]" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardRouter() {
  const { user, isAdmin } = useAuth();
  const { role: repRole, loading: repLoading } = useRepresentativeRole();
  const navigate = useNavigate();

  const [firestoreRole, setFirestoreRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // ── Step 1: Fetch Firestore role for the current user ─────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setRoleLoading(false);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          setFirestoreRole(snap.data()?.role ?? null);
        } else {
          // Fallback: check localStorage profile saved after onboarding
          const raw = localStorage.getItem('userProfile');
          if (raw) {
            const parsed = JSON.parse(raw);
            setFirestoreRole(parsed.userRole ?? null);
          }
        }
      } catch (err) {
        console.warn('DashboardRouter: could not fetch Firestore role', err);
      } finally {
        setRoleLoading(false);
      }
    })();
  }, [user?.uid]);

  // ── Step 2: Redirect once all role sources are resolved ───────────────────
  useEffect(() => {
    if (repLoading || roleLoading) return;

    const role = firestoreRole ?? repRole;

    if (isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    if (role === UserRole.CODI || role === 'handler' || (role as string) === 'codi') {
      navigate('/admin/reports', { replace: true });
      return;
    }

    if (
      role === UserRole.DISCIPLINING_AUTHORITY ||
      role === 'disciplining_authority'
    ) {
      navigate('/admin/dean-coordinator', { replace: true });
      return;
    }

    if (repRole === 'handler') {
      navigate('/admin/reports', { replace: true });
      return;
    }

    if (repRole === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    // Respondent & Complainant are rendered in-place (no redirect)
  }, [repLoading, roleLoading, firestoreRole, repRole, isAdmin, navigate]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (repLoading || roleLoading) return <Spinner />;

  // ── Redirect targets — show spinner while navigating ─────────────────────
  const resolvedRole = firestoreRole ?? repRole;

  if (isAdmin) return <Spinner />;
  if (resolvedRole === UserRole.CODI || resolvedRole === 'handler' || resolvedRole === 'codi') return <Spinner />;
  if (
    resolvedRole === UserRole.DISCIPLINING_AUTHORITY ||
    resolvedRole === 'disciplining_authority'
  ) return <Spinner />;
  if (repRole === 'admin') return <Spinner />;

  // ── Role-specific dashboard render ────────────────────────────────────────

  // Respondent / Defendant: show their own view
  if (resolvedRole === UserRole.RESPONDENT || resolvedRole === 'respondent') {
    return <RespondentDashboard />;
  }

  // CODI / Case Handler — optionally render inline instead of redirect
  // (currently routed via navigate; kept here as fallback)
  if (resolvedRole === UserRole.CODI || resolvedRole === 'codi' || resolvedRole === 'handler') {
    return <CaseHandlerDashboard />;
  }

  // Guidance Counselor — for now, admin dashboard suffices; can be extended
  if (resolvedRole === UserRole.GUIDANCE_COUNSELOR || resolvedRole === 'guidance_counselor') {
    navigate('/admin', { replace: true });
    return <Spinner />;
  }

  // Default: Complainant dashboard
  return <Dashboard />;
}
