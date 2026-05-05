const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Your web app's Firebase configuration (same as in your firebase.ts)
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

async function createAdminUser() {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Add admin custom claims in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      isAdmin: true,
      createdAt: new Date().toISOString()
    });

    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', user.uid);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
