import React, { useState, useEffect, useMemo } from "react";
import { isDuplicateCaseText, shouldShowCaseTextField } from "../../utils/caseDetailText";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Calendar,
  Bell,
  Eye,
  User,
  Shield,
  Gavel,
  Users,
  MapPin
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import {
  Complaint,
  ComplaintStage,
  ComplaintStatus,
  ComplaintType,
  Deadline,
  CaseTimeline,
  CaseTimelineEvent,
  InvestigationActivity
} from "../../types/complaints";
import { collection, doc, getDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CaseActivityService } from '../../services/caseActivityService';
import { RepresentativeService } from '../../services/representativeService';
import { CaseActivity, ActivityType } from '../../types/caseActivity';
import { getCaseProgress, getCaseStep, getStatusLabel } from '../../utils/caseProgress';
import { getUserDisplayName, getCachedUserDisplayName } from '../../utils/userDisplay';
import { isSensitiveCaseType, GENERIC_HANDLER_ASSIGNED_MESSAGE } from '../../utils/sensitiveCaseTypes';

interface CaseTrackingProps {
  complaintId: string;
}

// Helper function to safely convert Firebase timestamps to dates
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  
  if (dateValue && typeof dateValue.toDate === 'function') {
    try {
      return dateValue.toDate();
    } catch (error) {
      console.warn('Error converting Firebase Timestamp:', error);
      return new Date();
    }
  }
  
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  return new Date();
};

const CaseTracking: React.FC<CaseTrackingProps> = ({ complaintId }) => {
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<CaseTimelineEvent[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [activities, setActivities] = useState<InvestigationActivity[]>([]);
  const [realActivities, setRealActivities] = useState<CaseActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineSortOrder, setTimelineSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [handlerDisplayName, setHandlerDisplayName] = useState<string | null>(null);

  const isHandlerAssigned =
    !!complaint?.assignedCODI?.[0] && complaint.assignedCODI[0] !== 'Not yet assigned';

  useEffect(() => {
    if (!complaint || !isHandlerAssigned) {
      setHandlerDisplayName(null);
      return;
    }

    const assignedId = complaint.assignedCODI![0];
    const storedName = ((complaint as Complaint & { assignedToName?: string }).assignedToName || '').trim();

    if (storedName) {
      setHandlerDisplayName(storedName);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const representative = await RepresentativeService.getById(assignedId);
        if (!cancelled) {
          setHandlerDisplayName(representative?.displayName || null);
        }
      } catch (error) {
        console.warn('Could not resolve assigned handler name:', error);
        if (!cancelled) setHandlerDisplayName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [complaint, isHandlerAssigned]);

  // Fetch real data from Firebase
  useEffect(() => {
    const fetchCaseData = async () => {
      if (!complaintId) {
        console.log('❌ No complaint ID provided');
        setLoading(false);
        return;
      }

      console.log(`🔍 Fetching case data for complaint ID: ${complaintId}`);

      try {
        let foundComplaint: Complaint | null = null;

        // Try to find the complaint in both reports and complaints collections
        const collections = ['reports', 'complaints'];
        
        for (const collectionName of collections) {
          try {
            const docRef = doc(db, collectionName, complaintId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              console.log(`📋 Found complaint in ${collectionName} collection:`, data);
              console.log(`🔍 Raw assignedCODI:`, data.assignedCODI);
              console.log(`🔍 Raw assignedTo:`, data.assignedTo);
              console.log(`🔍 Raw assignedAuthority:`, data.assignedAuthority);
              console.log(`🔍 Raw confidentialityLevel:`, data.confidentialityLevel);
              
              // Convert the data to Complaint format
              foundComplaint = {
                id: docSnap.id,
                complainantId: data.userId || data.complainantId || '',
                respondentId: data.respondentId || '',
                respondentName: data.respondentName || 'Unknown',
                respondentAddress: data.respondentAddress || '',
                title: data.title || data.description || 'Untitled Case',
                description: data.description || '',
                statementOfFacts: data.statementOfFacts || data.additionalInfo || '',
                type: data.type || data.category || 'other',
                harassmentDegree: data.harassmentDegree || undefined,
                incidentTime: data.incidentTime || '',
                incidentDate: safeToDate(data.incidentDate),
                incidentLocation: data.incidentLocation || data.location || '',
                locationVicinity: data.locationVicinity || '', // 'inside' or 'outside'
                mapAddress: data.mapAddress || '', // Geocoded address from map
                latitude: data.latitude,
                longitude: data.longitude,
                filingDate: safeToDate(data.filingDate || data.reportedAt || data.createdAt),
                stage: data.stage || ComplaintStage.FILING,
                status: data.status || ComplaintStatus.SUBMITTED,
                assignedCODI: data.assignedCODI && Array.isArray(data.assignedCODI) 
                  ? data.assignedCODI 
                  : data.assignedTo 
                    ? [data.assignedTo] 
                    : ['Not yet assigned'],
                assignedToName: data.assignedToName || '',
                assignedAt: data.assignedAt ? safeToDate(data.assignedAt) : undefined,
                assignedAuthority: data.assignedAuthority || 'Not yet assigned',
                responseDeadline: data.responseDeadline ? safeToDate(data.responseDeadline) : undefined,
                investigationStartDeadline: data.investigationStartDeadline ? safeToDate(data.investigationStartDeadline) : undefined,
                investigationEndDeadline: data.investigationEndDeadline ? safeToDate(data.investigationEndDeadline) : undefined,
                reportSubmissionDeadline: data.reportSubmissionDeadline ? safeToDate(data.reportSubmissionDeadline) : undefined,
                confidentialityLevel: data.confidentialityLevel || 'public',
                createdAt: safeToDate(data.createdAt || data.reportedAt),
                updatedAt: safeToDate(data.updatedAt || data.lastUpdated || data.createdAt),
                adminNotes: data.adminNotes || '', // Add handler notes
                statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
              } as any;
              break;
            }
          } catch (error) {
            console.error(`❌ Error fetching from ${collectionName}:`, error);
          }
        }

        if (foundComplaint) {
          setComplaint(foundComplaint);
          
          // Create an enhanced timeline with detailed events for each stage
          const generateTimelineEvents = (complaint: Complaint): CaseTimelineEvent[] => {
            const events: CaseTimelineEvent[] = [];
            const c = complaint as any;
            const sensitive = isSensitiveCaseType(complaint.type);

            events.push({
              id: "filing",
              stage: ComplaintStage.FILING,
              status: ComplaintStatus.SUBMITTED,
              description: "Formal complaint submitted",
              actor: "Complainant",
              timestamp: complaint.filingDate,
              attachments: [],
              details: `Complaint filed regarding ${complaint.type.replace(/_/g, ' ')} incident. Your report is pending review and case handler assignment.`
            });

            const statusHistory = c.statusHistory;
            if (statusHistory && Array.isArray(statusHistory)) {
              statusHistory.forEach((historyEntry: any, index: number) => {
                const statusLabel = historyEntry.status === 'inProgress' ? 'Investigating' :
                                  historyEntry.status === 'resolved' ? 'Resolved' :
                                  historyEntry.status === 'dismissed' ? 'Dismissed' :
                                  historyEntry.status === 'pending' ? 'Pending' :
                                  historyEntry.status;
                const noteText =
                  typeof historyEntry.notes === 'string' ? historyEntry.notes.trim() : '';
                events.push({
                  id: `status_${index}`,
                  stage: ComplaintStage.ACTION_ON_COMPLAINT,
                  status: historyEntry.status,
                  description: `Status updated to ${statusLabel}`,
                  actor: historyEntry.updatedByName || 'Case Handler',
                  timestamp: historyEntry.updatedAt?.toDate ? historyEntry.updatedAt.toDate() : new Date(historyEntry.updatedAt),
                  attachments: [],
                  details: noteText || `The case status has been changed to ${statusLabel}.`
                });
              });
            }

            const isAssigned = complaint.assignedCODI?.[0] && complaint.assignedCODI[0] !== 'Not yet assigned';
            if (isAssigned && c.assignedAt) {
              const handlerLabel = sensitive ? 'Case Handler' : (c.assignedToName || 'Case Handler');
              events.push({
                id: "handler_assignment",
                stage: ComplaintStage.ACTION_ON_COMPLAINT,
                status: complaint.status,
                description: "Case handler assigned",
                actor: handlerLabel,
                timestamp: c.assignedAt,
                attachments: [],
                details: sensitive
                  ? GENERIC_HANDLER_ASSIGNED_MESSAGE
                  : `${c.assignedToName || 'A case handler'} has been assigned to handle this case.`
              });
            }

            if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.DISMISSED) {
              events.push({
                id: "final_decision",
                stage: ComplaintStage.FINAL_DECISION,
                status: complaint.status,
                description: complaint.status === ComplaintStatus.RESOLVED ? "Case resolved" : "Case dismissed",
                actor: sensitive ? 'Case Handler' : (c.assignedToName || 'Disciplining Authority'),
                timestamp: complaint.updatedAt > complaint.filingDate ? complaint.updatedAt : complaint.filingDate,
                attachments: [],
                details: complaint.adminNotes || (complaint.status === ComplaintStatus.RESOLVED
                  ? "Case reviewed. Findings sustained with appropriate action determined."
                  : "Case dismissed based on investigation findings.")
              });
            }

            return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          };

          const generatedTimelineEvents = generateTimelineEvents(foundComplaint);
          setTimelineEvents(generatedTimelineEvents);

          // Generate deadlines based on complaint data and stage
          const generateDeadlines = (complaint: Complaint): Deadline[] => {
            const deadlines: Deadline[] = [];
            const now = new Date();
            const filingDate = complaint.filingDate;

            // 1. Validation Period (3 days from filing)
            if (complaint.status === ComplaintStatus.SUBMITTED || complaint.status === ComplaintStatus.UNDER_REVIEW) {
              const validationDeadline = new Date(filingDate.getTime() + 3 * 24 * 60 * 60 * 1000);
              deadlines.push({
                id: "validation",
                complaintId,
                type: "validation" as any,
                dueDate: validationDeadline,
                status: isAfter(now, validationDeadline) ? "overdue" : "pending",
                responsibleParty: "CODI Office",
                notificationsSent: [],
                description: "Initial validation and assignment"
              });
            }

            // 2. Respondent Response Deadline (if exists in data)
            if (complaint.responseDeadline) {
              deadlines.push({
                id: "response",
                complaintId,
                type: "response",
                dueDate: complaint.responseDeadline,
                status: isAfter(now, complaint.responseDeadline) ? "overdue" : "pending",
                responsibleParty: complaint.respondentName || "Respondent",
                notificationsSent: [],
                description: "Respondent's written reply"
              });
            }

            // 3. Investigation Start (7 days from validation for validated complaints)
            if (complaint.status === ComplaintStatus.VALIDATED && complaint.stage < ComplaintStage.PRELIMINARY_INVESTIGATION) {
              const investigationStart = complaint.investigationStartDeadline || 
                new Date(filingDate.getTime() + 10 * 24 * 60 * 60 * 1000);
              deadlines.push({
                id: "investigation_start",
                complaintId,
                type: "investigation_start",
                dueDate: investigationStart,
                status: isAfter(now, investigationStart) ? "overdue" : "pending",
                responsibleParty: complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned' 
                  ? complaint.assignedCODI[0] 
                  : "Case Handler",
                notificationsSent: [],
                description: "Begin preliminary investigation"
              });
            }

            // 4. Investigation Completion (30-45 days from start)
            if (complaint.status === ComplaintStatus.INVESTIGATING || complaint.stage === ComplaintStage.PRELIMINARY_INVESTIGATION) {
              const investigationEnd = complaint.investigationEndDeadline || 
                new Date(filingDate.getTime() + 45 * 24 * 60 * 60 * 1000);
              deadlines.push({
                id: "investigation_end",
                complaintId,
                type: "investigation_end",
                dueDate: investigationEnd,
                status: isAfter(now, investigationEnd) ? "overdue" : "pending",
                responsibleParty: complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned' 
                  ? complaint.assignedCODI[0] 
                  : "Case Handler",
                notificationsSent: [],
                description: "Complete evidence gathering and investigation"
              });
            }

            // 5. Report Submission (if investigation is complete or in report stage)
            if (complaint.stage >= ComplaintStage.INVESTIGATION_REPORT && complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.DISMISSED) {
              const reportDeadline = complaint.reportSubmissionDeadline || 
                new Date(filingDate.getTime() + 50 * 24 * 60 * 60 * 1000);
              deadlines.push({
                id: "report_submission",
                complaintId,
                type: "report_submission",
                dueDate: reportDeadline,
                status: isAfter(now, reportDeadline) ? "overdue" : "pending",
                responsibleParty: complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned' 
                  ? complaint.assignedCODI[0] 
                  : "Case Handler",
                notificationsSent: [],
                description: "Submit investigation report"
              });
            }

            // 6. Final Decision (if report submitted)
            if (complaint.stage >= ComplaintStage.INVESTIGATION_REPORT && complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.DISMISSED) {
              const decisionDeadline = new Date(filingDate.getTime() + 60 * 24 * 60 * 60 * 1000);
              deadlines.push({
                id: "final_decision",
                complaintId,
                type: "final_decision" as any,
                dueDate: decisionDeadline,
                status: isAfter(now, decisionDeadline) ? "overdue" : "pending",
                responsibleParty: complaint.assignedAuthority || "Disciplining Authority",
                notificationsSent: [],
                description: "Issue final decision and disciplinary action"
              });
            }

            // Sort deadlines by due date
            return deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
          };

          const basicDeadlines = generateDeadlines(foundComplaint);
          setDeadlines(basicDeadlines);

          // Generate activities based on actual complaint timeline and current status
          const generateActivities = (complaint: Complaint): InvestigationActivity[] => {
            const activities: InvestigationActivity[] = [];
            const baseDate = complaint.filingDate;
            const now = new Date();
            const updatedDate = complaint.updatedAt;
            const sensitive = isSensitiveCaseType(complaint.type);
            const c = complaint as any;

            const authority = complaint.assignedAuthority && complaint.assignedAuthority !== 'Not yet assigned'
              ? getCachedUserDisplayName(complaint.assignedAuthority, "Disciplining Authority")
              : "Disciplining Authority";

            activities.push({
              id: "filing_activity",
              complaintId: complaint.id,
              investigatorId: "system",
              activityType: "document_review",
              description: "Complaint document received and logged in system",
              findings: "Complaint meets minimum filing requirements and has been formally recorded",
              date: baseDate,
              attachments: []
            });

            if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.DISMISSED) {
              const decisionDate = updatedDate > baseDate ? updatedDate : baseDate;
              const handlerNotes = c.adminNotes;

              activities.push({
                id: "decision_making",
                complaintId: complaint.id,
                investigatorId: sensitive ? 'Case Handler' : authority,
                activityType: "deliberation",
                description: "Final decision rendered",
                findings: complaint.status === ComplaintStatus.RESOLVED
                  ? (handlerNotes || "Case reviewed. Findings sustained with appropriate disciplinary action determined")
                  : (handlerNotes || "Case dismissed based on investigation findings"),
                date: decisionDate,
                attachments: []
              });
            }

            return activities
              .filter(activity => activity.date <= now)
              .sort((a, b) => a.date.getTime() - b.date.getTime());
          };

          setActivities(generateActivities(foundComplaint));
        } else {
          console.log('❌ Complaint not found in any collection');
        }

      } catch (error) {
        console.error('❌ Error fetching case data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [complaintId]);

  // Subscribe to real-time case activities
  useEffect(() => {
    if (!complaintId) return;

    console.log('👂 Subscribing to real activities for complaint:', complaintId);
    
    const unsubscribe = CaseActivityService.subscribeToActivities(
      complaintId,
      (fetchedActivities) => {
        console.log(`✅ Received ${fetchedActivities.length} real activities`);
        setRealActivities(fetchedActivities);
      }
    );

    return () => {
      console.log('🧹 Unsubscribing from activities');
      unsubscribe();
    };
  }, [complaintId]);

  /** Handler investigation / resolution notes from status updates + logged case activities */
  const displayActivities = useMemo(() => {
    if (!complaint) return [];

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      submitted: 'Submitted',
      inProgress: 'Ongoing Investigation',
      resolved: 'Decision Already Made',
      dismissed: 'Decision Already Made',
    };

    const fromStatusHistory: InvestigationActivity[] = (
      Array.isArray((complaint as any).statusHistory) ? (complaint as any).statusHistory : []
    )
      .filter((h: { notes?: unknown }) => typeof h.notes === 'string' && (h.notes as string).trim())
      .map((h: any, i: number) => ({
        id: `status_history_notes_${i}_${safeToDate(h.updatedAt).getTime()}`,
        complaintId: complaint.id,
        investigatorId: h.updatedByName || 'Case Handler',
        activityType: 'document_review' as const,
        description: `Status update (${statusLabels[h.previousStatus] || h.previousStatus} → ${statusLabels[h.status] || h.status})`,
        findings: String(h.notes).trim(),
        date: safeToDate(h.updatedAt),
        attachments: [] as string[],
      }));

    const mapCaseActivityType = (t: ActivityType): InvestigationActivity['activityType'] => {
      switch (t) {
        case ActivityType.INTERVIEW:
          return 'interview';
        case ActivityType.EVIDENCE_COLLECTION:
        case ActivityType.INVESTIGATION:
          return 'evidence_collection';
        case ActivityType.DELIBERATION:
          return 'deliberation';
        default:
          return 'document_review';
      }
    };

    const fromLogged: InvestigationActivity[] = realActivities
      .filter((ra) => !ra.isInternal)
      .map((ra) => ({
      id: `case_activity_${ra.id}`,
      complaintId: ra.complaintId,
      investigatorId: isSensitiveCaseType(complaint.type) ? 'Case Handler' : ra.performedByName,
      investigatorRole: ra.performedByRole,
      activityType: mapCaseActivityType(ra.activityType),
      description: ra.description,
      findings: ra.findings,
      date: ra.createdAt,
      attachments: ra.attachments || [],
    }));

    const now = new Date();
    return [...activities, ...fromStatusHistory, ...fromLogged]
      .filter((a) => a.date <= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [complaint, activities, realActivities]);

  // Sort timeline events based on user preference
  const sortedTimelineEvents = useMemo(() => {
    const sorted = [...timelineEvents];
    if (timelineSortOrder === 'latest') {
      return sorted.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else {
      return sorted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
  }, [timelineEvents, timelineSortOrder]);

  const getStageProgress = () => {
    if (!complaint) return 0;
    
    // Use shared utility function for consistent progress calculation
    const statusStr = (complaint.status as any) as string;
    return getCaseProgress(statusStr as any);
  };

  const getStatusConfig = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.SUBMITTED: return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-[#1D9E75]", label: "Submitted" };
      case ComplaintStatus.VALIDATED: return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", label: "Validated" };
      case ComplaintStatus.INVESTIGATING: return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Investigating" };
      case ComplaintStatus.UNDER_REVIEW: return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500", label: "Under Review" };
      case ComplaintStatus.RESOLVED: return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", label: "Decision Already Made" };
      case ComplaintStatus.DISMISSED: return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500", label: "Decision Already Made" };
      default: return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400", label: status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) };
    }
  };

  const getStatusColor = (status: ComplaintStatus): string => {
    switch (status) {
      case ComplaintStatus.SUBMITTED: return "bg-green-100 text-green-800";
      case ComplaintStatus.VALIDATED: return "bg-blue-100 text-blue-800";
      case ComplaintStatus.INVESTIGATING: return "bg-amber-100 text-amber-800";
      case ComplaintStatus.RESOLVED: return "bg-green-100 text-green-800";
      case ComplaintStatus.DISMISSED: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDeadlineStatus = (deadline: Deadline) => {
    const now = new Date();
    const daysLeft = differenceInDays(deadline.dueDate, now);
    
    if (deadline.status === "met") {
      return { color: "text-green-600", icon: CheckCircle, text: "Completed" };
    } else if (deadline.status === "overdue") {
      return { color: "text-red-600", icon: AlertTriangle, text: "Overdue" };
    } else if (daysLeft <= 1) {
      return { color: "text-red-600", icon: AlertTriangle, text: "Due Today" };
    } else if (daysLeft <= 3) {
      return { color: "text-orange-600", icon: Clock, text: `${daysLeft} days left` };
    } else {
      return { color: "text-gray-600", icon: Clock, text: `${daysLeft} days left` };
    }
  };

  const getStageIcon = (stage: ComplaintStage) => {
    switch (stage) {
      case ComplaintStage.FILING: return FileText;
      case ComplaintStage.ACTION_ON_COMPLAINT: return Eye;
      case ComplaintStage.PRELIMINARY_INVESTIGATION: return Users;
      case ComplaintStage.INVESTIGATION_REPORT: return FileText;
      case ComplaintStage.FINAL_DECISION: return Gavel;
      default: return FileText;
    }
  };

  const getTimelineEventIcon = (event: CaseTimelineEvent) => {
    if (event.id === 'handler_assignment') return User;
    if (event.id === 'filing') return FileText;
    if (event.id === 'final_decision') return Gavel;
    if (event.id.startsWith('status_')) return Bell;
    return getStageIcon(event.stage);
  };

  const getTimelineEventStyle = (event: CaseTimelineEvent, isLatest: boolean) => {
    if (event.isProjected) {
      return {
        iconBg: 'bg-gray-50',
        iconBorder: 'border-gray-200',
        iconText: 'text-gray-400',
        cardBg: 'bg-white',
        cardBorder: 'border-gray-100',
        detailsBg: 'bg-gray-50',
        detailsBorder: 'border-gray-100',
        label: 'Projected',
        labelClass: 'bg-gray-100 text-gray-500',
        titleClass: 'text-gray-400',
        muted: true,
      };
    }

    if (event.id === 'filing') {
      return {
        iconBg: 'bg-violet-500',
        iconBorder: 'border-violet-500',
        iconText: 'text-white',
        cardBg: isLatest ? 'bg-violet-50/80' : 'bg-white',
        cardBorder: isLatest ? 'border-violet-200 ring-1 ring-violet-100' : 'border-transparent',
        detailsBg: 'bg-violet-50',
        detailsBorder: 'border-violet-100',
        label: 'Submission',
        labelClass: 'bg-violet-100 text-violet-700',
        titleClass: 'text-gray-900',
        muted: false,
      };
    }

    if (event.id === 'handler_assignment') {
      return {
        iconBg: 'bg-blue-500',
        iconBorder: 'border-blue-500',
        iconText: 'text-white',
        cardBg: isLatest ? 'bg-blue-50/80' : 'bg-white',
        cardBorder: isLatest ? 'border-blue-200 ring-1 ring-blue-100' : 'border-transparent',
        detailsBg: 'bg-blue-50',
        detailsBorder: 'border-blue-100',
        label: 'Assignment',
        labelClass: 'bg-blue-100 text-blue-700',
        titleClass: 'text-gray-900',
        muted: false,
      };
    }

    if (event.id.startsWith('status_')) {
      return {
        iconBg: 'bg-amber-500',
        iconBorder: 'border-amber-500',
        iconText: 'text-white',
        cardBg: isLatest ? 'bg-amber-50/80' : 'bg-white',
        cardBorder: isLatest ? 'border-amber-200 ring-1 ring-amber-100' : 'border-transparent',
        detailsBg: 'bg-amber-50',
        detailsBorder: 'border-amber-100',
        label: 'Status Update',
        labelClass: 'bg-amber-100 text-amber-800',
        titleClass: 'text-gray-900',
        muted: false,
      };
    }

    if (event.id === 'final_decision') {
      const resolved = event.status === ComplaintStatus.RESOLVED;
      return {
        iconBg: resolved ? 'bg-emerald-600' : 'bg-red-500',
        iconBorder: resolved ? 'border-emerald-600' : 'border-red-500',
        iconText: 'text-white',
        cardBg: isLatest
          ? resolved ? 'bg-emerald-50/80' : 'bg-red-50/80'
          : 'bg-white',
        cardBorder: isLatest
          ? resolved ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-red-200 ring-1 ring-red-100'
          : 'border-transparent',
        detailsBg: resolved ? 'bg-emerald-50' : 'bg-red-50',
        detailsBorder: resolved ? 'border-emerald-100' : 'border-red-100',
        label: 'Decision',
        labelClass: resolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800',
        titleClass: 'text-gray-900',
        muted: false,
      };
    }

    return {
      iconBg: 'bg-[#1D9E75]',
      iconBorder: 'border-[#1D9E75]',
      iconText: 'text-white',
      cardBg: isLatest ? 'bg-emerald-50/70' : 'bg-white',
      cardBorder: isLatest ? 'border-[#1D9E75]/30 ring-1 ring-emerald-100' : 'border-transparent',
      detailsBg: 'bg-gray-50',
      detailsBorder: 'border-gray-100',
      label: 'Update',
      labelClass: 'bg-gray-100 text-gray-600',
      titleClass: 'text-gray-900',
      muted: !isLatest,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1D9E75] border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Case not found</h3>
        <p className="text-sm text-gray-500">This complaint could not be located. It may have been removed or the ID is incorrect.</p>
      </div>
    );
  }

  const statusCfg = getStatusConfig(complaint.status);
  const progress = getStageProgress();

  const formatVicinity = (v: string) => {
    if (v === 'inside') return 'Inside College Vicinity';
    if (v === 'outside') return 'Outside College Vicinity';
    if (v === 'online') return 'Online / Digital Platform';
    if (v && v !== 'N/A') return v;
    return 'Not specified';
  };

  const formatIncidentTime = (time?: string) => {
    if (!time) return null;
    if (time === 'AM') return 'Morning (12:00 AM – 11:59 AM)';
    if (time === 'PM') return 'Afternoon/Evening (12:00 PM – 11:59 PM)';
    return time;
  };

  const formatHarassmentDegree = (degree?: string) => {
    const labels: Record<string, string> = {
      light: 'Light',
      severe: 'Severe',
      grave: 'Grave',
    };
    return degree ? labels[degree] || degree.replace(/_/g, ' ') : null;
  };

  const c = complaint as Complaint & {
    incidentTime?: string;
    harassmentDegree?: string;
    mapAddress?: string;
    caseId?: string;
    assignedToName?: string;
  };
  const showSeparateStatement =
    !!c.statementOfFacts && !isDuplicateCaseText(c.statementOfFacts, c.description);
  const showRespondentAddress = shouldShowCaseTextField(
    c.respondentAddress,
    c.description,
    c.statementOfFacts
  );
  const showRespondentSection =
    !!c.respondentName || showRespondentAddress;

  // Simplified to 3 stages
  const stageSteps = [
    { key: 'submitted', label: "Pending" },
    { key: 'investigating', label: "Investigating" },
    { key: 'decided', label: "Decision Already Made" },
  ];

  // Determine current stage index based on status
  const getCurrentStageIdx = () => {
    // Use shared utility function for consistent step calculation
    const statusStr = (complaint.status as any) as string;
    return getCaseStep(statusStr as any) - 1; // Convert to 0-based index
  };
  
  const currentStageIdx = getCurrentStageIdx();

  return (
    <div className="space-y-3">

      {/* ── Hero Header Card ─────────────────── */}
      <div className={`rounded-2xl border ${statusCfg.border} ${statusCfg.bg} p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Shield className="h-5 w-5 text-[#1D9E75]" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Case ID</p>
              <p className="text-sm font-mono font-semibold text-gray-700 break-all">{(complaint as any).caseId || complaint.id}</p>
              <h2 className="text-lg font-bold text-gray-900 mt-1 leading-tight">{complaint.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Filed {format(complaint.filingDate, "MMMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          {/* Stage dots */}
          <div className="flex items-center mb-2">
            {stageSteps.map((stage, idx) => {
              const done = idx < currentStageIdx || complaint.status === ComplaintStatus.RESOLVED;
              const active = idx === currentStageIdx;
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      done ? 'bg-[#1D9E75] border-[#1D9E75] text-white' :
                      active ? 'bg-white border-[#1D9E75] text-[#1D9E75]' :
                      'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {done ? <CheckCircle className="h-3 w-3" /> : <span className="text-[9px]">{idx + 1}</span>}
                    </div>
                    <span className={`text-[9px] mt-1 font-medium hidden sm:block ${active ? 'text-[#1D9E75]' : done ? 'text-gray-600' : 'text-gray-400'}`}>{stage.label}</span>
                  </div>
                  {idx < stageSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${idx < currentStageIdx || complaint.status === ComplaintStatus.RESOLVED ? 'bg-[#1D9E75]' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>Progress</span>
            <span className="font-semibold text-gray-700">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-2 mt-1 border border-gray-200">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${complaint.status === ComplaintStatus.DISMISSED ? 'bg-red-400' : 'bg-[#1D9E75]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Legal notice */}
        <div className="mt-3 flex items-start gap-2 p-2.5 bg-white/70 border border-white rounded-xl text-xs text-gray-600">
          <Shield className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
          <span>This complaint is filed under the <strong>Safe Spaces Act (RA 11313)</strong> and/or the <strong>Anti-Sexual Harassment Act (RA 7877)</strong>. Anti-retaliation protections apply to all parties.</span>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────── */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="timeline" className="rounded-lg text-sm">Timeline</TabsTrigger>
          <TabsTrigger value="activities" className="rounded-lg text-sm">Activities</TabsTrigger>
          <TabsTrigger value="details" className="rounded-lg text-sm">Details</TabsTrigger>
        </TabsList>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline" className="mt-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Case Timeline</h3>
                <p className="text-xs text-gray-500">Chronological history of your complaint's progress.</p>
              </div>
              <select
                value={timelineSortOrder}
                onChange={(e) => setTimelineSortOrder(e.target.value as 'latest' | 'oldest')}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
            <div className="relative">
              {sortedTimelineEvents.map((event, index) => {
                const isLatest =
                  timelineSortOrder === 'latest'
                    ? index === 0
                    : index === sortedTimelineEvents.length - 1;
                const style = getTimelineEventStyle(event, isLatest);
                const Icon = getTimelineEventIcon(event);
                const isLast = index === sortedTimelineEvents.length - 1;

                return (
                  <div
                    key={event.id}
                    className={`relative flex items-start gap-4 pb-7 rounded-xl px-3 py-3 -mx-3 transition-all ${
                      isLatest && !event.isProjected
                        ? `${style.cardBg} border ${style.cardBorder} shadow-sm`
                        : style.muted
                          ? 'opacity-80'
                          : ''
                    }`}
                  >
                    {!isLast && (
                      <div className={`absolute left-[30px] top-11 w-0.5 bottom-0 ${isLatest ? 'bg-emerald-100' : 'bg-gray-100'}`} />
                    )}
                    <div className={`relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm border-2 z-10 ${style.iconBg} ${style.iconBorder} ${style.iconText}`}>
                      <Icon className="h-4 w-4" />
                      {isLatest && !event.isProjected && (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.labelClass}`}>
                          {style.label}
                        </span>
                        {isLatest && !event.isProjected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1D9E75] text-white">
                            Latest
                          </span>
                        )}
                        <time className="text-xs text-gray-400 ml-auto flex-shrink-0">
                          {format(event.timestamp, "MMM d, yyyy · h:mm a")}
                        </time>
                      </div>
                      <h4 className={`text-sm font-semibold mb-0.5 ${style.titleClass}`}>
                        {event.description}
                        {event.isProjected && (
                          <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            Projected
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-500 mb-1">
                        By: <span className="font-medium">{getCachedUserDisplayName(event.actor, event.actor)}</span>
                        {event.actorRole && <span className="text-gray-400 ml-1">({event.actorRole})</span>}
                      </p>
                      {event.details && (
                        <p className={`text-xs text-gray-600 leading-relaxed rounded-lg px-3 py-2 mt-1 border ${style.detailsBg} ${style.detailsBorder}`}>
                          {event.details}
                        </p>
                      )}
                      {event.attachments && event.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.attachments.map((a, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── Activities Tab ── */}
        <TabsContent value="activities" className="mt-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Investigation Activities</h3>
            <p className="text-xs text-gray-500 mb-5">Detailed log of all activities conducted on your case.</p>
            
            {/* Separate audit-log actions from main timeline */}
            {(() => {
              const storyActivities = displayActivities.filter(a => 
                ['document_review', 'evidence_collection', 'interview', 'investigation', 'report_preparation', 'deliberation'].includes(a.activityType)
              );
              const auditLogActivities = displayActivities.filter(a => 
                !['document_review', 'evidence_collection', 'interview', 'investigation', 'report_preparation', 'deliberation'].includes(a.activityType)
              );

              return (
                <>
                  {/* Main Story Activities */}
                  {storyActivities.length > 0 && (
                    <>
                      <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Case Progress</h4>
                      <div className="space-y-3 mb-6">
                        {storyActivities.map((activity) => {
                          const typeColors: Record<string, string> = {
                            document_review: "bg-blue-50 border-blue-200 text-blue-700",
                            evidence_collection: "bg-amber-50 border-amber-200 text-amber-700",
                            interview: "bg-purple-50 border-purple-200 text-purple-700",
                            deliberation: "bg-green-50 border-green-200 text-green-700",
                          };
                          const colorClass = typeColors[activity.activityType] || "bg-gray-50 border-gray-200 text-gray-700";
                          return (
                            <div key={activity.id} className="flex gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-[#1D9E75] mt-1.5" />
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex flex-wrap items-start justify-between gap-1 mb-1">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
                                    {activity.activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                  <time className="text-xs text-gray-400">{format(activity.date, "MMM d, yyyy · h:mm:ss a")}</time>
                                </div>
                                <p className="text-sm text-gray-700 font-medium mt-1">{activity.description}</p>
                                <p className="text-xs text-gray-500 mt-1">By: <span className="font-medium">{getCachedUserDisplayName(activity.investigatorId, activity.investigatorId)}</span></p>
                                {activity.findings && (
                                  <div className="mt-2 bg-[#1D9E75]/5 border-l-4 border-[#1D9E75] rounded-r-lg p-3">
                                    <p className="text-xs font-semibold text-[#178F65] mb-0.5">Key Findings:</p>
                                    <p className="text-xs text-gray-700">{activity.findings}</p>
                                  </div>
                                )}
                                {activity.attachments && activity.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {activity.attachments.map((a, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Audit Log Activities */}
                  {auditLogActivities.length > 0 && (
                    <>
                      <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">System & Administrative Actions</h4>
                      <div className="space-y-3">
                        {auditLogActivities.map((activity) => {
                          return (
                            <div key={activity.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex flex-wrap items-start justify-between gap-1 mb-1">
                                  <span className="text-xs font-medium text-gray-600">
                                    {activity.activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                  <time className="text-xs text-gray-400">{format(activity.date, "MMM d, yyyy · h:mm:ss a")}</time>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                                <p className="text-xs text-gray-500 mt-1">By: <span className="font-medium">{activity.investigatorId}</span></p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* No activities */}
                  {storyActivities.length === 0 && auditLogActivities.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">No activities yet</p>
                      <p className="text-xs text-gray-500 mt-1">Activities will appear here as the case progresses.</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </TabsContent>

        {/* ── Details Tab ── */}
        <TabsContent value="details" className="mt-4 space-y-4">

          {/* Quick info row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Type", value: complaint.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), icon: FileText },
              { label: "Filed", value: format(complaint.filingDate, "MMM d, yyyy"), icon: Calendar },
              { label: "Handler", value: handlerDisplayName || (isHandlerAssigned ? 'Case Handler assigned' : 'Pending assignment'), icon: User },
            ].map(item => (
              <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Incident Details */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#1D9E75]" />
              Incident Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Complaint Title</p>
                <p className="text-sm font-medium text-gray-800">{c.title || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Incident Date</p>
                <p className="text-sm font-medium text-gray-800">{format(complaint.incidentDate, "MMMM d, yyyy")}</p>
              </div>
              {c.incidentTime && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Incident Time</p>
                  <p className="text-sm font-medium text-gray-800">{formatIncidentTime(c.incidentTime)}</p>
                </div>
              )}
              {c.type === 'sexual_harassment' && c.harassmentDegree && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Degree of Harassment</p>
                  <p className="text-sm font-medium text-gray-800">{formatHarassmentDegree(c.harassmentDegree)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">
                  {complaint.locationVicinity === 'online' ? 'Platform' : 'Location'}
                </p>
                <p className="text-sm font-medium text-gray-800">{complaint.incidentLocation || 'Not specified'}</p>
              </div>
              {c.mapAddress && complaint.locationVicinity !== 'online' && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Exact Location (Map)</p>
                  <p className="text-sm font-medium text-gray-800">{c.mapAddress}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Where it Happened</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  complaint.locationVicinity === 'online' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  complaint.locationVicinity === 'inside' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {formatVicinity(complaint.locationVicinity || '')}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1D9E75]" />
              Complaint Description
            </h3>
            {complaint.description && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              </div>
            )}
            {showSeparateStatement && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Statement of Facts</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.statementOfFacts}</p>
              </div>
            )}
            {!complaint.description && !showSeparateStatement && (
              <p className="text-sm text-gray-500">No description provided.</p>
            )}
          </div>

          {/* Respondent */}
          {showRespondentSection && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#1D9E75]" />
              Respondent Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Name</p>
                <p className="text-sm font-medium text-gray-800">{complaint.respondentName || 'Not disclosed'}</p>
              </div>
              {showRespondentAddress && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Address / Description</p>
                  <p className="text-sm font-medium text-gray-800">{complaint.respondentAddress}</p>
                </div>
              )}
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <strong>Note:</strong> Under the Safe Spaces Act (RA 11313), the respondent is notified of this complaint and the complainant's identity. Anti-retaliation provisions protect both parties.
            </div>
          </div>
          )}

          {/* Personnel & Confidentiality */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#1D9E75]" />
              Assigned Personnel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Case Handler (CODI)</p>
                {isHandlerAssigned ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {handlerDisplayName || 'Case Handler assigned'}
                    </p>
                    {handlerDisplayName && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Committee on Decorum and Investigation (CODI)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-amber-600">
                    Not yet assigned — pending hearing notification
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Confidentiality Level</p>
                <Badge variant="outline" className="text-xs">
                  {complaint.confidentialityLevel?.replace(/\b\w/g, l => l.toUpperCase()) || 'Confidential'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Key Dates */}
          {(complaint.responseDeadline || complaint.investigationStartDeadline || complaint.investigationEndDeadline || complaint.reportSubmissionDeadline) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#1D9E75]" />
                Key Dates & Deadlines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Filed On</p>
                  <p className="text-sm font-medium text-gray-800">{format(complaint.filingDate, "MMMM d, yyyy · h:mm a")}</p>
                </div>
                {complaint.responseDeadline && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Response Deadline</p>
                    <p className="text-sm font-medium text-gray-800">{format(complaint.responseDeadline, "MMMM d, yyyy")}</p>
                  </div>
                )}
                {complaint.investigationStartDeadline && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Investigation Start</p>
                    <p className="text-sm font-medium text-gray-800">{format(complaint.investigationStartDeadline, "MMMM d, yyyy")}</p>
                  </div>
                )}
                {complaint.investigationEndDeadline && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Investigation End</p>
                    <p className="text-sm font-medium text-gray-800">{format(complaint.investigationEndDeadline, "MMMM d, yyyy")}</p>
                  </div>
                )}
                {complaint.reportSubmissionDeadline && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Report Submission</p>
                    <p className="text-sm font-medium text-gray-800">{format(complaint.reportSubmissionDeadline, "MMMM d, yyyy")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CaseTracking;
