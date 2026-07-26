import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { AdminReportService, AdminReport } from '../../services/adminReportService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { getDisplayCaseNumber } from '../../utils/caseId';

const safeToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  const parsed = new Date(value as string);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const needsAttention = (report: AdminReport): boolean => {
  const updatedAt =
    safeToDate(report.lastUpdated) ||
    safeToDate((report as AdminReport & { updatedAt?: string }).updatedAt) ||
    safeToDate(report.reportedAt);
  if (!updatedAt) return false;

  const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysSinceUpdate >= 3;
  const isEscalated = (report.escalationLevel || 0) > 0;
  const hasFollowUp = Boolean((report as AdminReport & { followUpRequested?: boolean }).followUpRequested);

  return isStale || isEscalated || hasFollowUp;
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending':
    case 'submitted':
      return 'Submitted';
    case 'inprogress':
      return 'Investigating';
    case 'resolved':
      return 'Resolved';
    case 'dismissed':
      return 'Dismissed';
    case 'closed':
      return 'Closed';
    default:
      return status || 'Unknown';
  }
};

export default function CodiDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { representativeData } = useRepresentativeRole();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const representativeId = representativeData?.id ?? null;
  const firstName = user?.displayName?.split(' ')[0] || 'CODI Member';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const liveTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now),
    [now]
  );

  const liveDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now),
    [now]
  );

  useEffect(() => {
    const unsubscribe = AdminReportService.subscribeToAllReports((fetched) => {
      setReports(fetched.filter((r) => r.status !== 'closed'));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const active = reports.filter((r) =>
      ['pending', 'submitted', 'inProgress'].includes(r.status)
    );
    const myAssigned = representativeId
      ? reports.filter((r) => r.assignedTo === representativeId && r.status !== 'closed')
      : [];
    const unassigned = reports.filter(
      (r) =>
        !r.assignedTo &&
        (r.status === 'pending' || (r.status as string) === 'submitted')
    );
    const attention = reports.filter(needsAttention);
    const investigating = myAssigned.filter((r) => r.status === 'inProgress');

    return {
      active: active.length,
      myAssigned: myAssigned.length,
      unassigned: unassigned.length,
      needsAttention: attention.length,
      investigating: investigating.length,
    };
  }, [reports, representativeId]);

  const recentCases = useMemo(() => {
    return [...reports]
      .sort((a, b) => {
        const aDate =
          safeToDate(a.lastUpdated)?.getTime() ||
          safeToDate(a.reportedAt)?.getTime() ||
          0;
        const bDate =
          safeToDate(b.lastUpdated)?.getTime() ||
          safeToDate(b.reportedAt)?.getTime() ||
          0;
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [reports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#1D9E75]" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Active Queue',
      value: stats.active,
      hint: 'All open cases in the system',
      icon: Inbox,
      href: '/admin/reports',
      color: 'text-emerald-700 bg-emerald-50',
    },
    {
      label: 'My Assigned',
      value: stats.myAssigned,
      hint: `${stats.investigating} currently investigating`,
      icon: Briefcase,
      href: '/admin/reports?assigned=me',
      color: 'text-blue-700 bg-blue-50',
    },
    {
      label: 'Unassigned',
      value: stats.unassigned,
      hint: 'Available to take from queue',
      icon: UserPlus,
      href: '/admin/reports?status=unassigned',
      color: 'text-amber-700 bg-amber-50',
    },
    {
      label: 'Needs Attention',
      value: stats.needsAttention,
      hint: 'Stale, escalated, or follow-up',
      icon: AlertTriangle,
      href: '/admin/reports?status=needs-attention',
      color: 'text-red-700 bg-red-50',
    },
  ];

  return (
    <div className="w-full space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">CODI Workspace</p>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Shared case queue — review priorities, take unassigned cases, and manage your investigations.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm sm:min-w-[240px]">
          <div className="flex items-center justify-end gap-2 text-gray-400 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Philippine Time</span>
          </div>
          <p className="text-right text-2xl font-semibold tabular-nums tracking-tight text-gray-900">
            {liveTime}
          </p>
          <p className="text-right text-sm text-gray-500 mt-1">{liveDate}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.href)}
            className="text-left"
          >
            <Card className="h-full border-gray-200 hover:border-[#1D9E75]/40 hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.hint}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Latest updates across the case queue</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/reports')}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCases.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No active cases in the queue.</p>
              </div>
            ) : (
              recentCases.map((report) => {
                const updatedAt =
                  safeToDate(report.lastUpdated) ||
                  safeToDate((report as AdminReport & { updatedAt?: string }).updatedAt) ||
                  safeToDate(report.reportedAt);
                const isMine = representativeId && report.assignedTo === representativeId;

                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => navigate(`/admin/reports?reportId=${report.id}`)}
                    className="w-full text-left rounded-xl border border-gray-200 p-4 hover:border-[#1D9E75]/40 hover:bg-emerald-50/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {report.title || 'Untitled Case'}
                          </span>
                          {isMine && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">Assigned to you</Badge>
                          )}
                          {!report.assignedTo && (
                            <Badge className="bg-amber-100 text-amber-700 text-[10px]">Unassigned</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {getDisplayCaseNumber({
                            caseId: report.caseId,
                            firestoreId: report.id,
                            filedAt: report.reportedAt,
                          })}
                          {updatedAt ? ` · Updated ${formatDistanceToNow(updatedAt, { addSuffix: true })}` : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {getStatusLabel(report.status)}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Case Queue', desc: 'Browse all open cases', href: '/admin/reports', icon: FileText },
              { label: 'My Assigned Cases', desc: 'Cases assigned to you', href: '/admin/reports?assigned=me', icon: Briefcase },
              { label: 'Messages', desc: 'Chat with complainants', href: '/admin/messages', icon: MessageSquare },
              { label: 'Closed Cases', desc: 'Your archived cases', href: '/admin/closed-cases', icon: CheckCircle2 },
              { label: 'My Performance', desc: 'Your case stats', href: '/admin/analytics', icon: Clock },
            ].map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => navigate(link.href)}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-[#1D9E75]/40 hover:bg-gray-50 transition-all text-left"
              >
                <div className="p-2 rounded-lg bg-gray-100">
                  <link.icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
