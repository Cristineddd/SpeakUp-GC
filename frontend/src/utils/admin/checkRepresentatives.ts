/**
 * Utility to check and create sample representatives
 * Run this from browser console if representatives are not loading
 */

import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export async function checkRepresentatives() {
  try {
    console.log('🔍 Checking representatives in database...');
    
    const repsCollection = collection(db, 'representatives');
    const snapshot = await getDocs(repsCollection);
    
    console.log(`📊 Found ${snapshot.size} representatives in database`);
    
    const reps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('📋 Representatives:', reps);
    
    // Check for handlers
    const handlers = reps.filter((rep: any) => 
      rep.role === 'handler' || rep.role === 'admin'
    );
    
    console.log(`👥 Active handlers: ${handlers.length}`);
    console.log('Handlers:', handlers);
    
    if (handlers.length === 0) {
      console.warn('⚠️ No handlers found! You need to add representatives from Admin > Representatives Management');
    }
    
    return reps;
  } catch (error) {
    console.error('❌ Error checking representatives:', error);
    throw error;
  }
}

export async function createSampleHandler() {
  try {
    console.log('➕ Creating sample handler...');
    
    const sampleHandler = {
      userId: 'sample-handler-' + Date.now(),
      email: 'handler@example.com',
      displayName: 'Sample Handler',
      role: 'handler',
      department: 'Student Affairs',
      position: 'Investigator',
      contactNumber: '+639123456789',
      isActive: true,
      onlineStatus: 'offline',
      stats: {
        totalCases: 0,
        activeCases: 0,
        resolvedCases: 0,
        averageResolutionTime: 0
      },
      permissions: [
        'view_cases',
        'update_cases',
        'view_analytics',
        'send_messages'
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const repsCollection = collection(db, 'representatives');
    const docRef = await addDoc(repsCollection, sampleHandler);
    
    console.log('✅ Sample handler created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating sample handler:', error);
    throw error;
  }
}

// Make functions available in browser console
if (typeof window !== 'undefined') {
  (window as any).checkRepresentatives = checkRepresentatives;
  (window as any).createSampleHandler = createSampleHandler;
}
