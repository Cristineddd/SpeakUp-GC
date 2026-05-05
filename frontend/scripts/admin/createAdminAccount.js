// Admin Account Creation Script for SafeSpace
// Run this in browser console after opening the signup page

const createAdminAccount = async () => {
  console.log('🔧 Creating admin account...');
  
  // Admin credentials with strong password
  const adminData = {
    email: 'admin@safespace.com',
    password: 'SafeSpace2024!', // Meets all new password requirements
    name: 'SafeSpace Administrator'
  };
  
  console.log('📧 Admin Email:', adminData.email);
  console.log('🔐 Password meets requirements:', {
    minLength: adminData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(adminData.password),
    hasLowercase: /[a-z]/.test(adminData.password),
    hasNumber: /\d/.test(adminData.password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(adminData.password)
  });
  
  try {
    // Go to signup page
    window.location.href = '/signup';
    
    // Instructions for manual creation
    console.log(`
    📋 Manual Admin Account Creation:
    
    1. Fill out the signup form with:
       - Name: ${adminData.name}
       - Email: ${adminData.email}
       - Password: ${adminData.password}
       - Confirm Password: ${adminData.password}
       
    2. Check "Agree to Terms"
    3. Click "Create Account"
    4. Verify email when received
    5. Complete profile setup
    
    ✅ This password meets all security requirements!
    `);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Auto-run when script is loaded
createAdminAccount();
