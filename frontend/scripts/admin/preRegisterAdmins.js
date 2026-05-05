// Run this script to ensure admin emails are pre-registered
// Copy and paste this into the browser console

const preRegisterAdminEmails = async () => {
  console.log('🔧 Pre-registering admin emails...');
  
  // Import Firestore functions (if not already available)
  const { doc, setDoc, getDoc } = window.firebase?.firestore || 
    await import('firebase/firestore');
  
  const adminEmails = [
    'admin@safespace.com',
    'mae01.mariel17@gmail.com'
  ];
  
  for (const email of adminEmails) {
    try {
      const registeredUserRef = doc(window.db, 'registeredUsers', email);
      
      // Check if already exists
      const existingDoc = await getDoc(registeredUserRef);
      if (existingDoc.exists()) {
        console.log(`ℹ️ Email already registered: ${email}`);
        continue;
      }
      
      // Add to registered users
      await setDoc(registeredUserRef, {
        email: email,
        registeredAt: new Date().toISOString(),
        addedBy: 'system',
        status: 'active',
        isAdmin: email.includes('admin') || email.includes('mae01.mariel17')
      });
      
      console.log(`✅ Successfully registered email: ${email}`);
    } catch (error) {
      console.error(`❌ Failed to register ${email}:`, error);
    }
  }
  
  console.log('🎉 Admin email pre-registration complete!');
};

// Auto-run the function
preRegisterAdminEmails();
