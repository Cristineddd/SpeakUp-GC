import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
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
const password = 'admin123';

async function createAdminUser() {
  try {
    console.log('🚀 Starting admin user creation...');
    
    // First, try to sign in to see if user already exists
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Admin user already exists!');
      console.log('👤 User ID:', userCredential.user.uid);
      
      // Check if admin document exists
      const adminDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        console.log('📋 Admin document exists with role:', data.role || data.isAdmin);
        console.log('✅ Admin setup is complete!');
      } else {
        console.log('⚠️ Creating missing admin document...');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          role: 'admin',
          isAdmin: true,
          firstName: 'Admin',
          lastName: 'User',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Admin document created!');
      }
      
      console.log('');
      console.log('🎉 Admin login credentials:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('   URL: http://localhost:8083/admin/login');
      return;
      
    } catch (signInError) {
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
        console.log('👤 Admin user does not exist, creating new user...');
      } else {
        console.error('❌ Unexpected error:', signInError);
        return;
      }
    }

    // Create user with email and password
    console.log('🔨 Creating admin user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Add admin custom claims in Firestore
    console.log('📝 Creating admin document...');
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      role: 'admin',
      isAdmin: true,
      firstName: 'Admin',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Admin user created successfully!');
    console.log('👤 User ID:', user.uid);
    console.log('');
    console.log('🎉 Admin login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   URL: http://localhost:8083/admin/login');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    console.error('Error code:', error.code);
    process.exit(1);
  }
}

createAdminUser();
