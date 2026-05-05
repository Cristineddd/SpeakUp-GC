'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { AuthProvider } from '../src/contexts/AuthContext';
import { Toaster } from '../src/components/ui/toaster';
import { Toaster as Sonner } from '../src/components/ui/sonner';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          {children}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
