import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp,
  DocumentReference 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Report, ReportFormData } from '../types/report';

export class ReportService {
  static async createReport(formData: ReportFormData, userId: string, userEmail: string, userName: string | null): Promise<string> {
    try {
      console.log(`🚨 Starting report creation for user: ${userId}`);
      console.log(`📧 User email: ${userEmail}`);
      console.log(`👤 User name: ${userName}`);
      console.log(`📝 Report data:`, {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        category: formData.category,
        severity: formData.severity
      });

      // Upload evidence files if any
      const evidenceUrls: string[] = [];
      const fileTypes: string[] = [];
      
      if (formData.evidence && formData.evidence.length > 0) {
        console.log(`📎 Uploading ${formData.evidence.length} evidence files...`);
        for (const file of formData.evidence) {
          const storageRef = ref(storage, `reports/${userId}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          evidenceUrls.push(url);
          fileTypes.push(file.type);
          console.log(`✅ Uploaded file: ${file.name}`);
        }
      }

      const report: Omit<Report, 'id'> = {
        userId,
        userEmail,
        userName: userName,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        incidentDate: new Date(formData.incidentDate + (formData.incidentTime ? ` ${formData.incidentTime}` : '')).toISOString(),
        reportedAt: new Date().toISOString(),
        status: 'pending',
        category: formData.category,
        severity: formData.severity,
        evidence: evidenceUrls.length > 0 ? {
          fileUrls: evidenceUrls,
          fileTypes: fileTypes
        } : undefined,
        lastUpdated: new Date().toISOString(),
        witnesses: formData.witnesses,
        additionalInfo: formData.additionalInfo
      };

      console.log(`💾 Saving report to Firestore 'reports' collection...`);
      const docRef = await addDoc(collection(db, 'reports'), report);
      console.log(`✅ Report saved successfully with ID: ${docRef.id}`);
      console.log(`🔗 Document reference:`, docRef);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating report:', error);
      throw error;
    }
  }

  static async getUserReports(userId: string): Promise<Report[]> {
    try {
      const q = query(
        collection(db, 'reports'),
        where('userId', '==', userId),
        orderBy('reportedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
    } catch (error) {
      console.error('Error fetching user reports:', error);
      throw error;
    }
  }

  static async getReport(reportId: string): Promise<Report | null> {
    try {
      const reportDoc = await getDoc(doc(db, 'reports', reportId));
      if (!reportDoc.exists()) return null;
      
      return {
        id: reportDoc.id,
        ...reportDoc.data()
      } as Report;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  // Admin Functions
  static async getAllReports(filters?: {
    status?: Report['status'][];
    category?: Report['category'][];
    severity?: Report['severity'][];
    dateRange?: { start: Date; end: Date };
  }): Promise<Report[]> {
    try {
      let q = query(collection(db, 'reports'));
      
      // Start with a base query
      const baseQuery = query(collection(db, 'reports'));

      // Create an array to store query conditions
      const queryConditions: any[] = [];

      // Apply filters if they exist
      if (filters) {
        if (filters.status?.length) {
          queryConditions.push(where('status', 'in', filters.status));
        }
        if (filters.category?.length) {
          queryConditions.push(where('category', 'in', filters.category));
        }
        if (filters.severity?.length) {
          queryConditions.push(where('severity', 'in', filters.severity));
        }
        if (filters.dateRange) {
          queryConditions.push(where('reportedAt', '>=', filters.dateRange.start.toISOString()));
          queryConditions.push(where('reportedAt', '<=', filters.dateRange.end.toISOString()));
        }
      }

      // Add orderBy to the conditions
      queryConditions.push(orderBy('reportedAt', 'desc'));

      // Construct final query
      q = query(baseQuery, ...queryConditions);

      // Execute the query and transform the data
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure these fields maintain their original format
          incidentDate: data.incidentDate,
          reportedAt: data.reportedAt,
          lastUpdated: data.lastUpdated
        } as Report;
      });
    } catch (error) {
      console.error('Error fetching all reports:', error);
      throw error;
    }
  }

  static async updateReportStatus(
    reportId: string,
    status: Report['status'],
    adminNotes?: string,
    assignedTo?: string
  ): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status,
        adminNotes,
        assignedTo,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  }

  static async assignReport(reportId: string, adminId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        assignedTo: adminId,
        status: 'inProgress',
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error assigning report:', error);
      throw error;
    }
  }

  static async addAdminNote(reportId: string, note: string): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportDoc = await getDoc(reportRef);
      
      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const currentNotes = reportDoc.data().adminNotes || '';
      const timestamp = new Date().toLocaleString();
      const newNote = `[${timestamp}] ${note}\n\n${currentNotes}`;

      await updateDoc(reportRef, {
        adminNotes: newNote,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding admin note:', error);
      throw error;
    }
  }
}
