import React, { useState, useEffect } from "react";
import {
  Clock, CheckCircle, AlertTriangle, Eye, Plus, MessageSquare,
  FileText, Search, Calendar as CalendarIcon, User, MapPin, X,
  FolderOpen, Loader, Gavel, Shield
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import {
  Complaint, ComplaintType, ComplaintStage, ComplaintStatus
} from "../../types/complaints";
import { useNavigate, useSearchParams } from "../../compat/router";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, where, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../../firebase";
import { getCaseProgress } from "../../utils/caseProgress";
import { getCachedUserDisplayName } from "../../utils/userDisplay";
import { useCaseUnreadByComplaintId } from "../../hooks/useCaseUnreadByComplaintId";

// ─── Helpers ───
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  if (dateValue && typeof dateValue.toDate === "function") {
    try { return dateValue.toDate(); } catch { return new Date(); }
  }
  if (typeof dateValue === "string" || typeof dateValue === "number") {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

const safeFormat = (dateValue: any, formatString: string): string => {
  try { return format(safeToDate(dateValue), formatString); } catch { return "Invalid Date"; }
};

const toComplaintStage = (stage: string): ComplaintStage => {
  const map: Record<string, ComplaintStage> = {
    pre_filing: ComplaintStage.PRE_FILING, filing: ComplaintStage.FILING,
    action_on_complaint: ComplaintStage.ACTION_ON_COMPLAINT,
    preliminary_investigation: ComplaintStage.PRELIMINARY_INVESTIGATION,
    investigation_report: ComplaintStage.INVESTIGATION_REPORT,
    final_decision: ComplaintStage.FINAL_DECISION, closed: ComplaintStage.CLOSED,
    withdrawn: ComplaintStage.WITHDRAWN, submitted: ComplaintStage.FILING,
    under_review: ComplaintStage.ACTION_ON_COMPLAINT,
    investigating: ComplaintStage.PRELIMINARY_INVESTIGATION,
    resolved: ComplaintStage.FINAL_DECISION, dismissed: ComplaintStage.CLOSED,
  };
  return map[stage] || ComplaintStage.FILING;
};

const toComplaintStatus = (status: string): ComplaintStatus => {
  const map: Record<string, ComplaintStatus> = {
    draft: ComplaintStatus.DRAFT,
    submitted: ComplaintStatus.SUBMITTED,
    under_review: ComplaintStatus.UNDER_REVIEW,
    requirements_pending: ComplaintStatus.REQUIREMENTS_PENDING,
    validated: ComplaintStatus.VALIDATED,
    investigating: ComplaintStatus.INVESTIGATING,
    awaiting_response: ComplaintStatus.AWAITING_RESPONSE,
    under_deliberation: ComplaintStatus.UNDER_DELIBERATION,
    resolved: ComplaintStatus.RESOLVED,
    dismissed: ComplaintStatus.DISMISSED,
    withdrawn: ComplaintStatus.WITHDRAWN,
    pending: ComplaintStatus.SUBMITTED,
    in_progress: ComplaintStatus.INVESTIGATING,
    closed: ComplaintStatus.RESOLVED,

    // ✅ ADD THESE
    inProgress: ComplaintStatus.INVESTIGATING,
    "in progress": ComplaintStatus.INVESTIGATING,
    inprogress: ComplaintStatus.INVESTIGATING,
  };

  return map[status] || map[status?.toLowerCase()] || ComplaintStatus.SUBMITTED;
};

const toComplaintType = (type: string): ComplaintType => {
  const map: Record<string, ComplaintType> = {
    sexual_harassment: ComplaintType.SEXUAL_HARASSMENT,
    discrimination: ComplaintType.DISCRIMINATION, bullying: ComplaintType.BULLYING,
    academic_dishonesty: ComplaintType.ACADEMIC_DISHONESTY,
    misconduct: ComplaintType.MISCONDUCT, violation_of_rules: ComplaintType.VIOLATION_OF_RULES,
    other: ComplaintType.OTHER, harassment: ComplaintType.SEXUAL_HARASSMENT,
    academic: ComplaintType.ACADEMIC_DISHONESTY,
  };
  return map[type] || ComplaintType.OTHER;
};

const getStatusConfig = (status: ComplaintStatus) => {
  switch (status) {
    case ComplaintStatus.INVESTIGATING:    return { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
    case ComplaintStatus.RESOLVED:         return { color: "bg-green-50 text-green-700 border-green-200", dot: "bg-[#1D9E75]" };
    case ComplaintStatus.DISMISSED:        return { color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
    case ComplaintStatus.UNDER_REVIEW:     return { color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };
    case ComplaintStatus.SUBMITTED:        return { color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" };
    case ComplaintStatus.AWAITING_RESPONSE:return { color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" };
    default:                               return { color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" };
  }
};

const formatEnum = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// Get human-readable status label
const getStatusLabel = (status: ComplaintStatus): string => {
  switch (status) {
    case ComplaintStatus.SUBMITTED:
    case ComplaintStatus.DRAFT:
    case ComplaintStatus.UNDER_REVIEW:
    case ComplaintStatus.REQUIREMENTS_PENDING:
    case ComplaintStatus.VALIDATED:
      return 'Submitted';
    case ComplaintStatus.INVESTIGATING:
    case ComplaintStatus.AWAITING_RESPONSE:
    case ComplaintStatus.UNDER_DELIBERATION:
      return 'Ongoing Investigation';
    case ComplaintStatus.RESOLVED:
    case ComplaintStatus.DISMISSED:
      return 'Decision Already Made';
    case ComplaintStatus.WITHDRAWN:
      return 'Withdrawn';
    default:
      return formatEnum(status);
  }
};

// ─── Component ───
export default function MyComplaints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const { byComplaintId, messageUnread, notificationUnread } = useCaseUnreadByComplaintId();

  // ─── Fetch from Firebase (real-time) ───
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    let reportsUnsub: Unsubscribe | null = null;
    let complaintsUnsub: Unsubscribe | null = null;
    let reportsData: Complaint[] = [];
    let complaintsData: Complaint[] = [];

    const merge = () => {
      const map = new Map<string, Complaint>();
      const seen = new Set<string>();
      const key = (c: Complaint) => {
        const t = c.title.toLowerCase().trim();
        const d = Math.floor((isNaN(c.createdAt.getTime()) ? Date.now() : c.createdAt.getTime()) / 86400000);
        return `${t}-${d}`;
      };
      complaintsData.forEach((c) => { map.set(c.id, c); seen.add(key(c)); });
      reportsData.forEach((r) => { if (!seen.has(key(r))) { map.set(r.id, r); seen.add(key(r)); } });
      const arr = Array.from(map.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setComplaints(arr);
      setLoading(false);
    };

    // reports collection
    try {
      reportsUnsub = onSnapshot(
        query(collection(db, "reports"), where("userId", "==", user.uid)),
        (snap) => {
          reportsData = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id, complainantId: data.userId, respondentId: data.respondentId || "",
              respondentName: data.respondentName || (data.isAnonymous ? "Withheld for Privacy" : "Not Specified"), respondentAddress: data.respondentAddress || "",
              title: data.title || data.description || "Untitled Report", description: data.description || "",
              statementOfFacts: data.statementOfFacts || data.additionalInfo || "",
              type: toComplaintType(data.category || "other"), severity: data.severity || "medium",
              incidentDate: safeToDate(data.incidentDate), incidentLocation: data.location || "",
              filingDate: safeToDate(data.reportedAt), stage: toComplaintStage(data.stage || "submitted"),
              status: toComplaintStatus(data.status || "submitted"), assignedCODI: (data.assignedTo && data.assignedTo.trim()) ? [data.assignedTo] : [],
              confidentialityLevel: "public" as const, createdAt: safeToDate(data.reportedAt || data.createdAt),
              updatedAt: safeToDate(data.lastUpdated || data.updatedAt),
            };
          });
          merge();
        }
      );
    } catch (e) { console.error(e); }

    // complaints collection
    try {
      complaintsUnsub = onSnapshot(
        query(collection(db, "complaints"), where("complainantId", "==", user.uid)),
        (snap) => {
          complaintsData = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id, complainantId: data.complainantId || user.uid,
              respondentId: data.respondentId || "", respondentName: data.respondentName || (data.isAnonymous ? "Withheld for Privacy" : "Not Specified"),
              respondentAddress: data.respondentAddress || "",
              title: data.title || "Untitled Complaint", description: data.description || "",
              statementOfFacts: data.statementOfFacts || data.additionalInfo || "",
              type: toComplaintType(data.type || data.category || "other"), severity: data.severity || "medium",
              incidentDate: safeToDate(data.incidentDate || data.createdAt),
              incidentLocation: data.incidentLocation || data.location || "",
              filingDate: safeToDate(data.filingDate || data.createdAt),
              stage: toComplaintStage(data.stage || "submitted"),
              status: toComplaintStatus(data.status || "submitted"), assignedCODI: (data.assignedTo && data.assignedTo.trim()) ? [data.assignedTo] : (data.assignedCODI || []),
              confidentialityLevel: (data.confidentialityLevel || "public") as any,
              createdAt: safeToDate(data.createdAt), updatedAt: safeToDate(data.updatedAt || data.createdAt),
            };
          });
          merge();
        }
      );
    } catch (e) { console.error(e); }

    return () => { reportsUnsub?.(); complaintsUnsub?.(); };
  }, [user]);

  // ─── Filter ───
  const filtered = complaints.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ─── Summary counts ───
  const total = complaints.length;
  
  // Helper to check status (handles both enum and string values from admin)
  const hasStatus = (complaint: Complaint, ...statuses: (string | ComplaintStatus)[]) => {
    const statusStr = String(complaint.status);
    return statuses.some(s => statusStr === String(s));
  };
  
  const inProgress = complaints.filter(
    (c) => hasStatus(c, 'inProgress', ComplaintStatus.VALIDATED, ComplaintStatus.INVESTIGATING, ComplaintStatus.AWAITING_RESPONSE, ComplaintStatus.UNDER_DELIBERATION)
  ).length;
  const decided = complaints.filter((c) => hasStatus(c, 'resolved', 'dismissed', ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED)).length;

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1D9E75] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your complaints...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-500 text-sm mb-4">Please log in to view your complaints.</p>
          <Button onClick={() => navigate("/login")} className="bg-[#1D9E75] hover:bg-[#178F65] text-white">Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
            <p className="text-sm text-gray-400 mt-1">Track and manage all your filed complaints</p>
          </div>
          <Button
            onClick={() => navigate("/complaints/new")}
            className="bg-[#1D9E75] hover:bg-[#178F65] text-white shadow-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            File New Complaint
          </Button>
        </div>

        {/* Privacy Assurance Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Your Privacy is Protected</p>
            <p className="text-xs text-blue-700 mt-1">All case information is handled confidentially under the Safe Spaces Act (RA 11313) and Anti-Sexual Harassment Act (RA 7877). Anti-retaliation protections apply to all parties.</p>
          </div>
        </div>

        {/* Stats Row (Minimal Outline Style) */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Filed", value: total, icon: FileText },
            { label: "Ongoing Investigation", value: inProgress, icon: Loader },
            { label: "Decision Already Made", value: decided, icon: Gavel },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl p-4 flex flex-col items-center text-center"
                style={{ border: "0.5px solid #e5e7eb" }}
              >
                <Icon className="h-7 w-7 text-[#1D9E75] mb-3" strokeWidth={1.5} />
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-gray-200 text-sm h-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20 bg-white h-10"
            >
              <option value="all">All Status</option>
              <option value={ComplaintStatus.SUBMITTED}>Submitted</option>
              <option value={ComplaintStatus.UNDER_REVIEW}>Submitted (Under Review)</option>
              <option value={ComplaintStatus.INVESTIGATING}>Ongoing Investigation</option>
              <option value={ComplaintStatus.AWAITING_RESPONSE}>Ongoing Investigation (Awaiting Response)</option>
              <option value={ComplaintStatus.RESOLVED}>Decision Already Made (Resolved)</option>
              <option value={ComplaintStatus.DISMISSED}>Decision Already Made (Dismissed)</option>
            </select>
            {(searchTerm || statusFilter !== "all") && (
              <button
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white h-10"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Complaints List */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((complaint) => {
              const statusCfg = getStatusConfig(complaint.status);
              const progress = getCaseProgress(complaint.status as any);
              const unreadCount = byComplaintId[complaint.id] || 0;
              const unreadMessages = messageUnread[complaint.id] || 0;
              const unreadNotifications = notificationUnread[complaint.id] || 0;
              const hasUpdate = unreadCount > 0;

              return (
                <div
                  key={complaint.id}
                  className={`bg-white rounded-xl border p-5 hover:border-[#1D9E75]/30 hover:shadow-md transition-all duration-200 ${
                    hasUpdate ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="font-semibold text-gray-900 text-base truncate">{complaint.title}</h3>
                        {hasUpdate && (
                          <span
                            className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0"
                            title={
                              unreadNotifications > 0 && unreadMessages > 0
                                ? `${unreadNotifications} update(s), ${unreadMessages} unread message(s)`
                                : unreadMessages > 0
                                  ? `${unreadMessages} unread message(s)`
                                  : `${unreadNotifications} new update(s)`
                            }
                          >
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {getStatusLabel(complaint.status)}
                        </span>
                        {hasUpdate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                            New update
                          </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          {formatEnum(complaint.type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Case Progress</span>
                      <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#1D9E75] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-gray-400 block">Filed</span>
                        <span className="text-xs font-medium text-gray-700">{safeFormat(complaint.filingDate, "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs text-gray-400 block">Respondent</span>
                        <span className="text-xs font-medium text-gray-700 truncate block">{complaint.respondentName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs text-gray-400 block">Location</span>
                        <span className="text-xs font-medium text-gray-700 truncate block">{complaint.incidentLocation || "Not specified"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-gray-400 block">Last Update</span>
                        <span className="text-xs font-medium text-gray-700">{safeFormat(complaint.updatedAt, "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/case-tracking/${complaint.id}`)}
                        type="button"
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      {complaint.assignedCODI && complaint.assignedCODI.length > 0 ? (
                        <button
                          onClick={() => navigate(`/case-chat/${complaint.id}`)}
                          className="relative flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-[#1D9E75] border border-[#1D9E75]/30 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                          {unreadMessages > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                              {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                          )}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed bg-gray-50"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </button>
                      )}
                    </div>
                    {(!complaint.assignedCODI || complaint.assignedCODI.length === 0) && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        No case handler assigned yet. Messaging will be available once a handler is assigned.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" ? "No Matching Complaints" : "No Complaints Filed Yet"}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "When you file a complaint, it will appear here for you to track."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button
                  onClick={() => navigate("/complaints/new")}
                  className="bg-[#1D9E75] hover:bg-[#178F65] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  File a Complaint
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
