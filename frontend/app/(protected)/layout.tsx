'use client';
import React from 'react';
import Sidebar from '../../src/components/layout/Sidebar';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';

export default function ProtectedGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 xl:px-12 2xl:px-16 pt-4 pb-20 lg:pb-0 transition-all duration-200" style={{ background: "#f4faf6" }}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
