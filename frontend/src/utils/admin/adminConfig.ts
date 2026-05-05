// Admin Configuration for SpeakUp GC
// Add email addresses that should have admin privileges

export const ADMIN_EMAILS = [
  'admin@speakupgc.com',          // Default admin (SpeakUp GC)
  'admin@safespace.com',          // Legacy admin
  'mae01.mariel17@gmail.com',     // Cristine Mae - Primary Admin
  // Add more admin emails here as needed
];

export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export const getAdminLevel = (email: string | null | undefined): 'super-admin' | 'admin' | 'user' => {
  if (!email) return 'user';
  
  const normalizedEmail = email.toLowerCase();
  
  // Super admin (first email in list)
  if (normalizedEmail === ADMIN_EMAILS[0]) return 'super-admin';
  
  // Regular admin
  if (ADMIN_EMAILS.includes(normalizedEmail)) return 'admin';
  
  // Regular user
  return 'user';
};
