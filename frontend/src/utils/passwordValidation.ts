export interface PasswordValidation {
  isValid: boolean;
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
  };
  feedback: string[];
}

export const validatePassword = (password: string): PasswordValidation => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const feedback: string[] = [];
  
  if (!requirements.minLength) {
    feedback.push("Password must be at least 8 characters long");
  }
  if (!requirements.hasUppercase) {
    feedback.push("Password must contain at least one uppercase letter");
  }
  if (!requirements.hasLowercase) {
    feedback.push("Password must contain at least one lowercase letter");
  }
  if (!requirements.hasNumber) {
    feedback.push("Password must contain at least one number");
  }

  // Calculate score based on requirements met
  const requirementsMet = Object.values(requirements).filter(Boolean).length;
  let score = requirementsMet;
  
  // Bonus points for longer passwords
  if (password.length >= 12) score += 0.5;
  if (password.length >= 16) score += 0.5;
  
  // Cap at 4
  score = Math.min(4, Math.floor(score));

  const isValid = Object.values(requirements).every(Boolean);

  return {
    isValid,
    score,
    requirements,
    feedback,
  };
};

export const getPasswordStrength = (score: number): { label: string; color: string; bgColor: string } => {
  switch (score) {
    case 0:
    case 1:
      return { label: "Very Weak", color: "text-red-600", bgColor: "bg-red-100" };
    case 2:
      return { label: "Weak", color: "text-red-500", bgColor: "bg-red-50" };
    case 3:
      return { label: "Good", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    case 4:
      return { label: "Strong", color: "text-green-600", bgColor: "bg-green-100" };
    default:
      return { label: "Very Weak", color: "text-red-600", bgColor: "bg-red-100" };
  }
};
