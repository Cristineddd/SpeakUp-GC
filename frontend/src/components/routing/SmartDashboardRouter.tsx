/**
 * SmartDashboardRouter — SpeakUp GC
 *
 * Entry-point for /dashboard — resolves user role and redirects:
 *
 *   Role                        → Redirect target
 *   ─────────────────────────────────────────────
 *   system_admin / isAdmin      → /admin
 *   codi / handler              → /admin/reports
 *   disciplining_authority      → /admin/dean-coordinator
 *   guidance_counselor          → /admin  (admin-lite; extendable)
 *   respondent                  → DashboardRouter renders RespondentDashboard
 *   complainant (default)       → DashboardRouter renders Dashboard
 *
 * Role source priority:
 *   1. Firestore users/{uid}.role
 *   2. localStorage userProfile.userRole
 *   3. useRepresentativeRole (Firebase custom claim / Firestore representative)
 *   4. Default → complainant
 *
 * Tech stack: React, Firebase Firestore, Next.js router (compat shim)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Dashboard from '../../views/dashboard/Dashboard';
import RespondentDashboard from '../../views/dashboard/RespondentDashboard';
import CaseHandlerDashboard from '../../views/dashboard/CaseHandlerDashboard';

// ─── Role → redirect path map ─────────────────────────────────────────────────
const ROLE_PATH: Record<string, string> = {
  // Admin
  admin: '/admin',
  system_admin: '/admin',
  // CODI / Case Handler
  codi: '/admin/reports',
  handler: '/admin/reports',
  // Disciplining Authority / Dean / Coordinator
  disciplining_authority: '/admin/dean-coordinator',
  dean: '/admin/dean-coordinator',
  coordinator: '/admin/dean-coordinator',
  // Guidance Counselor
  guidance_counselor: '/admin',
};

// Roles rendered in-place (no redirect)
const INLINE_ROLES = new Set<string>([
  'complainant',
  'respondent',
]);

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16A34A] mx-auto mb-4" />
        <p className="text-sm text-gray-500">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
}

const SmartDashboardRouter: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { role: repRole, loading: repLoading } = useRepresentativeRole();

  const [resolvedRole, setResolvedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Resolve role from all available sources ───────────────────────────────
  useEffect(() => {
    if (repLoading) return;

    (async () => {
      let role: string | null = null;

      // 1. Firebase Admin flag
      if (isAdmin) {
        role = 'system_admin';
      }

      // 2. Representative role (custom Firestore claim via useRepresentativeRole)
      if (!role && repRole) {
        role = repRole;
      }

      // 3. Firestore users/{uid}.role
      if (!role && user?.uid) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data()?.role) {
            role = snap.data().role as string;
          }
        } catch (err) {
          console.warn('SmartDashboardRouter: Firestore role fetch failed', err);
        }
      }

      // 4. localStorage fallback (set during profile completion)
      if (!role) {
        try {
          const raw = localStorage.getItem('userProfile');
          if (raw) {
            const parsed = JSON.parse(raw);
            role = parsed.userRole ?? null;
          }
        } catch {
          // ignore JSON parse errors
        }
      }

      // 5. Default
      if (!role) role = 'complainant';

      setResolvedRole(role);
      setLoading(false);
    })();
  }, [repLoading, repRole, isAdmin, user?.uid]);

  // ── Navigate once role is resolved ────────────────────────────────────────
  useEffect(() => {
    if (loading || !resolvedRole) return;

    const path = ROLE_PATH[resolvedRole];
    if (path) {
      navigate(path, { replace: true });
    }
    // Inline roles (complainant, respondent) — no redirect needed
  }, [loading, resolvedRole, navigate]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <Spinner />;

  // ── Inline role rendering ─────────────────────────────────────────────────
  if (resolvedRole === 'respondent') {
    return <RespondentDashboard />;
  }

  if (resolvedRole === 'codi' || resolvedRole === 'handler') {
    return <CaseHandlerDashboard />;
  }

  if (!resolvedRole || INLINE_ROLES.has(resolvedRole)) {
    return <Dashboard />;
  }

  // Redirect target — show spinner while navigation happens
  return <Spinner />;
};

export default SmartDashboardRouter;
