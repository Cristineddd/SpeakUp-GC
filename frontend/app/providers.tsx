'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '../src/components/ui/toaster';
import { Toaster as Sonner } from '../src/components/ui/sonner';
import UnsupportedBrowserGate from '../src/components/UnsupportedBrowserGate';
import { disableConsolesInProduction } from '../src/utils/logger';

// Mute [BELL] / NotificationService / validation console spam on deployed builds
disableConsolesInProduction();

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UnsupportedBrowserGate>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="speakup-theme">
            <Toaster />
            <Sonner />
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </UnsupportedBrowserGate>
  );
}
