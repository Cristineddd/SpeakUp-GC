import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { validatePassword, getPasswordStrength } from '../../utils/passwordValidation';

interface PasswordStrengthCheckerProps {
  password: string;
  showDetails?: boolean;
}

export const PasswordStrengthChecker: React.FC<PasswordStrengthCheckerProps> = ({ 
  password, 
  showDetails = true 
}) => {
  const validation = validatePassword(password);
  const strength = getPasswordStrength(validation.score);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Indicator */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              validation.score === 0 ? 'bg-red-500 w-1/4' :
              validation.score === 1 ? 'bg-red-400 w-2/4' :
              validation.score === 2 ? 'bg-yellow-500 w-3/4' :
              validation.score === 3 ? 'bg-yellow-400 w-4/4' :
              'bg-green-500 w-full'
            }`}
          />
        </div>
        <span className={`text-sm font-medium ${strength.color}`}>
          {strength.label}
        </span>
      </div>

      {/* Requirements List */}
      {showDetails && (
        <div className="space-y-1">
          {Object.entries(validation.requirements).map(([key, met]) => (
            <div key={key} className="flex items-center space-x-2 text-sm">
              {met ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={met ? 'text-green-700' : 'text-red-600'}>
                {getRequirementText(key)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {validation.isValid && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Password meets all security requirements!</span>
        </div>
      )}
    </div>
  );
};

const getRequirementText = (key: string): string => {
  switch (key) {
    case 'minLength':
      return '8 characters';
    case 'hasUppercase':
      return '1 uppercase letter';
    case 'hasLowercase':
      return '1 lowercase letter';
    case 'hasNumber':
      return '1 number';
    default:
      return '';
  }
};
