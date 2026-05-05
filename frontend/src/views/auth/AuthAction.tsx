import React, { useEffect } from 'react';
import { useLocation, useNavigate } from '../../compat/router';

const AuthAction = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    const apiKey = urlParams.get('apiKey');
    const continueUrl = urlParams.get('continueUrl');
    const lang = urlParams.get('lang');

    console.log('🔗 AuthAction received:', { mode, oobCode, continueUrl, currentUrl: window.location.href });

    if (mode === 'resetPassword' && oobCode) {
      // Build the redirect URL for our custom reset password page
      let resetUrl = `/reset-password?mode=${mode}&oobCode=${encodeURIComponent(oobCode)}`;
      if (apiKey) {
        resetUrl += `&apiKey=${encodeURIComponent(apiKey)}`;
      }
      if (lang) {
        resetUrl += `&lang=${encodeURIComponent(lang)}`;
      }
      
      console.log('🔄 Redirecting to custom reset page:', resetUrl);
      
      // If we're on the Firebase domain, redirect to localhost
      if (window.location.hostname.includes('firebaseapp.com')) {
        window.location.href = `http://localhost:8085${resetUrl}`;
        return;
      }
      
      // Otherwise, use React Router navigation
      navigate(resetUrl, { replace: true });
      return;
    }

    if (mode === 'verifyEmail' && oobCode) {
      // Build the redirect URL for email verification
      let verifyUrl = `/verify-email?mode=${mode}&oobCode=${encodeURIComponent(oobCode)}`;
      if (apiKey) {
        verifyUrl += `&apiKey=${encodeURIComponent(apiKey)}`;
      }
      if (lang) {
        verifyUrl += `&lang=${encodeURIComponent(lang)}`;
      }
      
      console.log('🔄 Redirecting to custom verify page:', verifyUrl);
      
      // If we're on the Firebase domain, redirect to localhost
      if (window.location.hostname.includes('firebaseapp.com')) {
        window.location.href = `http://localhost:8085${verifyUrl}`;
        return;
      }
      
      // Otherwise, use React Router navigation
      navigate(verifyUrl, { replace: true });
      return;
    }

    // For any other modes or if something goes wrong, redirect to login
    console.log('⚠️ Unknown action mode or missing oobCode, redirecting to login');
    
    if (window.location.hostname.includes('firebaseapp.com')) {
      window.location.href = 'http://localhost:8085/login';
      return;
    }
    
    navigate('/login', { replace: true });
  }, [location, navigate]);

  // Show loading while processing
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Redirecting to SpeakUp GC...
          </h2>
          <p className="text-gray-600">
            Taking you to your personalized password reset page.
          </p>
          
          {/* Show current URL info for debugging */}
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
            Processing auth action from Firebase...
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthAction;
