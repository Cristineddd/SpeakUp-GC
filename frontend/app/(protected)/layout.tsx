'use client';
import React from 'react';
import Sidebar from '../../src/components/layout/Sidebar';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import { mainContentClass } from '../../src/lib/sidebar-styles';

export default function ProtectedGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <main className={mainContentClass()}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
