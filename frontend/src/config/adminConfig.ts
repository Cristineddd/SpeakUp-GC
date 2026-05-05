// Admin Configuration for SpeakUp GC
// Add your actual email addresses here to make them admin accounts

export const ADMIN_EMAILS = [
  'admin@speakupgc.com', // Default admin email
  'admin@safespace.com', // Legacy admin email
  // Add your real email addresses below:
  // 'your.real.email@gmail.com',
  // 'another.admin@example.com',
];

// Function to check if an email should have admin privileges
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Function to add a new admin email (for dynamic admin creation)
export const addAdminEmail = (email: string): void => {
  const lowerEmail = email.toLowerCase();
  if (!ADMIN_EMAILS.includes(lowerEmail)) {
    ADMIN_EMAILS.push(lowerEmail);
    console.log(`✅ Added ${email} as admin`);
  }
};
