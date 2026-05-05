// Run this script in browser console to add your email to registeredUsers
// This ensures you can sign up/login with Google

const addToRegisteredUsers = async () => {
  console.log('🔧 Adding emails to registered users...');
  
  const emails = [
    'admin@safespace.com',
    'mae01.mariel17@gmail.com'
  ];
  
  for (const email of emails) {
    try {
      // Get Firestore functions from Firebase SDK
      const { doc, setDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase.js');
      
      const registeredUserRef = doc(db, 'registeredUsers', email);
      
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
        isAdmin: true
      });
      
      console.log(`✅ Successfully registered email: ${email}`);
    } catch (error) {
      console.error(`❌ Failed to register ${email}:`, error);
    }
  }
  
  console.log('🎉 Registration complete! You can now sign up/login with Google.');
};

// Auto-run
addToRegisteredUsers();

// Also make it available globally for manual use
window.addToRegisteredUsers = addToRegisteredUsers;
