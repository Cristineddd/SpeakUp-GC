/**
 * Case Activity Timeline
 * Unified activity feed for admin/CODI case detail modal
 */

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  UserPlus,
  UserMinus,
  RefreshCw,
} from 'lucide-react';
import type { AdminReport } from '../../services/adminReportService';
import { CaseActivityService } from '../../services/caseActivityService';
import { ActivityType, type CaseActivity, formatActivityActorRole } from '../../types/caseActivity';
import { Badge } from '../ui/badge';
import { safeToDate } from '../../utils/dateFormat';

interface CaseActivityTimelineProps {
  report: AdminReport;
}

interface TimelineEntry {
  id: string;
  timestamp: Date;
  category: 'filed' | 'status' | 'assignment' | 'escalation' | 'note' | 'investigation';
  title: string;
  description?: string;
  actor?: string;
  actorRole?: string;
  meta?: string;
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.DOCUMENT_REVIEW]: 'Document Review',
  [ActivityType.EVIDENCE_COLLECTION]: 'Evidence Collection',
  [ActivityType.INTERVIEW]: 'Interview',
  [ActivityType.INVESTIGATION]: 'Investigation',
  [ActivityType.REPORT_PREPARATION]: 'Report Preparation',
  [ActivityType.DELIBERATION]: 'Deliberation',
  [ActivityType.STATUS_UPDATE]: 'Status Update',
  [ActivityType.ASSIGNMENT]: 'Case taken',
  [ActivityType.COMMUNICATION]: 'Communication',
  [ActivityType.INTERNAL_NOTE]: 'Internal Note',
  [ActivityType.OTHER]: 'Other',
};

function formatAssignmentRoleLabel(role?: string): string | undefined {
  if (!role) return undefined;
  const normalized = role.toLowerCase();
  if (normalized === 'handler' || normalized === 'codi') return 'CODI member';
  if (normalized === 'admin') return 'Admin';
  return role.replace(/_/g, ' ');
}

/** Normalize legacy "case handler" / assignment wording in stored activity text for CODI UI. */
function toCodiMemberWording(text?: string): string | undefined {
  if (!text) return text;
  return text
    .replace(/CODI member assigned/gi, 'Case taken by a CODI member')
    .replace(/has been assigned to this case/gi, 'has taken this case')
    .replace(/has been assigned to your report/gi, 'has taken your case')
    .replace(/has been assigned to your complaint/gi, 'has taken your case')
    .replace(/Case automatically assigned to CODI member/gi, 'Case taken by CODI member')
    .replace(/A CODI member has been assigned/gi, 'A CODI member has taken this case')
    .replace(/case handlers?/gi, 'CODI member')
    .replace(/\bthe handler\b/gi, 'the CODI member')
    .replace(/\ba handler\b/gi, 'a CODI member')
    .replace(/\bhandler\b/gi, 'CODI member');
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  inProgress: 'Investigating',
  investigating: 'Investigating',
  resolved: 'Decision Already Made',
  dismissed: 'Closed',
  closed: 'Closed',
};

const ACTIVITY_DEDUP_WINDOW_MS = 120_000;

function activityNotesDedupKey(notes: string, date: Date): string {
  return `${notes.trim().toLowerCase()}|${Math.floor(date.getTime() / ACTIVITY_DEDUP_WINDOW_MS)}`;
}

function statusLabel(status?: string): string {
  if (!status) return 'Unknown';
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

function formatActivityTimestamp(date: Date): { date: string; time: string } {
  return {
    date: format(date, 'MMM dd, yyyy'),
    time: format(date, 'h:mm a'),
  };
}

function buildTimelineEntries(report: AdminReport, activities: CaseActivity[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const seenKeys = new Set<string>();

  const addEntry = (entry: TimelineEntry) => {
    const key = `${entry.timestamp.getTime()}_${entry.title}_${entry.actor || ''}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    entries.push(entry);
  };

  const filedAt = safeToDate(report.reportedAt);
  if (filedAt) {
    addEntry({
      id: `filed_${report.id}`,
      timestamp: filedAt,
      category: 'filed',
      title: 'Case submitted',
      description: report.title
        ? `Formal complaint "${report.title}" was filed and recorded in the system.`
        : 'Formal complaint was filed and recorded in the system.',
      actor: report.userName && report.userName !== 'Anonymous' ? report.userName : 'Complainant',
    });
  }

  const loggedStatusKeys = new Set(
    activities
      .filter((activity) => activity.activityType === ActivityType.STATUS_UPDATE)
      .map((activity) =>
        activityNotesDedupKey(
          String(activity.findings || activity.metadata?.notes || ''),
          safeToDate(activity.createdAt) || new Date()
        )
      )
  );

  (report.statusHistory || []).forEach((history, index) => {
    const updatedAt = safeToDate(history.updatedAt);
    if (!updatedAt) return;

    const previous = statusLabel(history.previousStatus);
    const next = statusLabel(history.status);
    const notes = history.notes?.trim() || '';

    // Skip when the same status change was already logged in caseActivities
    if (loggedStatusKeys.has(activityNotesDedupKey(notes, updatedAt))) {
      return;
    }

    addEntry({
      id: `status_history_${index}_${updatedAt.getTime()}`,
      timestamp: updatedAt,
      category: 'status',
      title: `Status changed: ${previous} → ${next}`,
      description: notes || undefined,
      actor: history.updatedByName || history.updatedBy || 'Staff',
    });
  });

  (report.handlerHistory || []).forEach((entry, index) => {
    const assignedAt = safeToDate(entry.assignedAt);
    if (assignedAt) {
      const roleLabel = formatAssignmentRoleLabel(entry.handlerRole);
      addEntry({
        id: `handler_assigned_${index}_${assignedAt.getTime()}`,
        timestamp: assignedAt,
        category: 'assignment',
        title: `Case taken by ${entry.handlerName}`,
        description: entry.notes?.trim() || undefined,
        actor: entry.handlerName || entry.assignedByName || 'CODI member',
        meta: roleLabel ? `Role: ${roleLabel}` : undefined,
      });
    }

    const unassignedAt = safeToDate(entry.unassignedAt);
    if (unassignedAt) {
      addEntry({
        id: `handler_unassigned_${index}_${unassignedAt.getTime()}`,
        timestamp: unassignedAt,
        category: 'assignment',
        title: `CODI member unassigned: ${entry.handlerName}`,
        description: entry.unassignedReason?.trim() || 'CODI member was removed from this case.',
        actor: entry.unassignedBy || 'Admin',
      });
    }
  });

  (report.escalationHistory || []).forEach((entry, index) => {
    const escalatedAt = safeToDate(entry.escalatedAt);
    if (!escalatedAt) return;

    addEntry({
      id: `escalation_${index}_${escalatedAt.getTime()}`,
      timestamp: escalatedAt,
      category: 'escalation',
      title: entry.autoEscalated
        ? `Auto-escalated to Level ${entry.level}`
        : `Escalated to Level ${entry.level}`,
      description: [entry.reason, entry.notes].filter(Boolean).join(' — ') || undefined,
      actor: entry.escalatedByName || entry.escalatedBy || 'System',
      meta: entry.previousLevel !== entry.level ? `From Level ${entry.previousLevel}` : undefined,
    });
  });

  activities.forEach((activity) => {
    const createdAt = safeToDate(activity.createdAt) || new Date();
    const isInternalNote =
      activity.activityType === ActivityType.INTERNAL_NOTE ||
      activity.isInternal === true ||
      activity.metadata?.isInternalNote === true ||
      activity.metadata?.event === 'internal_note';
    const typeLabel = isInternalNote
      ? 'Internal Note'
      : ACTIVITY_TYPE_LABELS[activity.activityType] || 'Activity';

    addEntry({
      id: `case_activity_${activity.id}`,
      timestamp: createdAt,
      category:
        activity.activityType === ActivityType.STATUS_UPDATE
          ? 'status'
          : activity.activityType === ActivityType.ASSIGNMENT
            ? 'assignment'
            : isInternalNote
              ? 'note'
              : 'investigation',
      title: toCodiMemberWording(activity.description || typeLabel) || typeLabel,
      description: toCodiMemberWording(activity.findings?.trim()) || undefined,
      actor: activity.performedByName || 'Staff',
      actorRole: activity.performedByRole,
      meta: typeLabel,
    });
  });

  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function CategoryIcon({ category }: { category: TimelineEntry['category'] }) {
  switch (category) {
    case 'filed':
      return <FileText className="h-4 w-4" />;
    case 'status':
      return <RefreshCw className="h-4 w-4" />;
    case 'assignment':
      return <UserPlus className="h-4 w-4" />;
    case 'escalation':
      return <AlertTriangle className="h-4 w-4" />;
    case 'note':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function categoryStyles(category: TimelineEntry['category']): string {
  switch (category) {
    case 'filed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'status':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'assignment':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'escalation':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'note':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function CaseActivityTimeline({ report }: CaseActivityTimelineProps) {
  const [activities, setActivities] = useState<CaseActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!report.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = CaseActivityService.subscribeToActivities(report.id, (fetched) => {
      setActivities(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [report.id]);

  const timelineEntries = useMemo(
    () => buildTimelineEntries(report, activities),
    [report, activities]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (timelineEntries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 px-6 py-12 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <p className="font-medium text-gray-700">No activity recorded yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Case actions such as status updates, CODI member assignments, internal notes, and investigations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-emerald-900">
          <Clock className="h-4 w-4" />
          <span>
            <span className="font-semibold">{timelineEntries.length}</span> recorded activit
            {timelineEntries.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
        <p className="text-xs text-emerald-800/70">Newest first · All times shown in local timezone</p>
      </div>

      <div className="space-y-0">
        {timelineEntries.map((entry, index) => {
          const { date, time } = formatActivityTimestamp(entry.timestamp);
          const isLast = index === timelineEntries.length - 1;

          return (
            <div key={entry.id} className="relative flex gap-4 pb-6">
              {!isLast && (
                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-emerald-100" />
              )}

              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${categoryStyles(entry.category)}`}
              >
                <CategoryIcon category={entry.category} />
              </div>

              <div className="min-w-0 flex-1 rounded-xl border border-emerald-100/80 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900">{entry.title}</h4>
                    {entry.meta && (
                      <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                        {entry.meta}
                      </Badge>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-900">{date}</p>
                    <p className="text-xs text-gray-500">{time}</p>
                  </div>
                </div>

                {entry.description && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{entry.description}</p>
                )}

                {entry.actor && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    {entry.category === 'assignment' && entry.title.includes('unassigned') ? (
                      <UserMinus className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    <span>
                      By <span className="font-medium text-gray-700">{entry.actor}</span>
                      {formatActivityActorRole(entry.actorRole) && (
                        <span className="text-gray-400"> · {formatActivityActorRole(entry.actorRole)}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
