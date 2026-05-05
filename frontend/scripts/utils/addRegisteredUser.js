// Run this in browser console to add a registered user
const addRegisteredUser = async (email) => {
  const { doc, setDoc, getDoc } = await import('firebase/firestore');
  const registeredUserRef = doc(window.db, 'registeredUsers', email);
  
  const existingDoc = await getDoc(registeredUserRef);
  if (existingDoc.exists()) {
    console.log('Email already registered:', email);
    return;
  }
  
  await setDoc(registeredUserRef, {
    email: email,
    registeredAt: new Date().toISOString(),
    addedBy: 'admin',
    status: 'active'
  });
  
  console.log('✅ Successfully registered email:', email);
};

// Usage: addRegisteredUser('newuser@example.com');
