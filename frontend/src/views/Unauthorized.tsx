import { Link } from '../compat/router';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-red-100">
          <div className="mb-6">
            <ShieldX className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">
              You don't have permission to access this page. Administrator privileges are required.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact the administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
