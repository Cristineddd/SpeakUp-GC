/**
 * Representative Service
 * Manages case handlers and administrators
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Representative,
  CreateRepresentativeData,
  UpdateRepresentativeData,
  RepresentativeStats,
  RepresentativeFilters,
  RepresentativeRole,
  DEFAULT_PERMISSIONS
} from '../types/representative';

export class RepresentativeService {
  private static readonly COLLECTION = 'representatives';

  /**
   * Auto-register current user as admin (for development/setup)
   */
  static async autoRegisterAsAdmin(userId: string, email: string, displayName?: string): Promise<void> {
    try {
      console.log('🔧 Auto-registering user as admin:', email);
      
      const representativeData: CreateRepresentativeData = {
        userId,
        email,
        displayName: displayName || email.split('@')[0],
        role: 'admin' as RepresentativeRole,
        department: 'Administration',
        position: 'System Administrator',
        permissions: [
          'view_cases',
          'assign_cases',
          'update_status',
          'escalate_cases',
          'resolve_cases',
          'view_evidence',
          'send_messages',
          'view_analytics',
          'manage_representatives'
        ]
      };

      await this.create(representativeData);
      console.log('✅ User registered as admin successfully');
    } catch (error) {
      console.error('❌ Error auto-registering user:', error);
      throw error;
    }
  }

  /**
   * Get all representatives
   */
  static async getAll(filters?: RepresentativeFilters): Promise<Representative[]> {
    try {
      console.log('🔍 Fetching all representatives...');
      
      let q = query(collection(db, this.COLLECTION), orderBy('displayName'));

      // Apply filters
      if (filters?.role && filters.role.length > 0) {
        q = query(q, where('role', 'in', filters.role));
      }
      
      if (filters?.isActive !== undefined) {
        q = query(q, where('isActive', '==', filters.isActive));
      }

      const snapshot = await getDocs(q);
      let representatives = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() ? doc.data().updatedAt.toDate().toISOString() : doc.data().updatedAt,
        lastActive: doc.data().lastActive?.toDate?.() ? doc.data().lastActive.toDate().toISOString() : doc.data().lastActive,
        lastLoginAt: doc.data().lastLoginAt?.toDate?.() ? doc.data().lastLoginAt.toDate().toISOString() : doc.data().lastLoginAt
      })) as Representative[];

      // Apply client-side filters
      if (filters?.department && filters.department.length > 0) {
        representatives = representatives.filter(rep => 
          filters.department!.includes(rep.department)
        );
      }

      if (filters?.onlineStatus && filters.onlineStatus.length > 0) {
        representatives = representatives.filter(rep => 
          filters.onlineStatus!.includes(rep.onlineStatus)
        );
      }

      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        representatives = representatives.filter(rep =>
          rep.displayName.toLowerCase().includes(query) ||
          rep.email.toLowerCase().includes(query) ||
          rep.department.toLowerCase().includes(query) ||
          rep.position.toLowerCase().includes(query)
        );
      }

      console.log(`✅ Found ${representatives.length} representatives`);
      return representatives;
    } catch (error) {
      console.error('❌ Error fetching representatives:', error);
      throw error;
    }
  }

  /**
   * Get representative by ID
   */
  static async getById(id: string): Promise<Representative | null> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn(`Representative ${id} not found`);
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        lastActive: data.lastActive?.toDate?.() ? data.lastActive.toDate().toISOString() : data.lastActive,
        lastLoginAt: data.lastLoginAt?.toDate?.() ? data.lastLoginAt.toDate().toISOString() : data.lastLoginAt
      } as Representative;
    } catch (error) {
      console.error(`❌ Error fetching representative ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get representative by user ID
   */
  static async getByUserId(userId: string): Promise<Representative | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        lastActive: data.lastActive?.toDate?.() ? data.lastActive.toDate().toISOString() : data.lastActive,
        lastLoginAt: data.lastLoginAt?.toDate?.() ? data.lastLoginAt.toDate().toISOString() : data.lastLoginAt
      } as Representative;
    } catch (error) {
      console.error(`❌ Error fetching representative by userId ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create new representative
   */
  static async create(data: CreateRepresentativeData): Promise<string> {
    try {
      console.log('📝 Creating representative:', data.displayName);

      // Import DEFAULT_PERMISSIONS dynamically to avoid circular dependency
      const { DEFAULT_PERMISSIONS } = await import('../types/representative');
      
      const now = Timestamp.now();
      const representative: Omit<Representative, 'id'> = {
        ...data,
        assignedCases: [],
        activeCases: 0,
        resolvedCases: 0,
        totalCasesHandled: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        resolutionRate: 0,
        isActive: true,
        onlineStatus: 'offline',
        permissions: data.permissions || DEFAULT_PERMISSIONS[data.role],
        canAssignCases: data.role === 'admin',
        canEscalateCases: data.role === 'admin' || data.role === 'handler',
        canResolveCases: data.role === 'admin' || data.role === 'handler',
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString(),
        lastActive: now.toDate().toISOString()
      };

      const docRef = doc(collection(db, this.COLLECTION));
      await setDoc(docRef, {
        ...representative,
        createdAt: now,
        updatedAt: now,
        lastActive: now
      });

      console.log(`✅ Representative created: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating representative:', error);
      throw error;
    }
  }

  /**
   * Update representative
   */
  static async update(id: string, data: UpdateRepresentativeData): Promise<void> {
    try {
      console.log(`📝 Updating representative: ${id}`);

      const docRef = doc(db, this.COLLECTION, id);
      const updateData: any = {
        ...data,
        updatedAt: Timestamp.now()
      };

      // Update role-based permissions if role changed
      if (data.role) {
        const { DEFAULT_PERMISSIONS } = await import('../types/representative');
        updateData.permissions = data.permissions || DEFAULT_PERMISSIONS[data.role];
        updateData.canAssignCases = data.role === 'admin';
        updateData.canEscalateCases = data.role === 'admin' || data.role === 'handler';
        updateData.canResolveCases = data.role === 'admin' || data.role === 'handler';
      }

      await updateDoc(docRef, updateData);
      console.log(`✅ Representative updated: ${id}`);
    } catch (error) {
      console.error(`❌ Error updating representative ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete representative
   */
  static async delete(id: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting representative: ${id}`);
      
      const docRef = doc(db, this.COLLECTION, id);
      await deleteDoc(docRef);
      
      console.log(`✅ Representative deleted: ${id}`);
    } catch (error) {
      console.error(`❌ Error deleting representative ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update representative's online status
   */
  static async updateOnlineStatus(id: string, status: 'online' | 'away' | 'offline'): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      await updateDoc(docRef, {
        onlineStatus: status,
        lastActive: Timestamp.now()
      });
    } catch (error) {
      console.error(`❌ Error updating online status for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      await updateDoc(docRef, {
        lastLoginAt: Timestamp.now(),
        lastActive: Timestamp.now(),
        onlineStatus: 'online'
      });
    } catch (error) {
      console.error(`❌ Error updating last login for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Assign case to representative
   */
  static async assignCase(representativeId: string, complaintId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, representativeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Representative not found');
      }

      const data = docSnap.data();
      const assignedCases = data.assignedCases || [];

      if (!assignedCases.includes(complaintId)) {
        await updateDoc(docRef, {
          assignedCases: [...assignedCases, complaintId],
          activeCases: (data.activeCases || 0) + 1,
          totalCasesHandled: (data.totalCasesHandled || 0) + 1,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error(`❌ Error assigning case to representative ${representativeId}:`, error);
      throw error;
    }
  }

  /**
   * Unassign case from representative
   */
  static async unassignCase(representativeId: string, complaintId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, representativeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Representative not found');
      }

      const data = docSnap.data();
      const assignedCases = (data.assignedCases || []).filter((id: string) => id !== complaintId);

      await updateDoc(docRef, {
        assignedCases,
        activeCases: Math.max(0, (data.activeCases || 0) - 1),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error(`❌ Error unassigning case from representative ${representativeId}:`, error);
      throw error;
    }
  }

  /**
   * Mark case as resolved (updates metrics)
   */
  static async markCaseResolved(representativeId: string, complaintId: string, resolutionTime: number): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, representativeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Representative not found');
      }

      const data = docSnap.data();
      const resolvedCases = (data.resolvedCases || 0) + 1;
      const totalCases = data.totalCasesHandled || 0;
      
      // Calculate new averages
      const currentAvgResolution = data.averageResolutionTime || 0;
      const newAvgResolution = totalCases > 0 
        ? ((currentAvgResolution * (resolvedCases - 1)) + resolutionTime) / resolvedCases
        : resolutionTime;
      
      const resolutionRate = totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0;

      await updateDoc(docRef, {
        resolvedCases,
        activeCases: Math.max(0, (data.activeCases || 0) - 1),
        averageResolutionTime: Math.round(newAvgResolution),
        resolutionRate: Math.round(resolutionRate),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error(`❌ Error marking case resolved for representative ${representativeId}:`, error);
      throw error;
    }
  }

  /**
   * Get representative statistics
   */
  static async getStats(): Promise<RepresentativeStats> {
    try {
      const representatives = await this.getAll();
      
      const stats: RepresentativeStats = {
        totalRepresentatives: representatives.length,
        activeRepresentatives: representatives.filter(r => r.isActive).length,
        totalAssignedCases: representatives.reduce((sum, r) => sum + r.activeCases, 0),
        totalResolvedCases: representatives.reduce((sum, r) => sum + r.resolvedCases, 0),
        averageResolutionTime: representatives.length > 0
          ? Math.round(representatives.reduce((sum, r) => sum + r.averageResolutionTime, 0) / representatives.length)
          : 0,
        byRole: {}
      };

      // Group by role
      representatives.forEach(rep => {
        if (!stats.byRole[rep.role]) {
          stats.byRole[rep.role] = {
            count: 0,
            activeCases: 0,
            resolvedCases: 0
          };
        }
        stats.byRole[rep.role].count++;
        stats.byRole[rep.role].activeCases += rep.activeCases;
        stats.byRole[rep.role].resolvedCases += rep.resolvedCases;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting representative stats:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  static subscribeToAll(
    callback: (representatives: Representative[]) => void,
    filters?: RepresentativeFilters
  ): Unsubscribe {
    let q = query(collection(db, this.COLLECTION), orderBy('displayName'));

    // Apply filters
    if (filters?.role && filters.role.length > 0) {
      q = query(q, where('role', 'in', filters.role));
    }
    
    if (filters?.isActive !== undefined) {
      q = query(q, where('isActive', '==', filters.isActive));
    }

    return onSnapshot(q, (snapshot) => {
      let representatives = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() ? doc.data().updatedAt.toDate().toISOString() : doc.data().updatedAt,
        lastActive: doc.data().lastActive?.toDate?.() ? doc.data().lastActive.toDate().toISOString() : doc.data().lastActive,
        lastLoginAt: doc.data().lastLoginAt?.toDate?.() ? doc.data().lastLoginAt.toDate().toISOString() : doc.data().lastLoginAt
      })) as Representative[];

      // Apply client-side filters
      if (filters?.department && filters.department.length > 0) {
        representatives = representatives.filter(rep => 
          filters.department!.includes(rep.department)
        );
      }

      if (filters?.onlineStatus && filters.onlineStatus.length > 0) {
        representatives = representatives.filter(rep => 
          filters.onlineStatus!.includes(rep.onlineStatus)
        );
      }

      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        representatives = representatives.filter(rep =>
          rep.displayName.toLowerCase().includes(query) ||
          rep.email.toLowerCase().includes(query) ||
          rep.department.toLowerCase().includes(query) ||
          rep.position.toLowerCase().includes(query)
        );
      }

      callback(representatives);
    });
  }
}

export default RepresentativeService;
