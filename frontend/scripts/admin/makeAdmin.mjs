import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvxkUHY6GJmsyMT3m0VGo08GsqDyEqmL4",
  authDomain: "safespace-7c5e3.firebaseapp.com",
  projectId: "safespace-7c5e3",
  storageBucket: "safespace-7c5e3.firebasestorage.app",
  messagingSenderId: "117327859846",
  appId: "1:117327859846:web:315e7ddce3e0a52c478107",
  measurementId: "G-0FFLYE3JJ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Admin credentials
const email = 'admin@safespace.com';
const password = 'Admin@123';

async function makeUserAdmin() {
  try {
    console.log('Signing in as admin user...');
    
    // Sign in with admin credentials
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('Successfully signed in:', user.email);
    
    // Check if user document exists
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log('User document exists, updating admin status...');
      
      // Update existing document to set admin privileges
      await setDoc(userDocRef, {
        ...userDoc.data(),
        isAdmin: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
    } else {
      console.log('User document does not exist, creating new one...');
      
      // Create new user document with admin privileges
      await setDoc(userDocRef, {
        email: email,
        isAdmin: true,
        createdAt: new Date().toISOString()
      });
    }
    
    console.log('✅ Admin privileges granted successfully!');
    console.log('Admin Credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', user.uid);
    
    // Sign out after updating
    await auth.signOut();
    console.log('Signed out successfully');
    
  } catch (error) {
    console.error('❌ Error making user admin:', error);
    
    if (error.code === 'auth/user-not-found') {
      console.log('User does not exist. Please create the account first.');
    } else if (error.code === 'auth/wrong-password') {
      console.log('Wrong password provided.');
    }
    
    process.exit(1);
  }
}

makeUserAdmin();
