import React from 'react';
import { Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

/**
 * Shown to non-admin users when maintenance mode is enabled.
 */
export default function MaintenanceModeScreen() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-qc-cream px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-full bg-qc-sage/10 flex items-center justify-center">
          <Wrench className="h-8 w-8 text-qc-sage" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-qc-pine">
            System Under Maintenance
          </h1>
          <p className="text-sm text-qc-muted mt-2 leading-relaxed">
            SpeakUp GC is temporarily unavailable while we perform scheduled maintenance.
            Please check back later or contact DEIU directly for urgent matters.
          </p>
        </div>
        <Button variant="outline" onClick={() => logout()}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
