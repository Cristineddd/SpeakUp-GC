'use client';

import SmartDashboard from '../../../../src/views/admin/SmartDashboard';
import CodiDashboard from '../../../../src/views/admin/CodiDashboard';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useRepresentativeRole } from '../../../../src/hooks/useRepresentativeRole';

export default function Page() {
  const { isAdmin } = useAuth();
  const { role, loading } = useRepresentativeRole();
  const isCODI = !isAdmin && ((role as string) === 'codi' || role === 'handler');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#1D9E75]" />
      </div>
    );
  }

  if (isCODI) {
    return <CodiDashboard />;
  }

  return <SmartDashboard />;
}
