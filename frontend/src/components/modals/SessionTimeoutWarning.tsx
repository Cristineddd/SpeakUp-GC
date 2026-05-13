import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Button } from '../ui/button';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Session Timeout Warning</h2>
              <p className="text-sm text-white/90">Your session is about to expire</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-gray-900">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Remaining</div>
                </div>
              </div>
              <div 
                className="absolute inset-0 rounded-full border-8 border-amber-500 transition-all duration-1000"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((timeRemaining / 300) * 2 * Math.PI)}% ${50 - 50 * Math.cos((timeRemaining / 300) * 2 * Math.PI)}%, 50% 50%)`
                }}
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900 text-center">
              Due to inactivity, you will be automatically logged out for security purposes.
              Click <span className="font-semibold">"Stay Logged In"</span> to continue your session.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Security Note:</span> This helps protect your account when you step away from your device.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center gap-3 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onLogout}
            className="flex-1 border-gray-300 hover:bg-gray-100"
          >
            Logout Now
          </Button>
          <Button
            onClick={onExtend}
            className="flex-1 bg-[#1a7a45] hover:bg-[#155f36] text-white font-semibold"
          >
            Stay Logged In
          </Button>
        </div>
      </div>
    </div>
  );
};
