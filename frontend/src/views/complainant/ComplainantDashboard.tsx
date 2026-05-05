import React, { useState, useEffect } from "react";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Bell,
  Eye,
  Plus,
  Calendar,
  MessageSquare,
  FileText,
  Search,
  Filter,
  Download,
  User,
  MapPin,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import { 
  Complaint,
  ComplaintType,
  Severity,
  ComplaintStage,
  ComplaintStatus,
  ComplaintSummary
} from "../../types/complaints";
import { 
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus 
} from "../../types/notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useNavigate } from "../../compat/router";
import { format, differenceInDays } from "date-fns";
import CaseTracking from "../../components/case/CaseTracking";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, getDocs, where, orderBy, onSnapshot, Unsubscribe, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

// Helper function to safely convert various date formats
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  
  // If it's a Firebase Timestamp
  if (dateValue && typeof dateValue.toDate === 'function') {
    try {
      return dateValue.toDate();
    } catch (error) {
      console.warn('Error converting Firebase Timestamp:', error);
      return new Date();
    }
  }
  
  // If it's a string or number, try to parse it
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  // Fallback to current date
  return new Date();
};

// Safe format function that handles invalid dates
const safeFormat = (dateValue: any, formatString: string): string => {
  try {
    const safeDate = safeToDate(dateValue);
    return format(safeDate, formatString);
  } catch (error) {
    console.warn('Error formatting date:', error, dateValue);
    return 'Invalid Date';
  }
};

// Helper function to convert string to ComplaintStage
const toComplaintStage = (stage: string): ComplaintStage => {
  const stageMap: Record<string, ComplaintStage> = {
    'pre_filing': ComplaintStage.PRE_FILING,
    'filing': ComplaintStage.FILING,
    'action_on_complaint': ComplaintStage.ACTION_ON_COMPLAINT,
    'preliminary_investigation': ComplaintStage.PRELIMINARY_INVESTIGATION,
    'investigation_report': ComplaintStage.INVESTIGATION_REPORT,
    'final_decision': ComplaintStage.FINAL_DECISION,
    'closed': ComplaintStage.CLOSED,
    'withdrawn': ComplaintStage.WITHDRAWN,
    'submitted': ComplaintStage.FILING, // Map common status to stages
    'under_review': ComplaintStage.ACTION_ON_COMPLAINT,
    'investigating': ComplaintStage.PRELIMINARY_INVESTIGATION,
    'resolved': ComplaintStage.FINAL_DECISION,
    'dismissed': ComplaintStage.CLOSED
  };
  return stageMap[stage] || ComplaintStage.FILING;
};

// Helper function to convert string to ComplaintStatus
const toComplaintStatus = (status: string): ComplaintStatus => {
  const statusMap: Record<string, ComplaintStatus> = {
    'draft': ComplaintStatus.DRAFT,
    'submitted': ComplaintStatus.SUBMITTED,
    'under_review': ComplaintStatus.UNDER_REVIEW,
    'requirements_pending': ComplaintStatus.REQUIREMENTS_PENDING,
    'validated': ComplaintStatus.VALIDATED,
    'investigating': ComplaintStatus.INVESTIGATING,
    'awaiting_response': ComplaintStatus.AWAITING_RESPONSE,
    'under_deliberation': ComplaintStatus.UNDER_DELIBERATION,
    'resolved': ComplaintStatus.RESOLVED,
    'dismissed': ComplaintStatus.DISMISSED,
    'withdrawn': ComplaintStatus.WITHDRAWN,
    'pending': ComplaintStatus.SUBMITTED, // Map common aliases
    'in_progress': ComplaintStatus.INVESTIGATING,
    'closed': ComplaintStatus.RESOLVED
  };
  return statusMap[status] || ComplaintStatus.SUBMITTED;
};

// Helper function to convert string to ComplaintType
const toComplaintType = (type: string): ComplaintType => {
  const typeMap: Record<string, ComplaintType> = {
    'sexual_harassment': ComplaintType.SEXUAL_HARASSMENT,
    'discrimination': ComplaintType.DISCRIMINATION,
    'bullying': ComplaintType.BULLYING,
    'academic_dishonesty': ComplaintType.ACADEMIC_DISHONESTY,
    'misconduct': ComplaintType.MISCONDUCT,
    'violation_of_rules': ComplaintType.VIOLATION_OF_RULES,
    'other': ComplaintType.OTHER,
    'harassment': ComplaintType.SEXUAL_HARASSMENT, // Map common aliases
    'academic': ComplaintType.ACADEMIC_DISHONESTY
  };
  return typeMap[type] || ComplaintType.OTHER;
};

const ComplainantDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<ComplaintSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("complaints");

  // Filter complaints based on search and filter
  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "all" || complaint.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Function to mark notification as read in Firebase
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date()
      });
      
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Fallback to local state update if Firebase fails
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
    }
  };

  // Fetch real data from Firebase
  useEffect(() => {
    let reportsUnsubscribe: Unsubscribe | null = null;
    let complaintsUnsubscribe: Unsubscribe | null = null;
    let notificationsUnsubscribe: Unsubscribe | null = null;
    
    // Store data from both collections
    let reportsData: Complaint[] = [];
    let complaintsData: Complaint[] = [];
    
    // Function to calculate and update summary from merged complaints
    const updateSummary = (mergedComplaints: Complaint[]) => {
      const totalComplaints = mergedComplaints.length;
      const activeComplaints = mergedComplaints.filter(c => 
        c.status !== ComplaintStatus.RESOLVED && 
        c.status !== ComplaintStatus.DISMISSED && 
        c.status !== ComplaintStatus.WITHDRAWN
      ).length;
      const resolvedComplaints = mergedComplaints.filter(c => 
        c.status === ComplaintStatus.RESOLVED || 
        c.status === ComplaintStatus.DISMISSED
      ).length;
      const pendingComplaints = mergedComplaints.filter(c => 
        c.status === ComplaintStatus.SUBMITTED || 
        c.status === ComplaintStatus.UNDER_REVIEW ||
        c.status === ComplaintStatus.REQUIREMENTS_PENDING
      ).length;

      // Create proper summary object matching ComplaintSummary type
      const calculatedSummary: ComplaintSummary = {
        totalComplaints,
        pendingComplaints,
        overdueDeadlines: 0,
        completedInvestigations: resolvedComplaints,
        averageProcessingTime: 0,
        byStage: {
          [ComplaintStage.PRE_FILING]: 0,
          [ComplaintStage.FILING]: 0,
          [ComplaintStage.ACTION_ON_COMPLAINT]: 0,
          [ComplaintStage.PRELIMINARY_INVESTIGATION]: 0,
          [ComplaintStage.INVESTIGATION_REPORT]: 0,
          [ComplaintStage.FINAL_DECISION]: 0,
          [ComplaintStage.CLOSED]: 0,
          [ComplaintStage.WITHDRAWN]: 0
        },
        byStatus: {
          [ComplaintStatus.DRAFT]: 0,
          [ComplaintStatus.SUBMITTED]: 0,
          [ComplaintStatus.UNDER_REVIEW]: 0,
          [ComplaintStatus.REQUIREMENTS_PENDING]: 0,
          [ComplaintStatus.VALIDATED]: 0,
          [ComplaintStatus.INVESTIGATING]: 0,
          [ComplaintStatus.AWAITING_RESPONSE]: 0,
          [ComplaintStatus.UNDER_DELIBERATION]: 0,
          [ComplaintStatus.RESOLVED]: 0,
          [ComplaintStatus.DISMISSED]: 0,
          [ComplaintStatus.WITHDRAWN]: 0
        },
        byType: {
          [ComplaintType.SEXUAL_HARASSMENT]: 0,
          [ComplaintType.DISCRIMINATION]: 0,
          [ComplaintType.BULLYING]: 0,
          [ComplaintType.ACADEMIC_DISHONESTY]: 0,
          [ComplaintType.MISCONDUCT]: 0,
          [ComplaintType.VIOLATION_OF_RULES]: 0,
          [ComplaintType.OTHER]: 0
        },
        recentComplaints: mergedComplaints.slice(0, 5),
        overdueItems: []
      };

      // Populate stage and status counts
      mergedComplaints.forEach(complaint => {
        calculatedSummary.byStage[complaint.stage] = (calculatedSummary.byStage[complaint.stage] || 0) + 1;
        calculatedSummary.byStatus[complaint.status] = (calculatedSummary.byStatus[complaint.status] || 0) + 1;
        calculatedSummary.byType[complaint.type] = (calculatedSummary.byType[complaint.type] || 0) + 1;
      });

      setSummary(calculatedSummary);
    };
    
    // Function to merge and deduplicate data from both sources
    const mergeAndUpdateComplaints = () => {
      // Create a map to store unique complaints
      const complaintsMap = new Map<string, Complaint>();
      const seenComplaints = new Set<string>();
      
      // Helper to create a unique key based on title and timestamp
      const createUniqueKey = (complaint: Complaint): string => {
        const normalizedTitle = complaint.title.toLowerCase().trim();
        
        // Handle invalid dates
        let createdAtTime = complaint.createdAt.getTime();
        if (isNaN(createdAtTime)) {
          console.warn(`⚠️ Invalid createdAt for "${complaint.title}", using current time`);
          createdAtTime = Date.now();
        }
        
        const timeKey = Math.floor(createdAtTime / 86400000); // Group by day
        const uniqueKey = `${normalizedTitle}-${timeKey}`;
        
        console.log(`🔑 Creating key for "${complaint.title}":`, {
          id: complaint.id,
          normalizedTitle,
          createdAt: isNaN(complaint.createdAt.getTime()) ? 'INVALID' : complaint.createdAt.toISOString(),
          timeKey,
          uniqueKey
        });
        return uniqueKey;
      };
      
      // First add complaints (they are more up-to-date from admin)
      console.log(`📦 Processing ${complaintsData.length} complaints from complaints collection`);
      complaintsData.forEach(complaint => {
        const uniqueKey = createUniqueKey(complaint);
        complaintsMap.set(complaint.id, complaint);
        seenComplaints.add(uniqueKey);
      });
      
      // Then add reports, but skip if we already have a matching complaint
      console.log(`📦 Processing ${reportsData.length} reports from reports collection`);
      reportsData.forEach(report => {
        const uniqueKey = createUniqueKey(report);
        
        // Only add if we haven't seen a complaint with same title/time
        if (!seenComplaints.has(uniqueKey)) {
          complaintsMap.set(report.id, report);
          seenComplaints.add(uniqueKey);
        } else {
          console.log(`🔄 Skipping duplicate report: ${report.title} (already exists as complaint)`);
        }
      });
      
      // Convert to array and sort
      const mergedComplaints = Array.from(complaintsMap.values());
      mergedComplaints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log(`📊 Merged ${reportsData.length} reports + ${complaintsData.length} complaints = ${mergedComplaints.length} unique`);
      setComplaints(mergedComplaints);
      
      // Update summary with merged data
      updateSummary(mergedComplaints);
      setLoading(false);
    };

    const fetchData = async () => {
      if (!user) {
        console.log('❌ No user found in auth context');
        setLoading(false);
        return;
      }

      console.log(`🔍 Fetching complaints for user ID: ${user.uid}`);
      console.log(`📧 User email: ${user.email}`);
      console.log(`👤 User display name: ${user.displayName}`);

      try {
        // Method 1: Fetch from reports collection (primary method)
        try {
          console.log('🔍 Querying reports collection...');
          const reportsQuery = query(
            collection(db, 'reports'),
            where('userId', '==', user.uid)
          );
          
          reportsUnsubscribe = onSnapshot(reportsQuery, (snapshot) => {
            console.log(`📋 Real-time update: Found ${snapshot.size} reports for user ${user.uid}`);
            
            // Process reports with real-time updates
            reportsData = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              console.log(`📄 Processing report:`, { 
                id: doc.id, 
                title: data.title, 
                status: data.status, 
                reportedAt: data.reportedAt 
              });
              
              // Convert reports format to complaints format for display
              const complaintStage = toComplaintStage(data.stage || 'submitted');
              const complaintStatus = toComplaintStatus(data.status || 'submitted');
              const complaintType = toComplaintType(data.category || 'other');
              
              reportsData.push({
                id: doc.id,
                complainantId: data.userId,
                respondentId: data.respondentId || '',
                respondentName: data.respondentName || 'Unknown',
                respondentAddress: data.respondentAddress || '',
                title: data.title || data.description || 'Untitled Report',
                description: data.description || '',
                statementOfFacts: data.additionalInfo || data.description || '',
                type: complaintType,
                severity: data.severity || 'medium',
                incidentDate: safeToDate(data.incidentDate),
                incidentLocation: data.location || '',
                filingDate: safeToDate(data.reportedAt),
                stage: complaintStage,
                status: complaintStatus,
                assignedCODI: data.assignedTo ? [data.assignedTo] : [],
                responseDeadline: undefined,
                investigationStartDeadline: undefined,
                investigationEndDeadline: undefined,
                reportSubmissionDeadline: undefined,
                confidentialityLevel: 'public',
                createdAt: safeToDate(data.reportedAt || data.createdAt),
                updatedAt: safeToDate(data.lastUpdated || data.updatedAt)
              });
            });
            
            // Merge with complaints data
            mergeAndUpdateComplaints();
          }, (error) => {
            console.error('❌ Error in real-time reports listener:', error);
          });
          
        } catch (error) {
          console.error('❌ Error fetching user reports:', error);
        }

        // Method 2: Set up REAL-TIME listener for complaints collection (admin updates here)
        try {
          console.log('🔍 Setting up real-time complaints listener...');
          const complaintsQuery = query(
            collection(db, 'complaints'),
            where('complainantId', '==', user.uid)
          );
          
          complaintsUnsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
            console.log(`📋 Real-time update: Found ${snapshot.size} complaints for user ${user.uid}`);
            
            // Process complaints with real-time updates
            complaintsData = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              console.log(`� Processing complaint:`, { 
                id: doc.id, 
                title: data.title, 
                status: data.status, 
                createdAt: data.createdAt 
              });
            
              const complaintStage = toComplaintStage(data.stage || 'submitted');
              const complaintStatus = toComplaintStatus(data.status || 'submitted');
              const complaintType = toComplaintType(data.type || data.category || 'other');
              
              complaintsData.push({
                id: doc.id,
                complainantId: data.complainantId || user.uid,
                respondentId: data.respondentId || '',
                respondentName: data.respondentName || 'Unknown',
                respondentAddress: data.respondentAddress || '',
                title: data.title || 'Untitled Complaint',
                description: data.description || '',
                statementOfFacts: data.statementOfFacts || data.description || '',
                type: complaintType,
                severity: data.severity || 'medium',
                incidentDate: safeToDate(data.incidentDate || data.createdAt),
                incidentLocation: data.incidentLocation || data.location || '',
                filingDate: safeToDate(data.filingDate || data.createdAt),
                stage: complaintStage,
                status: complaintStatus,
                assignedCODI: data.assignedCODI || [],
                responseDeadline: data.responseDeadline ? safeToDate(data.responseDeadline) : undefined,
                investigationStartDeadline: data.investigationStartDeadline ? safeToDate(data.investigationStartDeadline) : undefined,
                investigationEndDeadline: data.investigationEndDeadline ? safeToDate(data.investigationEndDeadline) : undefined,
                reportSubmissionDeadline: data.reportSubmissionDeadline ? safeToDate(data.reportSubmissionDeadline) : undefined,
                confidentialityLevel: data.confidentialityLevel || 'public',
                createdAt: safeToDate(data.createdAt),
                updatedAt: safeToDate(data.updatedAt || data.createdAt)
              });
            });
            
            // Merge with reports data
            mergeAndUpdateComplaints();
          }, (error) => {
            console.error('❌ Error in real-time complaints listener:', error);
          });
          
        } catch (error) {
          console.error('❌ Error setting up complaints listener:', error);
        }

        // Set up REAL-TIME listener for notifications
        try {
          console.log('🔍 Setting up real-time notifications listener...');
          const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid)
          );
          
          notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            console.log(`📋 Real-time update: Found ${snapshot.size} notifications for user ${user.uid}`);
            
            const fetchedNotifications: Notification[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              fetchedNotifications.push({
                id: doc.id,
                userId: data.userId,
                type: data.type as NotificationType,
                title: data.title,
                message: data.message,
                priority: data.priority || 'normal',
                status: data.status || 'unread',
                createdAt: data.createdAt?.toDate() || new Date(),
                readAt: data.readAt?.toDate() || undefined,
                archivedAt: data.archivedAt?.toDate() || undefined,
                expiresAt: data.expiresAt?.toDate() || undefined,
                actionUrl: data.actionUrl,
                actionLabel: data.actionLabel,
                complaintId: data.complaintId,
                messageId: data.messageId,
                chatRoomId: data.chatRoomId,
                data: data.data
              } as Notification);
            });
            
            // Sort manually after fetching
            const sortedNotifications = fetchedNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setNotifications(sortedNotifications);
          }, (error) => {
            console.error('Error in real-time notifications listener:', error);
          });
          
        } catch (error) {
          console.error('Error setting up notifications listener:', error);
        }

      } catch (error) {
        console.error('❌ Error in fetchData:', error);
      }
    };

    fetchData();
    
    // Return cleanup function to unsubscribe from real-time listeners
    return () => {
      if (reportsUnsubscribe) {
        reportsUnsubscribe();
      }
      if (complaintsUnsubscribe) {
        complaintsUnsubscribe();
      }
      if (notificationsUnsubscribe) {
        notificationsUnsubscribe();
      }
    };
  }, [user]);

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.INVESTIGATING: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case ComplaintStatus.RESOLVED: return "bg-green-100 text-green-800 border-green-200";
      case ComplaintStatus.DISMISSED: return "bg-red-100 text-red-800 border-red-200";
      case ComplaintStatus.UNDER_REVIEW: return "bg-blue-100 text-blue-800 border-blue-200";
      case ComplaintStatus.SUBMITTED: return "bg-purple-100 text-purple-800 border-purple-200";
      case ComplaintStatus.AWAITING_RESPONSE: return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStageProgress = (stage: ComplaintStage, status?: ComplaintStatus) => {
    // If case is resolved (successful), show 100%
    if (status === ComplaintStatus.RESOLVED) {
      return 100;
    }
    
    // If case is dismissed (unsuccessful), show 0%
    if (status === ComplaintStatus.DISMISSED) {
      return 0;
    }
    
    const stages = [
      ComplaintStage.FILING, 
      ComplaintStage.ACTION_ON_COMPLAINT, 
      ComplaintStage.PRELIMINARY_INVESTIGATION, 
      ComplaintStage.INVESTIGATION_REPORT, 
      ComplaintStage.FINAL_DECISION
    ];
    const currentIndex = stages.indexOf(stage);
    return currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;
  };

  // Helper function to format enum values for display
  const formatEnumForDisplay = (value: string): string => {
    return value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your complaints...</p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">
              User: {user.email}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view your dashboard.</p>
          <Button onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2">
                <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">My Dashboard</h1>
                <p className="text-base sm:text-lg text-gray-600 mt-1">
                  Track your complaints and access support resources
                </p>
              </div>
              {complaints.length === 0 && !loading && (
                <p className="text-sm text-orange-600 mt-1">
                  No complaints found. Showing {complaints.length} out of expected data.
                </p>
              )}
            </div>
            <div className="flex flex-row gap-2 sm:gap-3">
              <Button 
                variant="outline"
                onClick={() => window.location.reload()} 
                className="px-3 sm:px-4 py-2 flex-1 sm:flex-initial sm:w-auto border-gray-300 hover:bg-gray-50 text-sm sm:text-base"
              >
                Refresh Data
              </Button>
              <Button 
                onClick={() => navigate("/complaints/new")} 
                className="bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium flex-1 sm:flex-initial sm:w-auto shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                File New Complaint
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden relative">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="z-10 w-full sm:w-auto">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Reports</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900">{summary?.totalComplaints || 0}</p>
                </div>
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200/30 rounded-full blur-xl"></div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden relative">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="z-10 w-full sm:w-auto">
                  <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">In Progress</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-900">{summary?.pendingComplaints || 0}</p>
                </div>
                <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-yellow-200/30 rounded-full blur-xl"></div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden relative">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="z-10 w-full sm:w-auto">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Resolved Cases</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-900">{summary?.completedInvestigations || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-200/30 rounded-full blur-xl"></div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden relative">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="z-10 w-full sm:w-auto">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">New Updates</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-900">
                    {notifications.filter(n => n.status === 'unread').length}
                  </p>
                </div>
                <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-200/30 rounded-full blur-xl"></div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - SIMPLIFIED APPROACH */}
        <div className="bg-white rounded-xl shadow-lg border">
          {/* Tabs Navigation */}
          <div className="border-b">
            <div className="flex space-x-1 px-6 pt-4">
              <button
                onClick={() => setActiveTab("complaints")}
                className={`flex items-center px-4 py-3 rounded-t-lg font-medium transition-colors ${
                  activeTab === "complaints"
                    ? "bg-white border-t border-l border-r border-gray-200 text-primary border-b-2 border-b-primary -mb-px"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <FileText className="h-4 w-4 mr-2" />
                My Complaints
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center px-4 py-3 rounded-t-lg font-medium transition-colors relative ${
                  activeTab === "notifications"
                    ? "bg-white border-t border-l border-r border-gray-200 text-primary border-b-2 border-b-primary -mb-px"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {notifications.filter(n => n.status === 'unread').length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white px-1.5 py-0.5 text-xs">
                    {notifications.filter(n => n.status === 'unread').length}
                  </Badge>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "complaints" && (
              <div className="space-y-6">
                {/* Search and Filter Bar */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search complaints by title or description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 w-full"
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
                        >
                          <option value="all">All Status</option>
                          <option value={ComplaintStatus.SUBMITTED}>Submitted</option>
                          <option value={ComplaintStatus.UNDER_REVIEW}>Under Review</option>
                          <option value={ComplaintStatus.INVESTIGATING}>Investigating</option>
                          <option value={ComplaintStatus.AWAITING_RESPONSE}>Awaiting Response</option>
                          <option value={ComplaintStatus.RESOLVED}>Resolved</option>
                          <option value={ComplaintStatus.DISMISSED}>Dismissed</option>
                        </select>
                        <Button variant="outline" className="border-gray-300">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {filteredComplaints.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredComplaints.map((complaint) => {
                      try {
                        return (
                          <Card key={complaint.id} className="shadow-lg hover:shadow-xl transition-all duration-300 border hover:border-primary/20">
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                                    {complaint.title}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className={getStatusColor(complaint.status)}>
                                      {formatEnumForDisplay(complaint.status)}
                                    </Badge>
                                    <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                                      {formatEnumForDisplay(complaint.type)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* Progress Bar */}
                                <div>
                                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                    <span>Case Progress</span>
                                    <span className="font-medium">{Math.round(getStageProgress(complaint.stage, complaint.status))}% Complete</span>
                                  </div>
                                  <Progress value={getStageProgress(complaint.stage, complaint.status)} className="h-2" />
                                </div>
                                
                                {/* Complaint Details */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <p className="font-medium text-xs text-gray-500">Filed Date</p>
                                        <p className="text-muted-foreground">
                                          {safeFormat(complaint.filingDate, "MMM d, yyyy")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <p className="font-medium text-xs text-gray-500">Respondent</p>
                                        <p className="text-muted-foreground truncate">
                                          {complaint.respondentName}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <p className="font-medium text-xs text-gray-500">Location</p>
                                        <p className="text-muted-foreground truncate">
                                          {complaint.incidentLocation || 'Not specified'}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-medium text-xs text-gray-500 mb-1">Case ID</p>
                                      <p className="text-muted-foreground text-xs font-mono truncate">
                                        {complaint.id}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => navigate(`/case-tracking/${complaint.id}`)}
                                    className="flex-1 border-primary/20 hover:bg-primary/5 hover:border-primary/30"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => navigate(`/case-chat/${complaint.id}`)}
                                    className="flex-1 border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-600"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Message
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      } catch (error) {
                        console.error('Error rendering complaint:', complaint.id, error);
                        return (
                          <Card key={complaint.id} className="shadow-md border-red-200 bg-red-50">
                            <CardHeader>
                              <CardTitle className="text-lg font-semibold text-red-600">Error loading complaint</CardTitle>
                              <p className="text-sm text-gray-500">Case ID: {complaint.id}</p>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600">
                                There was an error displaying this complaint. Please refresh the page or contact support.
                              </p>
                            </CardContent>
                          </Card>
                        );
                      }
                    })}
                  </div>
                ) : (
                  <Card className="p-12 text-center border-2 border-dashed border-gray-300">
                    <div className="max-w-md mx-auto">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Complaints Found</h3>
                      <p className="text-gray-600 mb-6">
                        {searchTerm || statusFilter !== "all" 
                          ? "No complaints match your search criteria. Try adjusting your filters."
                          : "You haven't filed any complaints yet. Get started by filing your first complaint."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          onClick={() => navigate("/complaints/new")} 
                          className="bg-primary hover:bg-primary/90 text-white px-6"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          File Your First Complaint
                        </Button>
                        {(searchTerm || statusFilter !== "all") && (
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                            }}
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Recent Notifications</h3>
                    <p className="text-sm text-gray-600">
                      Stay updated on your complaint status and important announcements
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {notifications.filter(n => n.status === 'unread').length} Unread
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification) => {
                      try {
                        return (
                          <Card key={notification.id} className={`border-l-4 ${
                            notification.status === 'unread' ? "border-l-blue-500 bg-blue-50" : "border-l-gray-300"
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${
                                  notification.priority === "high" 
                                    ? "bg-red-100 text-red-600" 
                                    : "bg-blue-100 text-blue-600"
                                }`}>
                                  <Bell className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                                    {notification.status === 'unread' && (
                                      <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">New</Badge>
                                    )}
                                    {notification.priority === "high" && (
                                      <Badge className="bg-red-100 text-red-800 text-xs px-2 py-0.5">High Priority</Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-600 mb-2">{notification.message}</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500">
                                      {safeFormat(notification.createdAt, "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                    {notification.status === 'unread' && (
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => markNotificationAsRead(notification.id)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        Mark as read
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      } catch (error) {
                        console.error('Error rendering notification:', notification.id, error);
                        return (
                          <Card key={notification.id} className="border-l-4 border-l-red-500 bg-red-50">
                            <CardContent className="p-4">
                              <p className="text-sm text-red-600 font-medium">Error loading notification</p>
                              <p className="text-xs text-red-500">Please refresh the page or contact support.</p>
                            </CardContent>
                          </Card>
                        );
                      }
                    })}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
                    <p className="text-gray-600">
                      You're all caught up! No new notifications at this time.
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplainantDashboard;