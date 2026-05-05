// Utility to add registered users to the system
// This should be used by admins to pre-register email addresses

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const addRegisteredUser = async (email: string, addedBy: string = 'admin'): Promise<void> => {
  try {
    const registeredUserRef = doc(db, 'registeredUsers', email);
    
    // Check if already exists
    const existingDoc = await getDoc(registeredUserRef);
    if (existingDoc.exists()) {
      throw new Error('Email is already registered in the system');
    }
    
    // Add to registered users
    await setDoc(registeredUserRef, {
      email: email,
      registeredAt: new Date().toISOString(),
      addedBy: addedBy,
      status: 'active'
    });
    
    console.log(`✅ Successfully registered email: ${email}`);
  } catch (error) {
    console.error('❌ Failed to register email:', error);
    throw error;
  }
};

export const removeRegisteredUser = async (email: string): Promise<void> => {
  try {
    const registeredUserRef = doc(db, 'registeredUsers', email);
    
    // Note: Firestore doesn't have a direct delete in this context
    // We'll mark as inactive instead
    await setDoc(registeredUserRef, {
      status: 'inactive',
      removedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`✅ Successfully deactivated email: ${email}`);
  } catch (error) {
    console.error('❌ Failed to deactivate email:', error);
    throw error;
  }
};

export const isEmailRegistered = async (email: string): Promise<boolean> => {
  try {
    const registeredUserRef = doc(db, 'registeredUsers', email);
    const doc_snap = await getDoc(registeredUserRef);
    
    if (!doc_snap.exists()) return false;
    
    const data = doc_snap.data();
    return data?.status !== 'inactive';
  } catch (error) {
    console.error('❌ Failed to check email registration:', error);
    return false;
  }
};

// Pre-register your admin email and other authorized emails
export const preRegisterAdminEmails = async (): Promise<void> => {
  const adminEmails = [
    'admin@speakupgc.com',
    'admin@safespace.com',
    'mae01.mariel17@gmail.com'
  ];
  
  for (const email of adminEmails) {
    try {
      await addRegisteredUser(email, 'system');
      console.log(`✅ Pre-registered admin email: ${email}`);
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        console.log(`ℹ️ Email already registered: ${email}`);
      } else {
        console.error(`❌ Failed to pre-register ${email}:`, error);
      }
    }
  }
};
