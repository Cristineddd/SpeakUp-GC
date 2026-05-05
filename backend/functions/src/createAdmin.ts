import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAdminUser(email: string, password: string) {
  try {
    // Create the user
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      emailVerified: true
    });

    // Set custom claims to mark as admin
    await getAuth().setCustomUserClaims(userRecord.uid, { admin: true });

    // Create user document in Firestore
    await getFirestore().collection('users').doc(userRecord.uid).set({
      email: email,
      isAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Successfully created admin user:', userRecord.uid);
    return userRecord;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Example usage (you can change these values)
const email = 'admin@speakupgc.com';
const password = 'Admin123!';

createAdminUser(email, password)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
