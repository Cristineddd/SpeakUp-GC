/**
 * Representative Statistics Service
 * Utilities for recalculating and syncing representative case counts
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Recalculate active and resolved cases for a specific representative
 */
export async function recalculateRepresentativeCases(representativeId: string): Promise<{
  activeCases: number;
  resolvedCases: number;
}> {
  try {
    console.log(`🔄 Recalculating cases for representative: ${representativeId}`);

    // Query all complaints assigned to this representative
    const complaintsQuery = query(
      collection(db, 'complaints'),
      where('assignedTo', '==', representativeId)
    );
    const complaintsSnapshot = await getDocs(complaintsQuery);

    // Query all reports assigned to this representative
    const reportsQuery = query(
      collection(db, 'reports'),
      where('assignedTo', '==', representativeId)
    );
    const reportsSnapshot = await getDocs(reportsQuery);

    // Count active and resolved cases
    let activeCases = 0;
    let resolvedCases = 0;

    // Count from complaints
    complaintsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status?.toLowerCase() || '';
      
      if (status === 'resolved' || status === 'dismissed') {
        resolvedCases++;
      } else {
        activeCases++;
      }
    });

    // Count from reports
    reportsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status?.toLowerCase() || '';
      
      if (status === 'resolved' || status === 'dismissed') {
        resolvedCases++;
      } else {
        activeCases++;
      }
    });

    // Update the representative document
    const repRef = doc(db, 'representatives', representativeId);
    await updateDoc(repRef, {
      activeCases,
      resolvedCases,
      totalCasesHandled: activeCases + resolvedCases,
      updatedAt: new Date()
    });

    console.log(`✅ Updated representative ${representativeId}: ${activeCases} active, ${resolvedCases} resolved`);

    return { activeCases, resolvedCases };
  } catch (error) {
    console.error(`❌ Error recalculating cases for representative ${representativeId}:`, error);
    throw error;
  }
}

/**
 * Recalculate cases for all representatives
 * Useful for fixing stale data after bulk operations
 */
export async function recalculateAllRepresentativeCases(): Promise<{
  updated: number;
  errors: number;
}> {
  try {
    console.log('🔄 Recalculating cases for all representatives...');

    // Get all representatives
    const representativesSnapshot = await getDocs(collection(db, 'representatives'));
    
    let updated = 0;
    let errors = 0;

    // Process each representative
    for (const repDoc of representativesSnapshot.docs) {
      try {
        await recalculateRepresentativeCases(repDoc.id);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update representative ${repDoc.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Recalculation complete: ${updated} updated, ${errors} errors`);

    return { updated, errors };
  } catch (error) {
    console.error('❌ Error recalculating all representative cases:', error);
    throw error;
  }
}

/**
 * Reset all representative case counts to zero
 * Use with caution - only for testing or data cleanup
 */
export async function resetAllRepresentativeCounts(): Promise<number> {
  try {
    console.log('⚠️ Resetting all representative case counts to zero...');

    const representativesSnapshot = await getDocs(collection(db, 'representatives'));
    const batch = writeBatch(db);

    representativesSnapshot.docs.forEach(repDoc => {
      batch.update(repDoc.ref, {
        activeCases: 0,
        resolvedCases: 0,
        totalCasesHandled: 0,
        updatedAt: new Date()
      });
    });

    await batch.commit();

    console.log(`✅ Reset ${representativesSnapshot.size} representatives`);
    return representativesSnapshot.size;
  } catch (error) {
    console.error('❌ Error resetting representative counts:', error);
    throw error;
  }
}
