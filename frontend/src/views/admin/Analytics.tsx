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
  FileBarChart,
  TrendingUp,
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
    <div className="w-full space-y-8 pb-10">
      {/* Header Banner */}
      <div className="relative rounded-xl border-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-6 py-6 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-2">
              <BarChart3 className="h-4 w-4 text-white" />
              <p className="text-xs font-bold uppercase tracking-wider text-white">Insights</p>
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Analytics</h1>
            <p className="text-sm text-white/90 font-medium mt-1">
              Live metrics from reports and users. Charts cover the last seven days.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs text-white/90 shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="font-medium">Updated {format(new Date(), 'MMM d, yyyy · h:mm a')}</span>
          </div>
        </div>
      </div>

      {/* Summary Info Bar */}
      <div className="rounded-lg border bg-white shadow-sm p-4">
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
            <span className="font-medium text-gray-900">Resolution Rate</span>
            <span className="mx-2 text-gray-300">·</span>
            {resolutionPct}%
          </div>
          <div className="ml-auto text-xs text-gray-400">Data reflects the live reports collection</div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Active today',
            value: data.dailyActiveUsers,
            hint: 'Users who submitted a report today',
            icon: Users,
            gradient: 'from-emerald-500 to-teal-500',
          },
          {
            label: 'Total reports',
            value: data.totalReports,
            hint: 'All-time submissions',
            icon: FileText,
            gradient: 'from-green-500 to-emerald-600',
          },
          {
            label: 'Resolved',
            value: data.resolvedReports,
            hint: data.totalReports > 0 ? `${resolutionPct}% of all reports` : 'No reports yet',
            icon: CheckCircle2,
            gradient: 'from-lime-500 to-green-500',
          },
          {
            label: 'Avg. resolve time',
            value: `${data.averageResponseTime}h`,
            hint: 'Mean hours from report to resolution',
            icon: Timer,
            gradient: 'from-teal-500 to-emerald-500',
          },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${kpi.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <kpi.icon className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{kpi.label}</p>
                <p className="text-5xl font-black text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-500 font-medium">{kpi.hint}</p>
              </div>
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
            {data.totalReports === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No reports submitted in this period</p>
                <p className="text-xs mt-1">Chart will appear once reports are submitted</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-gray-200/80 bg-white/95 shadow-sm ring-1 ring-gray-900/[0.03]">
          <CardHeader className="space-y-1 border-b border-gray-100 bg-gradient-to-r from-white to-emerald-50/50 pb-4 pt-5">
            <CardTitle className="text-base font-semibold text-gray-900">User growth</CardTitle>
            <CardDescription>Last 7 days · cumulative registered users</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-2 pb-4 pt-4 sm:h-[320px] sm:px-4">
            {data.userGrowth.length === 0 || data.userGrowth.every(d => d.users === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Users className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No user data available</p>
                <p className="text-xs mt-1">Chart will appear once users register</p>
              </div>
            ) : (
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
            )}
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
            {data.reportsByCategory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FileBarChart className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No data yet</p>
                <p className="text-xs mt-1">Charts will appear once reports are submitted</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-gray-200/80 bg-white/95 shadow-sm ring-1 ring-gray-900/[0.03]">
          <CardHeader className="space-y-1 border-b border-gray-100 pb-4 pt-5">
            <CardTitle className="text-base font-semibold text-gray-900">Reports by status</CardTitle>
            <CardDescription>Pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-2 pb-4 pt-2 sm:h-[320px] sm:px-4">
            {data.reportsByStatus.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No data yet</p>
                <p className="text-xs mt-1">Charts will appear once reports are submitted</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
