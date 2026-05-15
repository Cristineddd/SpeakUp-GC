import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { AdminReportService, AdminReport } from '../../services/adminReportService';
import {
  Users,
  FileText,
  CheckCircle2,
  Timer,
  BarChart3,
  Sparkles,
} from 'lucide-react';

import { getFormalComplaintCategoryLabel } from '../../constants/formalComplaintCategories';

interface AnalyticsData {
  dailyActiveUsers: number;
  totalReports: number;
  resolvedReports: number;
  averageResponseTime: number;
  reportsOverTime: Array<{
    date: string;
    count: number;
  }>;
  userGrowth: Array<{
    date: string;
    users: number;
  }>;
  reportsByCategory: Array<{
    category: string;
    count: number;
  }>;
  reportsByStatus: Array<{
    status: string;
    count: number;
  }>;
}

const BRAND = '#1a7a45';
const CHART_MUTED = '#e5e7eb';
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.96)',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
};

function formatStatusLabel(value: string) {
  return String(value).replace(/_/g, ' ');
}

const STATUS_COLORS = ['#1a7a45', '#ca8a04', '#64748b', '#7c3aed', '#0d9488', '#dc2626'];
const CATEGORY_COLORS = ['#5b21b6', '#1a7a45', '#0d9488', '#b45309', '#1d4ed8', '#be185d'];

const Analytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    dailyActiveUsers: 0,
    totalReports: 0,
    resolvedReports: 0,
    averageResponseTime: 0,
    reportsOverTime: [],
    userGrowth: [],
    reportsByCategory: [],
    reportsByStatus: [],
  });
  const [loading, setLoading] = useState(true);

  const calculateResponseTime = (reports: AdminReport[]): number => {
    const resolvedReports = reports.filter(
      (report) => report.status === 'resolved' && report.reportedAt && report.lastUpdated
    );

    if (resolvedReports.length === 0) return 0;

    const totalHours = resolvedReports.reduce((total, report) => {
      try {
        const reportedAt = new Date(report.reportedAt);
        const updatedAt = new Date(report.lastUpdated);

        const diffHours = (updatedAt.getTime() - reportedAt.getTime()) / (1000 * 60 * 60);
        return total + Math.max(0, diffHours);
      } catch {
        return total;
      }
    }, 0);

    return Math.round(totalHours / resolvedReports.length);
  };

  const calculateDailyActiveUsers = (reports: AdminReport[]): number => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const todayReporters = new Set(
      reports
        .filter((report) => {
          try {
            const reportedAt = new Date(report.reportedAt);
            return reportedAt >= todayStart && reportedAt <= todayEnd;
          } catch {
            return false;
          }
        })
        .map((report) => report.userId)
        .filter(Boolean)
    );

    return todayReporters.size;
  };

  const calculateReportsOverTime = (reports: AdminReport[]) => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return last7Days.map((date) => {
      const dateStr = format(date, 'MM/dd');
      const count = reports.filter((report) => {
        try {
          const reportedAt = new Date(report.reportedAt);
          return format(reportedAt, 'MM/dd') === dateStr;
        } catch {
          return false;
        }
      }).length;

      return { date: dateStr, count };
    });
  };

  const calculateUserGrowth = async (): Promise<Array<{ date: string; users: number }>> => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'asc'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate
          ? docSnap.data().createdAt.toDate()
          : new Date(docSnap.data().createdAt),
      }));

      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      let cumulativeUsers = 0;
      return last7Days.map((date) => {
        const dateStr = format(date, 'MM/dd');

        const usersOnDate = users.filter((user) => {
          try {
            const userDate = user.createdAt;
            return userDate <= endOfDay(date);
          } catch {
            return false;
          }
        }).length;

        cumulativeUsers = Math.max(cumulativeUsers, usersOnDate);

        return { date: dateStr, users: cumulativeUsers };
      });
    } catch (error) {
      console.error('Error calculating user growth:', error);
      return [];
    }
  };

  const calculateReportsByCategory = (reports: AdminReport[]) => {
    const categoryCount: Record<string, number> = {};

    reports.forEach((report) => {
      const category = report.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateReportsByStatus = (reports: AdminReport[]) => {
    const statusCount: Record<string, number> = {};

    reports.forEach((report) => {
      const status = report.status || 'pending';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  };

  useEffect(() => {
    setLoading(true);

    const reportsUnsubscribe = AdminReportService.subscribeToAllReports(async (reports) => {
      try {
        const totalReports = reports.length;
        const resolvedReports = reports.filter((report) => report.status === 'resolved').length;
        const dailyActiveUsers = calculateDailyActiveUsers(reports);
        const averageResponseTime = calculateResponseTime(reports);
        const reportsOverTime = calculateReportsOverTime(reports);
        const userGrowth = await calculateUserGrowth();
        const reportsByCategory = calculateReportsByCategory(reports);
        const reportsByStatus = calculateReportsByStatus(reports);

        setData({
          dailyActiveUsers,
          totalReports,
          resolvedReports,
          averageResponseTime,
          reportsOverTime,
          userGrowth,
          reportsByCategory,
          reportsByStatus,
        });
        setLoading(false);
      } catch (error) {
        console.error('Analytics: Error processing data:', error);
        setLoading(false);
      }
    });

    return () => {
      reportsUnsubscribe();
    };
  }, []);

  const resolutionPct =
    data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0;

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 py-24">
        <div
          className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#1a7a45]/20 border-t-[#1a7a45]"
          aria-hidden
        />
        <p className="text-sm font-medium text-gray-600">Loading analytics…</p>
      </div>
    );
  }

  const axisTick = { fontSize: 11, fill: '#6b7280' };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-12">
      {/* Page header */}
      <header className="flex flex-col gap-4 border-b border-gray-200/90 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#1a7a45]">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">Insights</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Analytics</h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600">
            Live metrics from reports and users. Charts cover the last seven days.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/90 px-3 py-1.5 text-xs text-gray-600 shadow-sm">
          <BarChart3 className="h-3.5 w-3.5 text-gray-400" aria-hidden />
          <span>Updated {format(new Date(), 'MMM d, yyyy · h:mm a')}</span>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Active today',
            value: data.dailyActiveUsers,
            hint: 'Users who submitted a report today',
            icon: Users,
            accent: 'from-emerald-500/12 to-transparent',
          },
          {
            label: 'Total reports',
            value: data.totalReports,
            hint: 'All-time submissions',
            icon: FileText,
            accent: 'from-slate-500/10 to-transparent',
          },
          {
            label: 'Resolved',
            value: data.resolvedReports,
            hint: data.totalReports > 0 ? `${resolutionPct}% of all reports` : 'No reports yet',
            icon: CheckCircle2,
            accent: 'from-[#1a7a45]/15 to-transparent',
          },
          {
            label: 'Avg. resolve time',
            value: `${data.averageResponseTime}h`,
            hint: 'Mean hours from report to resolution',
            icon: Timer,
            accent: 'from-amber-500/12 to-transparent',
          },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            className="relative overflow-hidden border-gray-200/80 bg-white/95 shadow-sm ring-1 ring-gray-900/[0.03]"
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br ${kpi.accent}`}
              aria-hidden
            />
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
              <CardTitle className="text-sm font-medium text-gray-600">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-gray-400" aria-hidden />
            </CardHeader>
            <CardContent className="pb-5">
              <div className="text-3xl font-bold tabular-nums tracking-tight text-gray-900">{kpi.value}</div>
              <p className="mt-1.5 text-xs leading-snug text-gray-500">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-gray-200/80 bg-white/95 shadow-sm ring-1 ring-gray-900/[0.03]">
          <CardHeader className="space-y-1 border-b border-gray-100 bg-gradient-to-r from-white to-violet-50/40 pb-4 pt-5">
            <CardTitle className="text-base font-semibold text-gray-900">Reports over time</CardTitle>
            <CardDescription>Last 7 days · daily submissions</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-2 pb-4 pt-4 sm:h-[320px] sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.reportsOverTime} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_MUTED} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Reports']} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Reports"
                  stroke="#6d28d9"
                  strokeWidth={2.5}
                  dot={{ fill: '#6d28d9', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-gray-200/80 bg-white/95 shadow-sm ring-1 ring-gray-900/[0.03]">
          <CardHeader className="space-y-1 border-b border-gray-100 bg-gradient-to-r from-white to-emerald-50/50 pb-4 pt-5">
            <CardTitle className="text-base font-semibold text-gray-900">User growth</CardTitle>
            <CardDescription>Last 7 days · cumulative registered users</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-2 pb-4 pt-4 sm:h-[320px] sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.userGrowth} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_MUTED} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Users']} />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke={BRAND}
                  strokeWidth={2.5}
                  dot={{ fill: BRAND, strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bar charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-gray-200/80 bg-white/95 shadow-sm ring-1 ring-gray-900/[0.03]">
          <CardHeader className="space-y-1 border-b border-gray-100 pb-4 pt-5">
            <CardTitle className="text-base font-semibold text-gray-900">Reports by category</CardTitle>
            <CardDescription>Volume by complaint type</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-2 pb-4 pt-2 sm:h-[320px] sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.reportsByCategory} margin={{ top: 12, right: 8, left: -12, bottom: 48 }}>
                <CartesianGrid stroke={CHART_MUTED} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={axisTick}
                  tickFormatter={(v) => getFormalComplaintCategoryLabel(String(v))}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={56}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, _n, p) => [
                    v,
                    getFormalComplaintCategoryLabel(String(p?.payload?.category ?? '')),
                  ]}
                />
                <Bar dataKey="count" name="Reports" radius={[6, 6, 0, 0]}>
                  {data.reportsByCategory.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-gray-200/80 bg-white/95 shadow-sm ring-1 ring-gray-900/[0.03]">
          <CardHeader className="space-y-1 border-b border-gray-100 pb-4 pt-5">
            <CardTitle className="text-base font-semibold text-gray-900">Reports by status</CardTitle>
            <CardDescription>Pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-2 pb-4 pt-2 sm:h-[320px] sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.reportsByStatus} margin={{ top: 12, right: 8, left: -12, bottom: 48 }}>
                <CartesianGrid stroke={CHART_MUTED} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={axisTick}
                  tickFormatter={(v) => formatStatusLabel(String(v))}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={56}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, _n, p) => [v, formatStatusLabel(String(p?.payload?.status ?? ''))]}
                />
                <Bar dataKey="count" name="Reports" radius={[6, 6, 0, 0]}>
                  {data.reportsByStatus.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Footer summary strip */}
      <Card className="border-gray-200/80 bg-white/90 shadow-sm ring-1 ring-gray-900/[0.02]">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-600">
            <div>
              <span className="font-medium text-gray-900">Period</span>
              <span className="mx-2 text-gray-300">·</span>
              Last 7 days
            </div>
            <div>
              <span className="font-medium text-gray-900">Categories</span>
              <span className="mx-2 text-gray-300">·</span>
              {data.reportsByCategory.length} types
            </div>
            <div>
              <span className="font-medium text-gray-900">Resolution</span>
              <span className="mx-2 text-gray-300">·</span>
              {resolutionPct}%
            </div>
          </div>
          <p className="text-xs text-gray-400">Data reflects the live reports collection.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
