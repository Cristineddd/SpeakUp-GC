import React, { useState, useEffect } from "react";
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
  Severity,
  Deadline,
  CaseTimeline,
  CaseTimelineEvent,
  InvestigationActivity
} from "../../types/complaints";
import { collection, doc, getDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

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
  const [loading, setLoading] = useState(true);

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
                statementOfFacts: data.statementOfFacts || data.additionalInfo || data.description || '',
                type: data.type || data.category || 'other',
                severity: data.severity || 'medium',
                incidentDate: safeToDate(data.incidentDate),
                incidentLocation: data.incidentLocation || data.location || '',
                locationVicinity: data.locationVicinity || '', // 'inside' or 'outside'
                filingDate: safeToDate(data.filingDate || data.reportedAt || data.createdAt),
                stage: data.stage || ComplaintStage.FILING,
                status: data.status || ComplaintStatus.SUBMITTED,
                assignedCODI: data.assignedCODI && Array.isArray(data.assignedCODI) 
                  ? data.assignedCODI 
                  : data.assignedTo 
                    ? [data.assignedTo] 
                    : ['Not yet assigned'],
                assignedAuthority: data.assignedAuthority || 'Not yet assigned',
                responseDeadline: data.responseDeadline ? safeToDate(data.responseDeadline) : undefined,
                investigationStartDeadline: data.investigationStartDeadline ? safeToDate(data.investigationStartDeadline) : undefined,
                investigationEndDeadline: data.investigationEndDeadline ? safeToDate(data.investigationEndDeadline) : undefined,
                reportSubmissionDeadline: data.reportSubmissionDeadline ? safeToDate(data.reportSubmissionDeadline) : undefined,
                confidentialityLevel: data.confidentialityLevel || 'public',
                createdAt: safeToDate(data.createdAt || data.reportedAt),
                updatedAt: safeToDate(data.updatedAt || data.lastUpdated || data.createdAt)
              };
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
            const now = new Date();

            // Filing Stage - Always present
            events.push({
              id: "filing",
              stage: ComplaintStage.FILING,
              status: ComplaintStatus.SUBMITTED,
              description: "Formal complaint submitted",
              actor: "Complainant",
              timestamp: complaint.filingDate,
              attachments: [],
              details: `Complaint filed regarding ${complaint.type.replace('_', ' ')} incident. Case is now under review by the appropriate authority.`
            });

            // Handler Assignment Event - Add when CODI investigators are assigned
            if (complaint.assignedCODI && complaint.assignedCODI.length > 0 && complaint.assignedCODI[0] !== 'Not yet assigned') {
              const assignmentDate = complaint.updatedAt > complaint.filingDate ? complaint.updatedAt : new Date(complaint.filingDate.getTime() + 48 * 60 * 60 * 1000); // Assume assignment happens after filing
              events.push({
                id: "handler_assignment",
                stage: ComplaintStage.ACTION_ON_COMPLAINT,
                status: complaint.status,
                description: `Case handler assigned`,
                actor: complaint.assignedCODI[0],
                timestamp: assignmentDate,
                attachments: [],
                details: `${complaint.assignedCODI[0]} has been assigned to handle this case. The investigation process will begin shortly.`
              });
            }

            // Action on Complaint Stage - Only add if status has changed from SUBMITTED and not resolved/dismissed yet
            if (complaint.status !== ComplaintStatus.SUBMITTED && 
                complaint.status !== ComplaintStatus.RESOLVED && 
                complaint.status !== ComplaintStatus.DISMISSED) {
              const actionDate = complaint.updatedAt > complaint.filingDate ? complaint.updatedAt : new Date(complaint.filingDate.getTime() + 24 * 60 * 60 * 1000);
              
              // Determine the proper actor
              const eventActor = complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned' 
                ? complaint.assignedCODI[0] 
                : "CODI Office";
              
              events.push({
                id: "action_on_complaint",
                stage: ComplaintStage.ACTION_ON_COMPLAINT,
                status: complaint.status,
                description: complaint.status === ComplaintStatus.VALIDATED ? "Complaint validated and accepted for investigation" :
                           complaint.status === ComplaintStatus.UNDER_REVIEW ? "Complaint under review for validation" :
                           `Complaint status updated to ${complaint.status.replace('_', ' ')}`,
                actor: eventActor,
                timestamp: actionDate,
                attachments: [],
                details: complaint.status === ComplaintStatus.VALIDATED
                  ? "The complaint has been reviewed and deemed valid for further investigation. Investigation will begin shortly."
                  : complaint.status === ComplaintStatus.UNDER_REVIEW
                  ? "The CODI office is reviewing the complaint to determine if it meets the criteria for investigation."
                  : "The complaint status has been updated based on initial review."
              });
            }

            // Preliminary Investigation Stage - Only add if actually in investigation AND not already dismissed/resolved
            if ((complaint.status === ComplaintStatus.INVESTIGATING || complaint.stage >= ComplaintStage.PRELIMINARY_INVESTIGATION) &&
                complaint.status !== ComplaintStatus.RESOLVED && 
                complaint.status !== ComplaintStatus.DISMISSED) {
              const prelimDate = complaint.investigationStartDeadline || new Date(complaint.filingDate.getTime() + 7 * 24 * 60 * 60 * 1000);
              
              // Use assigned handler as actor
              const investigationActor = complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned'
                ? complaint.assignedCODI[0]
                : "Case Handler";
              
              events.push({
                id: "preliminary_investigation",
                stage: ComplaintStage.PRELIMINARY_INVESTIGATION,
                status: ComplaintStatus.INVESTIGATING,
                description: "Preliminary investigation initiated",
                actor: investigationActor,
                timestamp: prelimDate,
                attachments: [],
                details: "Initial evidence is being gathered, witnesses are being interviewed, and allegations are being assessed. This phase typically takes 2-4 weeks."
              });
            }

            // Investigation Report Stage - Only add if report has been submitted or is due AND not dismissed/resolved
            if (complaint.stage >= ComplaintStage.INVESTIGATION_REPORT &&
                complaint.status !== ComplaintStatus.RESOLVED && 
                complaint.status !== ComplaintStatus.DISMISSED) {
              const reportDate = complaint.reportSubmissionDeadline || new Date(complaint.filingDate.getTime() + 45 * 24 * 60 * 60 * 1000);
              
              // Use assigned handler as actor
              const reportActor = complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned'
                ? complaint.assignedCODI[0]
                : "Case Handler";
              
              events.push({
                id: "investigation_report",
                stage: ComplaintStage.INVESTIGATION_REPORT,
                status: ComplaintStatus.INVESTIGATING,
                description: "Investigation report submitted for review",
                actor: reportActor,
                timestamp: reportDate,
                attachments: [],
                details: "Investigation findings have been compiled into a comprehensive report. This will be reviewed by the disciplining authority for final decision."
              });
            }

            // Final Decision Stage - Only add if decision has been made
            if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.DISMISSED) {
              const decisionDate = complaint.updatedAt > complaint.filingDate ? complaint.updatedAt : new Date(complaint.filingDate.getTime() + 60 * 24 * 60 * 60 * 1000);
              
              // Determine the proper actor for final decision
              const decisionActor = complaint.assignedAuthority && complaint.assignedAuthority !== 'Not yet assigned'
                ? complaint.assignedAuthority
                : (complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned')
                  ? complaint.assignedCODI[0]
                  : "Disciplining Authority";
              
              events.push({
                id: "final_decision",
                stage: ComplaintStage.FINAL_DECISION,
                status: complaint.status,
                description: complaint.status === ComplaintStatus.RESOLVED ? "Case resolved" : "Case dismissed",
                actor: decisionActor,
                timestamp: decisionDate,
                attachments: [],
                details: complaint.status === ComplaintStatus.RESOLVED
                  ? "A final decision has been made on this case. Appropriate disciplinary actions will be implemented."
                  : "The case has been dismissed after thorough review. The complainant has been notified."
              });
            }

            // Add future projected events only when appropriate - not for brand new complaints
            if (complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.DISMISSED) {
              // Only show projected events if complaint has been validated or is under review
              const shouldShowProjections = complaint.status === ComplaintStatus.VALIDATED ||
                                          complaint.status === ComplaintStatus.UNDER_REVIEW ||
                                          complaint.stage >= ComplaintStage.ACTION_ON_COMPLAINT;

              if (shouldShowProjections) {
                const nextStages = [];

                // Add investigation projection only if validated but not yet investigating
                if (complaint.status === ComplaintStatus.VALIDATED && complaint.stage < ComplaintStage.PRELIMINARY_INVESTIGATION) {
                  nextStages.push({ stage: ComplaintStage.PRELIMINARY_INVESTIGATION, description: "Investigation to begin", days: 7 });
                }

                // Add report projection only if investigating but not yet at report stage
                if (complaint.status === ComplaintStatus.INVESTIGATING && complaint.stage < ComplaintStage.INVESTIGATION_REPORT) {
                  nextStages.push({ stage: ComplaintStage.INVESTIGATION_REPORT, description: "Investigation report due", days: 30 });
                }

                // Add final decision projection only if at report stage or investigating
                if (complaint.stage >= ComplaintStage.INVESTIGATION_REPORT || complaint.status === ComplaintStatus.INVESTIGATING) {
                  nextStages.push({ stage: ComplaintStage.FINAL_DECISION, description: "Final decision expected", days: 15 });
                }

                nextStages.forEach(({ stage, description, days }) => {
                  if (complaint.stage < stage) {
                    const projectedDate = new Date(complaint.filingDate.getTime() + days * 24 * 60 * 60 * 1000);
                    if (projectedDate > now) {
                      events.push({
                        id: `projected_${stage}`,
                        stage,
                        status: ComplaintStatus.SUBMITTED,
                        description,
                        actor: "System Projection",
                        timestamp: projectedDate,
                        attachments: [],
                        details: `Estimated timeline based on institutional procedures. Actual dates may vary.`,
                        isProjected: true
                      });
                    }
                  }
                });
              }
            }

            // Sort events by timestamp
            return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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

            // Use actual handler info
            const handler = complaint.assignedCODI && complaint.assignedCODI[0] !== 'Not yet assigned' 
              ? complaint.assignedCODI[0] 
              : "Case Handler";
            const authority = complaint.assignedAuthority && complaint.assignedAuthority !== 'Not yet assigned'
              ? complaint.assignedAuthority
              : "Disciplining Authority";

            // 1. Always add initial filing activity (at filing date)
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

            // 2. Add validation activity if status shows it's been reviewed (1-2 days after filing)
            if (complaint.status !== ComplaintStatus.SUBMITTED || complaint.assignedCODI?.[0] !== 'Not yet assigned') {
              const validationDate = new Date(Math.min(
                baseDate.getTime() + 2 * 24 * 60 * 60 * 1000, // 2 days after filing
                updatedDate.getTime() // Or when it was updated
              ));
              
              activities.push({
                id: "validation_activity",
                complaintId: complaint.id,
                investigatorId: "CODI Office",
                activityType: "document_review",
                description: "Complaint validation and case handler assignment",
                findings: complaint.status === ComplaintStatus.VALIDATED
                  ? `Complaint validated and assigned to ${handler} for investigation`
                  : complaint.assignedCODI?.[0] !== 'Not yet assigned'
                    ? `Case assigned to ${handler} for preliminary review`
                    : "Complaint under initial review by CODI office",
                date: validationDate,
                attachments: []
              });
            }

            // 3. Only add investigation activities if actually investigating or beyond
            if (complaint.status === ComplaintStatus.INVESTIGATING || complaint.stage >= ComplaintStage.PRELIMINARY_INVESTIGATION) {
              const investigationStartDate = complaint.investigationStartDeadline || 
                new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
              
              activities.push({
                id: "investigation_start",
                complaintId: complaint.id,
                investigatorId: handler,
                activityType: "evidence_collection",
                description: "Preliminary investigation initiated",
                findings: "Initial evidence review conducted, relevant parties identified for interviews",
                date: investigationStartDate,
                attachments: []
              });

              // Add interview activity (only if investigation has progressed)
              if (complaint.stage >= ComplaintStage.PRELIMINARY_INVESTIGATION) {
                activities.push({
                  id: "interview_complainant",
                  complaintId: complaint.id,
                  investigatorId: handler,
                  activityType: "interview",
                  description: "Formal interview with complainant",
                  findings: "Detailed testimony obtained, supporting evidence collected",
                  date: new Date(investigationStartDate.getTime() + 5 * 24 * 60 * 60 * 1000),
                  attachments: []
                });
              }
            }

            // 4. Only add report activities if report stage reached
            if (complaint.stage >= ComplaintStage.INVESTIGATION_REPORT) {
              const reportDate = complaint.reportSubmissionDeadline || 
                new Date(baseDate.getTime() + 40 * 24 * 60 * 60 * 1000);
              
              activities.push({
                id: "report_preparation",
                complaintId: complaint.id,
                investigatorId: handler,
                activityType: "deliberation",
                description: "Investigation report compiled",
                findings: "All evidence analyzed and documented. Findings prepared for authority review",
                date: reportDate,
                attachments: ["investigation_report.pdf"]
              });
            }

            // 5. Only add decision activity if case is actually resolved/dismissed
            if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.DISMISSED) {
              // Use the actual update date when case was resolved
              const decisionDate = updatedDate > baseDate ? updatedDate : new Date(baseDate.getTime() + 50 * 24 * 60 * 60 * 1000);
              
              activities.push({
                id: "decision_making",
                complaintId: complaint.id,
                investigatorId: authority,
                activityType: "deliberation",
                description: "Final decision rendered",
                findings: complaint.status === ComplaintStatus.RESOLVED
                  ? "Case reviewed. Findings sustained with appropriate disciplinary action determined"
                  : "Case reviewed. Complaint dismissed based on investigation findings",
                date: decisionDate,
                attachments: complaint.status === ComplaintStatus.RESOLVED ? ["decision_document.pdf"] : []
              });
            }

            // Filter out future activities and sort by date
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

  const getStageProgress = () => {
    if (!complaint) return 0;
    
    // Convert status to string for comparison (admin uses different status values)
    const statusStr = (complaint.status as any) as string;
    
    if (complaint.status === ComplaintStatus.RESOLVED || statusStr === 'resolved') return 100;
    if (complaint.status === ComplaintStatus.DISMISSED || statusStr === 'dismissed') return 0;
    
    // Same 5-stage array as MyComplaints list so progress is consistent
    const stages = [
      'filing',
      'action_on_complaint',
      'preliminary_investigation',
      'investigation_report',
      'final_decision',
    ];
    
    // Get the current stage value (handle both enum and string)
    const currentStage = (complaint.stage as any) as string;
    
    const idx = stages.indexOf(currentStage);
    
    // If stage not found, calculate from status (using admin status values)
    if (idx < 0) {
      // Admin uses: pending, submitted, inProgress, resolved, dismissed
      if (statusStr === 'pending' || statusStr === 'submitted' || complaint.status === ComplaintStatus.SUBMITTED || complaint.status === ComplaintStatus.UNDER_REVIEW || complaint.status === ComplaintStatus.REQUIREMENTS_PENDING) {
        return 20; // Filing stage
      }
      if (statusStr === 'inProgress' || complaint.status === ComplaintStatus.VALIDATED || complaint.status === ComplaintStatus.INVESTIGATING || complaint.status === ComplaintStatus.AWAITING_RESPONSE) {
        return 60; // Investigation stage
      }
      if (complaint.status === ComplaintStatus.UNDER_DELIBERATION) {
        return 80; // Report/Decision stage
      }
      return 20;
    }
    
    return ((idx + 1) / stages.length) * 100;
  };

  const getStatusConfig = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.SUBMITTED: return { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500", label: "Submitted" };
      case ComplaintStatus.VALIDATED: return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", label: "Validated" };
      case ComplaintStatus.INVESTIGATING: return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Investigating" };
      case ComplaintStatus.UNDER_REVIEW: return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500", label: "Under Review" };
      case ComplaintStatus.RESOLVED: return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", label: "Resolved" };
      case ComplaintStatus.DISMISSED: return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500", label: "Dismissed" };
      default: return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400", label: status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) };
    }
  };

  const getStatusColor = (status: ComplaintStatus): string => {
    switch (status) {
      case ComplaintStatus.SUBMITTED: return "bg-violet-100 text-violet-800";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#16A34A] border-t-transparent mx-auto mb-3" />
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

  const stageSteps = [
    { key: ComplaintStage.FILING, label: "Filing" },
    { key: ComplaintStage.ACTION_ON_COMPLAINT, label: "Action" },
    { key: ComplaintStage.PRELIMINARY_INVESTIGATION, label: "Investigation" },
    { key: ComplaintStage.INVESTIGATION_REPORT, label: "Report" },
    { key: ComplaintStage.FINAL_DECISION, label: "Decision" },
  ];

  // Map the current stage to an index in stageSteps (PRE_FILING maps to 0 = Filing)
  const stageOrder = [
    ComplaintStage.FILING,
    ComplaintStage.ACTION_ON_COMPLAINT,
    ComplaintStage.PRELIMINARY_INVESTIGATION,
    ComplaintStage.INVESTIGATION_REPORT,
    ComplaintStage.FINAL_DECISION,
  ];
  const currentStageIdx = complaint.status === ComplaintStatus.RESOLVED
    ? stageSteps.length - 1
    : Math.max(0, stageOrder.indexOf(complaint.stage));

  return (
    <div className="space-y-3">

      {/* ── Hero Header Card ─────────────────── */}
      <div className={`rounded-2xl border ${statusCfg.border} ${statusCfg.bg} p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Shield className="h-5 w-5 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Case ID</p>
              <p className="text-sm font-mono font-semibold text-gray-700 break-all">{complaint.id}</p>
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
            <span className="text-xs text-gray-500">
              Stage: <span className="font-medium text-gray-700">{complaint.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
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
                      done ? 'bg-[#16A34A] border-[#16A34A] text-white' :
                      active ? 'bg-white border-[#16A34A] text-[#16A34A]' :
                      'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {done ? <CheckCircle className="h-3 w-3" /> : <span className="text-[9px]">{idx + 1}</span>}
                    </div>
                    <span className={`text-[9px] mt-1 font-medium hidden sm:block ${active ? 'text-[#16A34A]' : done ? 'text-gray-600' : 'text-gray-400'}`}>{stage.label}</span>
                  </div>
                  {idx < stageSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${idx < currentStageIdx || complaint.status === ComplaintStatus.RESOLVED ? 'bg-[#16A34A]' : 'bg-gray-200'}`} />
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
              className={`h-2 rounded-full transition-all duration-700 ${complaint.status === ComplaintStatus.DISMISSED ? 'bg-red-400' : 'bg-[#16A34A]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Legal notice */}
        <div className="mt-3 flex items-start gap-2 p-2.5 bg-white/70 border border-white rounded-xl text-xs text-gray-600">
          <Shield className="h-3.5 w-3.5 text-[#16A34A] flex-shrink-0 mt-0.5" />
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
            <h3 className="text-base font-semibold text-gray-900 mb-1">Case Timeline</h3>
            <p className="text-xs text-gray-500 mb-5">Chronological history of your complaint's progress.</p>
            <div className="relative">
              {timelineEvents.map((event, index) => {
                const Icon = getStageIcon(event.stage);
                const isLast = index === timelineEvents.length - 1;
                return (
                  <div key={event.id} className="relative flex items-start gap-4 pb-7">
                    {!isLast && (
                      <div className="absolute left-[18px] top-9 w-0.5 bottom-0 bg-gray-100" />
                    )}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm border-2 z-10 ${
                      event.isProjected ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-[#16A34A] border-[#16A34A] text-white'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-grow min-w-0 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
                        <h4 className={`text-sm font-semibold ${event.isProjected ? 'text-gray-400' : 'text-gray-900'}`}>
                          {event.description}
                          {event.isProjected && <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Projected</span>}
                        </h4>
                        <time className="text-xs text-gray-400 flex-shrink-0">
                          {format(event.timestamp, "MMM d, yyyy · h:mm a")}
                        </time>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">By: <span className="font-medium">{event.actor}</span></p>
                      {event.details && (
                        <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mt-1">
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
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => {
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
                        <div className="w-2 h-2 rounded-full bg-[#16A34A] mt-1.5" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-1 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
                            {activity.activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <time className="text-xs text-gray-400">{format(activity.date, "MMM d, yyyy · h:mm a")}</time>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mt-1">{activity.description}</p>
                        {activity.findings && (
                          <div className="mt-2 bg-[#16A34A]/5 border-l-4 border-[#16A34A] rounded-r-lg p-3">
                            <p className="text-xs font-semibold text-[#15803D] mb-0.5">Key Findings:</p>
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
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No activities yet</p>
                <p className="text-xs text-gray-500 mt-1">Activities will appear here as the case progresses.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Details Tab ── */}
        <TabsContent value="details" className="mt-4 space-y-4">

          {/* Quick info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Type", value: complaint.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), icon: FileText },
              { label: "Severity", value: complaint.severity.replace(/\b\w/g, l => l.toUpperCase()), icon: AlertTriangle },
              { label: "Filed", value: format(complaint.filingDate, "MMM d, yyyy"), icon: Calendar },
              { label: "Handler", value: complaint.assignedCODI?.[0] !== 'Not yet assigned' ? complaint.assignedCODI?.[0] || '—' : 'Pending', icon: User },
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
              <Calendar className="h-4 w-4 text-[#16A34A]" />
              Incident Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Incident Date</p>
                <p className="text-sm font-medium text-gray-800">{format(complaint.incidentDate, "MMMM d, yyyy")}</p>
              </div>
              {(complaint as any).incidentTime && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Incident Time</p>
                  <p className="text-sm font-medium text-gray-800">{(complaint as any).incidentTime}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Location</p>
                <p className="text-sm font-medium text-gray-800">{complaint.incidentLocation || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Where it Happened</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  complaint.locationVicinity === 'online' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  complaint.locationVicinity === 'inside' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {formatVicinity(complaint.locationVicinity)}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#16A34A]" />
              Complaint Description
            </h3>
            {complaint.description && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              </div>
            )}
            {complaint.statementOfFacts && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Statement of Facts</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{complaint.statementOfFacts}</p>
              </div>
            )}
          </div>

          {/* Respondent */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#16A34A]" />
              Respondent Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Name</p>
                <p className="text-sm font-medium text-gray-800">{complaint.respondentName || 'Not disclosed'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Address / Description</p>
                <p className="text-sm font-medium text-gray-800">{complaint.respondentAddress || 'Not disclosed'}</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <strong>Note:</strong> Under the Safe Spaces Act (RA 11313), the respondent is notified of this complaint and the complainant's identity. Anti-retaliation provisions protect both parties.
            </div>
          </div>

          {/* Personnel & Confidentiality */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#16A34A]" />
              Assigned Personnel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Case Handler (CODI)</p>
                <p className="text-sm font-medium text-gray-800">
                  {complaint.assignedCODI?.[0] && complaint.assignedCODI[0] !== 'Not yet assigned'
                    ? complaint.assignedCODI[0]
                    : <span className="text-amber-600">Not yet assigned — pending hearing notification</span>}
                </p>
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
                <Clock className="h-4 w-4 text-[#16A34A]" />
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
