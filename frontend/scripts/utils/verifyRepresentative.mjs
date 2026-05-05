/**
 * Verify and Fix Representative Document
 * Ensures the representative document has isActive: true
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAx4p9yXwx3iX1r4t9Jfb-d93bKLMPRr0A",
  authDomain: "safespace-7c5e3.firebaseapp.com",
  projectId: "safespace-7c5e3",
  storageBucket: "safespace-7c5e3.firebasestorage.app",
  messagingSenderId: "117327859846",
  appId: "1:117327859846:web:48e19ede58e7da42c71b06",
  measurementId: "G-4G53WDVPN8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Your user ID (the one shown in the logs)
const userId = 'I5bbP8WnebQlcDwug9Xpr1b7JT23';

async function verifyAndFixRepresentative() {
  try {
    console.log('🔍 Checking representative document for:', userId);
    
    const repRef = doc(db, 'representatives', userId);
    const repDoc = await getDoc(repRef);
    
    if (!repDoc.exists()) {
      console.log('❌ Representative document does NOT exist!');
      console.log('Creating new representative document...');
      
      const newRep = {
        userId: userId,
        email: 'cristinemarielsat@gmail.com',
        displayName: 'Franz Panot',
        role: 'dean',
        department: 'Administration',
        position: 'Dean',
        assignedCases: [],
        activeCases: 0,
        resolvedCases: 0,
        totalCasesHandled: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        resolutionRate: 0,
        isActive: true,  // ✅ CRITICAL: Set to true
        onlineStatus: 'online',
        permissions: [
          'view_cases',
          'view_evidence',
          'view_analytics'
        ],
        canAssignCases: false,
        canEscalateCases: false,
        canResolveCases: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      
      await setDoc(repRef, newRep);
      console.log('✅ Representative document created successfully!');
      console.log(newRep);
      
    } else {
      console.log('✅ Representative document exists!');
      const data = repDoc.data();
      console.log('Current data:', {
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        isActive: data.isActive
      });
      
      if (data.isActive !== true) {
        console.log('⚠️  isActive is NOT true, updating...');
        await updateDoc(repRef, {
          isActive: true,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Updated isActive to true');
      } else {
        console.log('✅ isActive is already true - all good!');
      }
    }
    
    console.log('\n✅ Verification complete! Try refreshing your browser now.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAndFixRepresentative();
