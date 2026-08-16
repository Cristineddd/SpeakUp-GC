/**
 * User Display Utility
 * 
 * Utility functions for displaying user information in a user-friendly way.
 * This ensures consistent and readable display of user identities across the app.
 */

import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db } from '../firebase';

// Cache for user display names to avoid repeated Firestore calls
const userDisplayNameCache = new Map<string, string>();

/**
 * Get a readable display name for a user ID
 * 
 * @param userId - The user ID (Firebase auth UID)
 * @param fallback - Fallback text if user not found (default: "CODI member")
 * @returns Promise resolving to the user's display name
 */
export async function getUserDisplayName(userId: string, fallback: string = 'CODI member'): Promise<string> {
  // Check cache first
  if (userDisplayNameCache.has(userId)) {
    return userDisplayNameCache.get(userId)!;
  }

  // If it's already a readable name (not a Firebase UID), return as-is
  // Firebase UIDs are typically 28 characters long
  if (userId.length < 20 || userId.includes(' ') || userId.includes('@')) {
    return userId;
  }

  try {
    const firestore = getFirestore();
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const displayName = userData.displayName || userData.name || userData.email || fallback;
      
      // Cache the result
      userDisplayNameCache.set(userId, displayName);
      return displayName;
    }
  } catch (error) {
    console.error('Error fetching user display name:', error);
  }

  return fallback;
}

/**
 * Get a readable display name for a handler (synchronous version with cache)
 * 
 * @param userId - The user ID
 * @param fallback - Fallback text if user not found
 * @returns The cached display name or fallback
 */
export function getCachedUserDisplayName(userId: string, fallback: string = 'CODI member'): string {
  // Check cache first
  if (userDisplayNameCache.has(userId)) {
    return userDisplayNameCache.get(userId)!;
  }

  // If it's already a readable name, return as-is
  if (userId.length < 20 || userId.includes(' ') || userId.includes('@')) {
    return userId;
  }

  return fallback;
}

/**
 * Format user ID for display - masks part of the ID for privacy
 * 
 * @param userId - The user ID
 * @returns Masked user ID (e.g., "D1Wz...6Ev")
 */
export function formatUserId(userId: string): string {
  if (userId.length < 10) return userId;
  return `${userId.substring(0, 4)}...${userId.substring(userId.length - 3)}`;
}

/**
 * Clear the user display name cache (useful for testing or logout)
 */
export function clearUserDisplayNameCache(): void {
  userDisplayNameCache.clear();
}
