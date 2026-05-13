import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { MessageService } from './messageService';
import { NotificationService } from './notificationService';

export interface AdminReport {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'inProgress' | 'resolved' | 'dismissed';
  userName: string;
  userEmail: string;
  userId: string;
  incidentDate: string;
  incidentTime?: string;
  reportedAt: string;
  lastUpdated: string;
  witnesses?: string;
  additionalInfo?: string;
  respondentName?: string;
  respondentAddress?: string;
  adminNotes?: string;
  assignedTo?: string;
  evidence?: {
    fileUrls: string[];
    fileTypes: string[];
  };
  evidenceURLs?: string[];
  evidenceCount?: number;
  evidenceFileNames?: string[];
  _collectionSource?: string;
  
  // Case Handler Fields
  assignedToName?: string | null;
  assignedToRole?: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  
  handlerHistory?: Array<{
    handlerId: string;
    handlerName: string;
    handlerRole: string;
    assignedAt: string;
    assignedBy: string;
    assignedByName: string;
    unassignedAt?: string;
    unassignedBy?: string;
    unassignedReason?: string;
    notes?: string;
  }>;
  
  // Processing timestamps
  processingStartedAt?: string | null;
  processingCompletedAt?: string | null;
  lastActivityAt?: string;
  
  // Time tracking (in hours)
  timeToAssignment?: number | null;
  timeToResolution?: number | null;
  
  // Escalation Fields
  escalationLevel?: 0 | 1 | 2 | 3;
  isEscalated?: boolean;
  escalatedAt?: string | null;
  escalationReason?: string;
  escalationNotes?: string;
  autoEscalated?: boolean;
  
  escalationHistory?: Array<{
    level: number;
    previousLevel: number;
    escalatedAt: string;
    escalatedBy: string;
    escalatedByName?: string;
    reason: string;
    notes?: string;
    autoEscalated: boolean;
  }>;
  
  // SLA Tracking
  slaDeadline?: string | null;
  slaBreached?: boolean;
  slaBreachedAt?: string | null;
  hoursUnprocessed?: number;
  daysUnprocessed?: number;
  lastEscalationCheck?: string;
  
  // Location Fields
  latitude?: number;
  longitude?: number;
  mapAddress?: string;
  locationVicinity?: string; // "inside" or "outside"
}

export interface ReportStats {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  resolvedReports: number;
  dismissedReports: number;
  escalatedReports: number;
  todayReports: number;
  weekReports: number;
  monthReports: number;
}

export interface ReportFilters {
  status?: string[];
  category?: string[];
  severity?: string[];
  dateRange?: { start: Date; end: Date };
  assignedTo?: string;
}

export class AdminReportService {
  
  /**
   * Fetch all reports with optional filters
   */
  static async getAllReports(filters?: ReportFilters): Promise<AdminReport[]> {
    try {
      console.log('🔍 AdminReportService: Fetching all reports from complaints collection...');
      
      let allReports: AdminReport[] = [];
      const seenIds = new Set<string>();
      
      // Only fetch from 'complaints' collection
      await this.fetchFromCollection('complaints', allReports, filters, seenIds);
      
      // Sort all reports by reportedAt date
      allReports.sort((a, b) => {
        const dateA = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
        const dateB = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      console.log(`📊 AdminReportService: Found ${allReports.length} complaints`);
      return allReports;
      
    } catch (error) {
      console.error('❌ AdminReportService: Error fetching reports:', error);
      return [];
    }
  }

  /**
   * Fetch all reports assigned to a specific handler
   */
  static async getReportsByHandler(handlerId: string): Promise<AdminReport[]> {
    try {
      console.log(`🔍 AdminReportService: Fetching reports assigned to handler ${handlerId}...`);
      
      const complaintsRef = collection(db, 'complaints');
      const q = query(
        complaintsRef,
        where('assignedTo', '==', handlerId),
        orderBy('reportedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const reports: AdminReport[] = [];

      querySnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data()
        } as AdminReport);
      });

      console.log(`📊 AdminReportService: Found ${reports.length} reports assigned to handler`);
      return reports;

    } catch (error) {
      console.error('❌ AdminReportService: Error fetching handler reports:', error);
      return [];
    }
  }
  
  /**
   * Helper method to fetch from a specific collection
   */
  private static async fetchFromCollection(
    collectionName: string, 
    allReports: AdminReport[], 
    filters?: ReportFilters,
    seenIds?: Set<string>
  ): Promise<void> {
    console.log(`🔍 Fetching from '${collectionName}' collection...`);
    
    try {
      let q;
      
      if (filters) {
        const queryConstraints: any[] = [];
        
        if (filters.status && filters.status.length > 0) {
          queryConstraints.push(where('status', 'in', filters.status));
        }
        
        if (filters.category && filters.category.length > 0) {
          queryConstraints.push(where('category', 'in', filters.category));
        }
        
        if (filters.severity && filters.severity.length > 0) {
          queryConstraints.push(where('severity', 'in', filters.severity));
        }
        
        if (filters.assignedTo) {
          queryConstraints.push(where('assignedTo', '==', filters.assignedTo));
        }
        
        queryConstraints.push(orderBy('createdAt', 'desc'));
        q = query(collection(db, collectionName), ...queryConstraints);
      } else {
        q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      console.log(`📋 Found ${querySnapshot.size} documents in '${collectionName}' collection`);
      
      querySnapshot.forEach((doc) => {
        if (seenIds && seenIds.has(doc.id)) {
          console.log(`🔄 Skipping duplicate report ID: ${doc.id} from ${collectionName}`);
          return;
        }
        
        const data = doc.data();
        const report = this.transformToAdminReport(doc.id, data, collectionName);
        
        if (seenIds) {
          seenIds.add(doc.id);
        }
        
        allReports.push(report);
      });
      
    } catch (error) {
      console.error(`❌ Error fetching from '${collectionName}' collection:`, error);
    }
  }

  /**
   * Transform document data to AdminReport format
   */
  private static transformToAdminReport(docId: string, data: any, collectionName: string): AdminReport {
    // Handle Firestore timestamps
    const reportedAt = data.reportedAt ? 
      (data.reportedAt.toDate ? data.reportedAt.toDate().toISOString() : data.reportedAt) : 
      (data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : '');

    const incidentDate = data.incidentDate ? 
      (data.incidentDate.toDate ? data.incidentDate.toDate().toISOString() : data.incidentDate) : '';

    const lastUpdated = data.lastUpdated ? 
      (data.lastUpdated.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated) : 
      (data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : reportedAt);

    const assignedAt = data.assignedAt ? 
      (data.assignedAt.toDate ? data.assignedAt.toDate().toISOString() : data.assignedAt) : null;

    const report: AdminReport = {
      id: docId,
      title: data.title || data.description?.substring(0, 50) || 'Untitled Report',
      description: data.description || '',
      location: data.location || data.incidentLocation || '',
      category: data.category || data.type || 'other',
      severity: data.severity || 'medium',
      status: data.status || 'pending',
      userName: data.userName || data.complainantName || 'Anonymous',
      userEmail: data.userEmail || data.email || '',
      userId: data.userId || data.complainantId || '',
      incidentDate: incidentDate,
      reportedAt: reportedAt,
      lastUpdated: lastUpdated,
      witnesses: data.witnesses || '',
      additionalInfo: data.additionalInfo || '',
      respondentName: data.respondentName || '',
      respondentAddress: data.respondentAddress || '',
      adminNotes: data.adminNotes || '',
      assignedTo: data.assignedTo || '',
      assignedToName: data.assignedToName || null,
      assignedToRole: data.assignedToRole || null,
      assignedAt: assignedAt,
      assignedBy: data.assignedBy || null,
      assignedByName: data.assignedByName || null,
      handlerHistory: data.handlerHistory || [],
      
      // ✅ FIXED: Check for evidenceURLs field from FormalComplaint submission
      evidence: data.evidence || 
                (data.evidenceURLs && data.evidenceURLs.length > 0 ? {
                  fileUrls: data.evidenceURLs,
                  fileTypes: data.evidenceURLs.map(() => 'image/jpeg')
                } : undefined) ||
                (data.attachments && data.attachments.length > 0 ? {
                  fileUrls: data.attachments,
                  fileTypes: data.attachments.map(() => 'application/pdf')
                } : undefined),
      
      // Also pass through raw evidenceURLs for direct access
      evidenceURLs: data.evidenceURLs || [],
      evidenceCount: data.evidenceCount || 0,
      evidenceFileNames: data.evidenceFileNames || [],
      
      _collectionSource: collectionName,

      // Initialize other optional fields
      processingStartedAt: data.processingStartedAt || null,
      processingCompletedAt: data.processingCompletedAt || null,
      lastActivityAt: data.lastActivityAt || reportedAt,
      timeToAssignment: data.timeToAssignment || null,
      timeToResolution: data.timeToResolution || null,
      escalationLevel: data.escalationLevel || 0,
      isEscalated: data.isEscalated || false,
      escalatedAt: data.escalatedAt || null,
      escalationReason: data.escalationReason || '',
      escalationNotes: data.escalationNotes || '',
      autoEscalated: data.autoEscalated || false,
      escalationHistory: data.escalationHistory || [],
      slaDeadline: data.slaDeadline || null,
      slaBreached: data.slaBreached || false,
      slaBreachedAt: data.slaBreachedAt || null,
      hoursUnprocessed: data.hoursUnprocessed || 0,
      daysUnprocessed: data.daysUnprocessed || 0,
      lastEscalationCheck: data.lastEscalationCheck || null,
      
      // Location fields
      latitude: data.latitude,
      longitude: data.longitude,
      mapAddress: data.mapAddress,
      locationVicinity: data.locationVicinity
    };

    // Debug log for assignment data
    if (data.assignedTo) {
      console.log(`🔍 Transform: Report ${docId} assignment data:`, {
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        status: data.status,
        collection: collectionName
      });
    }

    return report;
  }

  /**
   * Set up real-time listener for all reports
   */
  static subscribeToAllReports(callback: (reports: AdminReport[]) => void): Unsubscribe {
    const complaintsCollection = collection(db, 'complaints');
    
    // Use orderBy with createdAt for real-time updates
    const complaintsQuery = query(complaintsCollection, orderBy('createdAt', 'desc'));
    
    const allReports: AdminReport[] = [];
    
    console.log('🔍 Setting up real-time complaints listener...');
    
    const unsubscribeComplaints = onSnapshot(complaintsQuery,
      (snapshot) => {
        try {
          console.log(`🔄 Real-time update: ${snapshot.docs.length} complaints found`);
          
          // Clear and rebuild the reports array
          allReports.length = 0;
          
          // Add all complaints
          snapshot.docs.forEach((doc) => {
            try {
              const data = doc.data();
              const report = this.transformToAdminReport(doc.id, data, 'complaints');
              
              // Log assignment info for debugging
              if (data.assignedTo) {
                console.log(`📋 Report ${doc.id}:`, {
                  title: data.title,
                  assignedTo: data.assignedTo,
                  assignedToName: data.assignedToName,
                  status: data.status
                });
              }
              
              if (report) {
                allReports.push(report);
              }
            } catch (error) {
              console.error(`❌ Error processing complaint doc ${doc.id}:`, error);
            }
          });
          
          // Sort by reportedAt
          const sortedReports = allReports.sort((a, b) => {
            const dateA = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
            const dateB = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
            return dateB - dateA;
          });
          
          console.log(`✅ Sending ${sortedReports.length} reports to UI`);
          callback(sortedReports);
          
        } catch (error) {
          console.error('❌ Error in complaints snapshot:', error);
          callback([]);
        }
      },
      (error) => {
        console.error('❌ Error listening to complaints collection:', error);
        callback([]);
      }
    );
    
    return () => {
      console.log('🧹 Cleaning up real-time listener');
      unsubscribeComplaints();
    };
  }

  /**
   * Assign report to admin - FIXED VERSION
   */
  static async assignReport(reportId: string, adminId: string, adminName: string, adminRole?: string): Promise<void> {
    try {
      console.log(`👤 AdminReportService: Assigning report ${reportId} to ${adminName} (${adminId})`);
      
      // Determine which collection contains this report
      let collectionName = 'complaints';
      let reportData: any = null;
      
      // Check complaints collection first
      const complaintRef = doc(db, 'complaints', reportId);
      const complaintSnap = await getDoc(complaintRef);
      
      if (complaintSnap.exists()) {
        collectionName = 'complaints';
        reportData = complaintSnap.data();
        console.log(`✅ Found report in complaints collection:`, {
          title: reportData.title,
          status: reportData.status,
          currentAssignedTo: reportData.assignedTo
        });
      } else {
        // Check reports collection as fallback
        const reportRef = doc(db, 'reports', reportId);
        const reportSnap = await getDoc(reportRef);
        if (reportSnap.exists()) {
          collectionName = 'reports';
          reportData = reportSnap.data();
          console.log(`✅ Found report in reports collection:`, {
            title: reportData.title,
            status: reportData.status,
            currentAssignedTo: reportData.assignedTo
          });
        } else {
          throw new Error(`Report ${reportId} not found in complaints or reports collection`);
        }
      }
      
      const reportRef = doc(db, collectionName, reportId);
      
      // Prepare update data
      const updateData: any = {
        assignedTo: adminId,
        assignedToName: adminName,
        status: 'inProgress',
        lastUpdated: new Date().toISOString(),
        assignedAt: new Date().toISOString()
      };
      
      // Add role if provided
      if (adminRole) {
        updateData.assignedToRole = adminRole;
      }
      
      console.log(`📝 Updating report in ${collectionName} collection:`, updateData);
      
      await updateDoc(reportRef, updateData);
      
      console.log(`✅ AdminReportService: Report ${reportId} assigned successfully to ${adminName}`);
      
      // Send notification to the user
      try {
        await NotificationService.createNotification(
          reportData.userId,
          'complaint_assigned',
          'Complaint Update',
          `Your complaint has been assigned to ${adminName}`,
          {
            priority: 'high',
            complaintId: reportId,
            actionUrl: `/complaint/${reportId}`
          }
        );
      } catch (notifyError) {
        console.warn('⚠️ Could not send notification:', notifyError);
      }
      
      // Verify the update
      try {
        const updatedSnap = await getDoc(reportRef);
        if (updatedSnap.exists()) {
          const updatedData = updatedSnap.data();
          console.log(`✅ Assignment verified:`, {
            assignedTo: updatedData.assignedTo,
            assignedToName: updatedData.assignedToName,
            status: updatedData.status
          });
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify assignment:', verifyError);
      }
      
    } catch (error) {
      console.error(`❌ AdminReportService: Error assigning report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Get report statistics for dashboard
   */
  static async getReportStats(): Promise<ReportStats> {
    try {
      console.log('📈 AdminReportService: Calculating report statistics...');
      
      const reports = await this.getAllReports();
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats: ReportStats = {
        totalReports: reports.length,
        pendingReports: reports.filter(r => r.status === 'pending').length,
        inProgressReports: reports.filter(r => r.status === 'inProgress').length,
        resolvedReports: reports.filter(r => r.status === 'resolved').length,
        dismissedReports: reports.filter(r => r.status === 'dismissed').length,
        escalatedReports: reports.filter(r => r.escalatedAt != null).length,
        todayReports: reports.filter(r => new Date(r.reportedAt) >= todayStart).length,
        weekReports: reports.filter(r => new Date(r.reportedAt) >= weekStart).length,
        monthReports: reports.filter(r => new Date(r.reportedAt) >= monthStart).length,
      };
      
      console.log('📊 AdminReportService: Statistics calculated:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ AdminReportService: Error calculating stats:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listener for report statistics
   */
  static subscribeToReportStats(callback: (stats: ReportStats) => void): Unsubscribe {
    return this.subscribeToAllReports((reports) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const stats: ReportStats = {
        totalReports: reports.length,
        pendingReports: reports.filter(r => r.status === 'pending').length,
        inProgressReports: reports.filter(r => r.status === 'inProgress').length,
        resolvedReports: reports.filter(r => r.status === 'resolved').length,
        dismissedReports: reports.filter(r => r.status === 'dismissed').length,
        escalatedReports: reports.filter(r => r.escalatedAt != null).length,
        todayReports: reports.filter(r => {
          const reportDate = new Date(r.reportedAt);
          return reportDate >= today;
        }).length,
        weekReports: reports.filter(r => {
          const reportDate = new Date(r.reportedAt);
          return reportDate >= weekAgo;
        }).length,
        monthReports: reports.filter(r => {
          const reportDate = new Date(r.reportedAt);
          return reportDate >= monthAgo;
        }).length,
      };
      
      callback(stats);
    });
  }

  /**
   * Add admin note to report
   */
  static async addAdminNote(reportId: string, note: string, adminName: string): Promise<void> {
    try {
      console.log(`📝 AdminReportService: Adding note to report ${reportId}`);
      
      // First, try to find which collection this report belongs to
      let collectionName = 'complaints';
      
      try {
        const complaintRef = doc(db, 'complaints', reportId);
        const complaintSnap = await getDoc(complaintRef);
        
        if (complaintSnap.exists()) {
          collectionName = 'complaints';
        } else {
          const reportRef = doc(db, 'reports', reportId);
          const reportSnap = await getDoc(reportRef);
          if (reportSnap.exists()) {
            collectionName = 'reports';
          } else {
            throw new Error('Report not found in either collection');
          }
        }
      } catch (error) {
        console.warn('Could not determine collection source, using default "complaints"');
      }
      
      const reportRef = doc(db, collectionName, reportId);
      const timestamp = new Date().toLocaleString();
      const formattedNote = `[${timestamp}] ${adminName}: ${note}`;
      
      // Get existing notes
      const reportSnap = await getDoc(reportRef);
      const existingData = reportSnap.exists() ? reportSnap.data() : {};
      const existingNotes = existingData.adminNotes || '';
      
      const updatedNotes = existingNotes 
        ? `${formattedNote}\n\n${existingNotes}`
        : formattedNote;
      
      await updateDoc(reportRef, {
        adminNotes: updatedNotes,
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`✅ AdminReportService: Note added to report ${reportId}`);
      
    } catch (error) {
      console.error(`❌ AdminReportService: Error adding note to report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Debug function to show reports in both collections separately
   */
  static async debugCollections(): Promise<void> {
    try {
      console.log('🔍 DEBUG: Checking both collections separately...');
      
      // Check reports collection
      const reportsQuery = query(collection(db, 'reports'), orderBy('reportedAt', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);
      console.log(`📊 Reports collection: ${reportsSnapshot.docs.length} documents`);
      reportsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ID: ${doc.id}, Title: ${data.title || data.description?.substring(0, 50) || 'No title'}, User: ${data.userName || data.userEmail}`);
      });
      
      // Check complaints collection  
      const complaintsQuery = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
      const complaintsSnapshot = await getDocs(complaintsQuery);
      console.log(`📊 Complaints collection: ${complaintsSnapshot.docs.length} documents`);
      complaintsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ID: ${doc.id}, Title: ${data.title || data.description?.substring(0, 50) || 'No title'}, User: ${data.complainantName || data.userEmail}`);
      });
      
    } catch (error) {
      console.error('❌ Error debugging collections:', error);
    }
  }

  /**
   * Clean up function to remove any orphaned or invalid reports
   */
  static async cleanupReports(): Promise<void> {
    try {
      console.log('🧹 Starting cleanup of invalid reports...');
      
      let deletedCount = 0;
      
      // Clean up reports collection
      const reportsQuery = query(collection(db, 'reports'));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      for (const docSnap of reportsSnapshot.docs) {
        const data = docSnap.data();
        // Check if required fields are missing or invalid
        if (!data.userId || !data.userEmail || (!data.title && !data.description)) {
          console.log(`🗑️ Deleting invalid report from reports: ${docSnap.id}`);
          await deleteDoc(doc(db, 'reports', docSnap.id));
          deletedCount++;
        }
      }
      
      // Clean up complaints collection
      const complaintsQuery = query(collection(db, 'complaints'));
      const complaintsSnapshot = await getDocs(complaintsQuery);
      
      for (const docSnap of complaintsSnapshot.docs) {
        const data = docSnap.data();
        // Check if required fields are missing or invalid
        if (!data.complainantName || (!data.title && !data.description)) {
          console.log(`🗑️ Deleting invalid complaint from complaints: ${docSnap.id}`);
          await deleteDoc(doc(db, 'complaints', docSnap.id));
          deletedCount++;
        }
      }
      
      console.log(`✅ Cleanup complete. Deleted ${deletedCount} invalid records.`);
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Delete a report from Firestore
   */
  static async deleteReport(reportId: string, collectionName: 'reports' | 'complaints' = 'reports'): Promise<void> {
    try {
      console.log(`🗑️ Deleting report ${reportId} from ${collectionName} collection...`);
      
      const reportRef = doc(db, collectionName, reportId);
      await deleteDoc(reportRef);
      
      console.log(`✅ Successfully deleted report ${reportId} from ${collectionName}`);
    } catch (error) {
      console.error(`❌ Error deleting report ${reportId} from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a report by trying both collections
   */
  static async deleteReportFromBothCollections(reportId: string): Promise<void> {
    try {
      console.log(`🗑️ Attempting to delete report ${reportId} from both collections...`);
      
      let deletedFromReports = false;
      let deletedFromComplaints = false;
      
      // Try to delete from reports collection
      try {
        await this.deleteReport(reportId, 'reports');
        console.log(`✅ Deleted ${reportId} from reports collection`);
        deletedFromReports = true;
      } catch (error) {
        console.log(`ℹ️ Report ${reportId} not found in reports collection`);
      }
      
      // Try to delete from complaints collection
      try {
        await this.deleteReport(reportId, 'complaints');
        console.log(`✅ Deleted ${reportId} from complaints collection`);
        deletedFromComplaints = true;
      } catch (error) {
        console.log(`ℹ️ Report ${reportId} not found in complaints collection`);
      }
      
      // Check if we deleted from at least one collection
      if (!deletedFromReports && !deletedFromComplaints) {
        throw new Error(`Report ${reportId} not found in either collection`);
      }
      
      console.log(`✅ Successfully deleted ${reportId} from available collections`);
      
    } catch (error) {
      console.error(`❌ Failed to delete report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Archive a report by updating its status
   */
  static async archiveReport(reportId: string, collectionName: 'reports' | 'complaints' = 'reports'): Promise<void> {
    try {
      console.log(`📦 Archiving report ${reportId} in ${collectionName} collection...`);
      
      const reportRef = doc(db, collectionName, reportId);
      await updateDoc(reportRef, {
        status: 'archived',
        archivedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`✅ Successfully archived report ${reportId} in ${collectionName}`);
    } catch (error) {
      console.error(`❌ Error archiving report ${reportId} in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Archive a report by trying both collections
   */
  static async archiveReportFromBothCollections(reportId: string): Promise<void> {
    try {
      console.log(`📦 Attempting to archive report ${reportId} from both collections...`);
      
      // Try to archive from reports collection first
      try {
        await this.archiveReport(reportId, 'reports');
        console.log(`✅ Archived ${reportId} from reports collection`);
        return;
      } catch (error) {
        console.log(`ℹ️ Report ${reportId} not found in reports collection, trying complaints...`);
      }
      
      // If not found in reports, try complaints collection
      await this.archiveReport(reportId, 'complaints');
      console.log(`✅ Archived ${reportId} from complaints collection`);
      
    } catch (error) {
      console.error(`❌ Failed to archive report ${reportId} from both collections:`, error);
      throw new Error(`Could not archive report ${reportId}. It may not exist in either collection.`);
    }
  }

  /**
   * Update report status
   */
  static async updateReportStatus(reportId: string, newStatus: string, collectionName: 'reports' | 'complaints' = 'reports'): Promise<void> {
    try {
      console.log(`🔄 Updating report ${reportId} status to "${newStatus}" in ${collectionName} collection...`);
      
      const statusToStageMap: Record<string, string> = {
        'pending': 'filing',
        'submitted': 'filing', 
        'inProgress': 'preliminary_investigation',
        'investigating': 'preliminary_investigation',
        'under_review': 'action_on_complaint',
        'resolved': 'final_decision',
        'dismissed': 'closed',
        'closed': 'closed'
      };
      
      const stage = statusToStageMap[newStatus] || 'filing';
      
      const reportRef = doc(db, collectionName, reportId);
      await updateDoc(reportRef, {
        status: newStatus,
        stage: stage,
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`✅ Successfully updated report ${reportId} status to "${newStatus}" and stage to "${stage}" in ${collectionName}`);
    } catch (error) {
      console.error(`❌ Error updating report ${reportId} status in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update report status with client-side notifications (FREE - no Cloud Functions)
   */
  static async updateReportStatusFromBothCollections(reportId: string, newStatus: string, notes?: string): Promise<void> {
    try {
      console.log(`🔄 Updating report ${reportId} status to "${newStatus}" (client-side)...`);
      
      let updatedReports = false;
      let updatedComplaints = false;
      let reportData: any = null;
      
      // Try to update reports collection
      try {
        const reportRef = doc(db, 'reports', reportId);
        const reportSnap = await getDoc(reportRef);
        
        if (reportSnap.exists()) {
          reportData = reportSnap.data();
          await this.updateReportStatus(reportId, newStatus, 'reports');
          console.log(`✅ Updated ${reportId} status in reports collection`);
          updatedReports = true;
        }
      } catch (error) {
        console.log(`ℹ️ Report ${reportId} not found in reports collection`);
      }
      
      // Try to update complaints collection
      try {
        const complaintRef = doc(db, 'complaints', reportId);
        const complaintSnap = await getDoc(complaintRef);
        
        if (complaintSnap.exists()) {
          if (!reportData) reportData = complaintSnap.data();
          await this.updateReportStatus(reportId, newStatus, 'complaints');
          console.log(`✅ Updated ${reportId} status in complaints collection`);
          updatedComplaints = true;
        }
      } catch (error) {
        console.log(`ℹ️ Report ${reportId} not found in complaints collection`);
      }
      
      // If neither collection was updated, throw error
      if (!updatedReports && !updatedComplaints) {
        throw new Error(`Report ${reportId} not found in either collection`);
      }
      
      console.log(`✅ Successfully updated ${reportId} status to "${newStatus}"`);
      
      // Send notification to complainant (client-side)
      if (reportData) {
        try {
          const complainantId = reportData.userId || reportData.complainantId;
          const complaintTitle = reportData.title || reportData.description || 'Your complaint';
          
          if (complainantId) {
            await NotificationService.sendStatusUpdateNotification(
              complainantId,
              reportId,
              complaintTitle,
              newStatus,
              notes
            );
            console.log(`✅ Notification sent to complainant ${complainantId}`);
          }
        } catch (notifError) {
          console.warn('⚠️ Failed to send notification (non-critical):', notifError);
          // Don't fail the status update if notification fails
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to update report ${reportId} status:`, error);
      throw new Error(`Could not update report ${reportId} status. It may not exist in either collection.`);
    }
  }

  /**
   * Debug assignment for a specific report
   */
  static async debugAssignment(reportId: string): Promise<void> {
    try {
      console.log(`🔍 Debugging assignment for report: ${reportId}`);
      
      // Check complaints collection
      const complaintRef = doc(db, 'complaints', reportId);
      const complaintSnap = await getDoc(complaintRef);
      
      if (complaintSnap.exists()) {
        const data = complaintSnap.data();
        console.log('📋 COMPLAINTS COLLECTION DATA:', {
          exists: true,
          title: data.title,
          status: data.status,
          assignedTo: data.assignedTo,
          assignedToName: data.assignedToName,
          assignedToRole: data.assignedToRole,
          assignedAt: data.assignedAt,
          lastUpdated: data.lastUpdated
        });
      } else {
        console.log('❌ Report not found in complaints collection');
      }
      
      // Check reports collection
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        const data = reportSnap.data();
        console.log('📋 REPORTS COLLECTION DATA:', {
          exists: true,
          title: data.title,
          status: data.status,
          assignedTo: data.assignedTo,
          assignedToName: data.assignedToName,
          assignedToRole: data.assignedToRole,
          assignedAt: data.assignedAt,
          lastUpdated: data.lastUpdated
        });
      } else {
        console.log('❌ Report not found in reports collection');
      }
      
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  }
}