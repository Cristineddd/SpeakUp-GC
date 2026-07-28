'use client';
import React from 'react';
import Sidebar from '../../src/components/layout/Sidebar';
import ComplainantTopBar from '../../src/components/layout/ComplainantTopBar';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import { NotificationAlertProvider } from '../../src/components/notifications/NotificationAlertProvider';
import { mainContentClass } from '../../src/lib/sidebar-styles';

export default function ProtectedGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <NotificationAlertProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <ComplainantTopBar />
            <main className={mainContentClass()}>
              {children}
            </main>
          </div>
        </div>
      </NotificationAlertProvider>
    </ProtectedRoute>
  );
}
