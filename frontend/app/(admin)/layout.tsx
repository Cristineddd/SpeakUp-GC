'use client';
import React from 'react';
import AdminLayout from '../../src/components/admin/AdminLayout';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout>
        {children}
      </AdminLayout>
    </ProtectedRoute>
  );
}
