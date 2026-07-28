'use client';
import React from 'react';
import AdminLayout from '../../src/components/admin/AdminLayout';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import { NotificationAlertProvider } from '../../src/components/notifications/NotificationAlertProvider';

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin>
      <NotificationAlertProvider>
        <AdminLayout>
          {children}
        </AdminLayout>
      </NotificationAlertProvider>
    </ProtectedRoute>
  );
}
