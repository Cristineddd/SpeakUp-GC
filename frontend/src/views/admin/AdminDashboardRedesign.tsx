import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Users,
  User,
  FileText,
  ShieldAlert,
  CheckCircle,
  TrendingUp,
  UserPlus,
  BarChart3,
  Archive,
  FileCheck,
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from '../../compat/router';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, formatDistanceToNow } from 'date-fns';

// Green theme colors
const COLORS = {
  primary: '#1D9E75',
  primaryLight: '#E1F5EE',
  success: '#10B981',
  warning: '#F59E0B',
  gray: '#6B7280',
};

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, trend, onClick }) => {
  return (
    <Card 
      className={`bg-white border-0 shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS.primaryLight }}>
            <Icon className="h-5 w-5" style={{ color: COLORS.primary }} />
          </div>
          {trend && (
            <Badge 
              className="px-2 py-0.5 text-xs font-semibold border-0"
              style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primary }}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">vs. last 30 days</p>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminDashboardRedesign = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingCases: 0,
    underInvestigation: 0,
    decisionMade: 0,
  });
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [needsAttention, setNeedsAttention] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [keyMetrics, setKeyMetrics] = useState({
    resolutionRate: 0,
    avgResolutionTime: 0,
    overdueCases: 0,
    followUpRequests: 0,
  });
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

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
    // Fetch reports
    const reportsQuery = query(collection(db, 'complaints'));
    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStats({
        totalReports: reports.length,
        pendingCases: reports.filter((r: any) => r.status === 'pending' || r.status === 'submitted').length,
        underInvestigation: reports.filter((r: any) => r.status === 'inProgress' || r.status === 'investigating').length,
        decisionMade: reports.filter((r: any) => r.status === 'resolved' || r.status === 'dismissed').length,
      });

      // Get active cases for table
      const active = reports
        .filter((r: any) => r.status === 'pending' || r.status === 'inProgress')
        .slice(0, 5);
      setActiveCases(active);

      // Calculate cases needing attention (no update for 3+ days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const attention = reports
        .filter((r: any) => {
          const lastUpdate = r.updatedAt?.toDate() || r.createdAt?.toDate();
          return (
            (r.status === 'pending' || r.status === 'inProgress' || r.status === 'submitted') &&
            lastUpdate &&
            lastUpdate < threeDaysAgo
          );
        })
        .slice(0, 5);
      setNeedsAttention(attention);

      // Calculate upcoming deadlines
      const now = new Date();
      const deadlines = reports
        .filter((r: any) => r.status === 'pending' || r.status === 'submitted' || r.status === 'inProgress')
        .map((r: any) => {
          const createdAt = r.createdAt?.toDate() || new Date();
          const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          const deadlineDays = 7; // 7-day response deadline
          const daysUntilDeadline = deadlineDays - daysSinceCreation;

          return {
            ...r,
            daysUntilDeadline,
            isOverdue: daysUntilDeadline < 0,
            isUrgent: daysUntilDeadline <= 2 && daysUntilDeadline >= 0,
          };
        })
        .filter((r: any) => r.daysUntilDeadline <= 3)
        .sort((a: any, b: any) => a.daysUntilDeadline - b.daysUntilDeadline)
        .slice(0, 5);
      setUpcomingDeadlines(deadlines);

      // Calculate key metrics
      const resolvedCases = reports.filter((r: any) => r.status === 'resolved' || r.status === 'dismissed');
      const totalClosed = resolvedCases.length;
      const totalCases = reports.length;
      const resolutionRate = totalCases > 0 ? Math.round((totalClosed / totalCases) * 100) : 0;

      // Calculate average resolution time (in days)
      let totalResolutionTime = 0;
      resolvedCases.forEach((r: any) => {
        const createdAt = r.createdAt?.toDate();
        const updatedAt = r.updatedAt?.toDate();
        if (createdAt && updatedAt) {
          totalResolutionTime += (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        }
      });
      const avgResolutionTime = totalClosed > 0 ? (totalResolutionTime / totalClosed).toFixed(1) : 0;

      // Calculate overdue cases (cases past 7-day deadline)
      const overdueCases = reports.filter((r: any) => {
        const createdAt = r.createdAt?.toDate();
        if (!createdAt) return false;
        const daysSinceCreation = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return (r.status === 'pending' || r.status === 'submitted' || r.status === 'inProgress') && daysSinceCreation > 7;
      }).length;

      // Follow-up requests (simulated - in real system, this would be a separate field)
      const followUpRequests = needsAttention.length;

      setKeyMetrics({
        resolutionRate,
        avgResolutionTime: Number(avgResolutionTime),
        overdueCases,
        followUpRequests,
      });

      // Calculate category distribution
      const categories: Record<string, number> = {};
      reports.forEach((r: any) => {
        const type = r.type || 'Others';
        categories[type] = (categories[type] || 0) + 1;
      });
      const categoryData = Object.entries(categories).map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / reports.length) * 100),
      })).sort((a, b) => b.value - a.value);
      setCategoryDistribution(categoryData);

      // Calculate status distribution
      const statuses: Record<string, number> = {};
      reports.forEach((r: any) => {
        const status = r.status || 'Unknown';
        statuses[status] = (statuses[status] || 0) + 1;
      });
      const statusData = Object.entries(statuses).map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / reports.length) * 100),
      })).sort((a, b) => b.value - a.value);
      setStatusDistribution(statusData);

      // Calculate monthly data
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthReports = reports.filter((r: any) => {
          const createdAt = r.createdAt?.toDate();
          return createdAt >= monthStart && createdAt <= monthEnd;
        });

        return {
          month: format(date, 'MMM'),
          harassment: monthReports.filter((r: any) => r.type?.toLowerCase().includes('harassment')).length,
          bullying: monthReports.filter((r: any) => r.type?.toLowerCase().includes('bullying')).length,
          others: monthReports.filter((r: any) => 
            !r.type?.toLowerCase().includes('harassment') && 
            !r.type?.toLowerCase().includes('bullying')
          ).length,
        };
      });
      
      setMonthlyData(last6Months);
      setLoading(false);
    });

    return () => {
      unsubReports();
    };
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'inProgress') {
      return <Badge className="bg-amber-100 text-amber-800 border-0 font-medium">In Progress</Badge>;
    }
    if (status === 'resolved') {
      return <Badge className="bg-green-100 text-green-800 border-0 font-medium">Decision Made</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700 border-0 font-medium">Pending</Badge>;
  };

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div 
            className="h-12 w-12 animate-spin rounded-full border-[3px] border-gray-200 mx-auto mb-4"
            style={{ borderTopColor: COLORS.primary }}
          />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Admin Overview</p>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide case management and analytics overview</p>
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

      {/* Top Metrics - 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Reports"
          value={stats.totalReports}
          icon={FileText}
          trend="+100%"
          onClick={() => navigate('/admin/reports')}
        />
        <MetricCard
          title="Pending Cases"
          value={stats.pendingCases}
          icon={Clock}
          trend="0%"
          onClick={() => navigate('/admin/reports?status=pending')}
        />
        <MetricCard
          title="Under Investigation"
          value={stats.underInvestigation}
          icon={ShieldAlert}
          trend="0%"
          onClick={() => navigate('/admin/reports?status=inProgress')}
        />
        <MetricCard
          title="Decision Made"
          value={stats.decisionMade}
          icon={CheckCircle}
          trend="0%"
          onClick={() => navigate('/admin/closed-cases')}
        />
      </div>

      {/* Needs Attention Widget */}
      {needsAttention.length > 0 && (
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-900">Reports Needing Follow-Up</p>
                  <p className="text-xs text-red-700">{needsAttention.length} cases with no update for 3+ days</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/admin/reports')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS.primaryLight }}>
                <CheckCircle className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Case Resolution Rate</p>
                <p className="text-2xl font-bold text-gray-900">{keyMetrics.resolutionRate}%</p>
                <p className="text-xs text-gray-500 mt-0.5">Resolved / Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS.primaryLight }}>
                <Clock className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Avg Resolution Time</p>
                <p className="text-2xl font-bold text-gray-900">{keyMetrics.avgResolutionTime}d</p>
                <p className="text-xs text-gray-500 mt-0.5">Days to resolve</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Overdue Cases</p>
                <p className="text-2xl font-bold text-gray-900">{keyMetrics.overdueCases}</p>
                <p className="text-xs text-gray-500 mt-0.5">Past 7-day deadline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Follow-Up Requests</p>
                <p className="text-2xl font-bold text-gray-900">{keyMetrics.followUpRequests}</p>
                <p className="text-xs text-gray-500 mt-0.5">Needing attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Recent Complaints + Monthly Reports */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recent Complaints - Mini-table format */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Recent Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              {activeCases.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active cases</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {activeCases.map((case_: any) => {
                      const createdAt = case_.createdAt?.toDate();
                      const timeAgo = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'N/A';
                      return (
                        <div
                          key={case_.id}
                          className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => navigate(`/admin/reports?reportId=${case_.id}`)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate mb-1">
                                {case_.title || case_.description?.substring(0, 40) || 'Untitled'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {case_.type || 'General'} • {timeAgo}
                              </p>
                            </div>
                            {getStatusBadge(case_.status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => navigate('/admin/reports')}
                    className="w-full mt-4 pt-4 border-t flex items-center justify-center gap-2 text-sm font-medium hover:text-gray-900 transition-colors"
                    style={{ color: COLORS.primary }}
                  >
                    View all complaints
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Monthly Reports Chart */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Monthly Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData
                  .filter(data => (data.harassment + data.bullying + data.others) > 0)
                  .map((data, index) => {
                    const total = data.harassment + data.bullying + data.others;
                    
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-700 w-8">{data.month}</span>
                          <span className="text-xs text-gray-500">{total} total</span>
                        </div>
                        <div className="flex gap-0.5 h-10 bg-gray-100 rounded overflow-hidden">
                          {data.harassment > 0 && (
                            <div
                              className="transition-all hover:opacity-80"
                              style={{
                                width: `${(data.harassment / total) * 100}%`,
                                backgroundColor: '#059669',
                              }}
                              title={`Sexual Harassment: ${data.harassment}`}
                            />
                          )}
                          {data.bullying > 0 && (
                            <div
                              className="transition-all hover:opacity-80"
                              style={{
                                width: `${(data.bullying / total) * 100}%`,
                                backgroundColor: '#10B981',
                              }}
                              title={`Bullying: ${data.bullying}`}
                            />
                          )}
                          {data.others > 0 && (
                            <div
                              className="transition-all hover:opacity-80"
                              style={{
                                width: `${(data.others / total) * 100}%`,
                                backgroundColor: '#34D399',
                              }}
                              title={`Others: ${data.others}`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                }
                {monthlyData.filter(d => (d.harassment + d.bullying + d.others) > 0).length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No reports yet</p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#059669' }} />
                  <span className="text-gray-600">Sexual Harassment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                  <span className="text-gray-600">Bullying</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#34D399' }} />
                  <span className="text-gray-600">Others</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Case Trends */}
        <div className="lg:col-span-5">
          {/* Case Trends Line Chart */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Case Trends</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Monthly case submissions over the last 6 months</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2 pb-8 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400">
                  {[10, 8, 6, 4, 2, 0].map((val) => (
                    <span key={val}>{val}</span>
                  ))}
                </div>
                
                {/* Chart area */}
                <div className="flex-1 ml-8 h-full relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="border-t border-gray-100" />
                    ))}
                  </div>

                  {/* Line chart */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: COLORS.primary, stopOpacity: 0.2 }} />
                        <stop offset="100%" style={{ stopColor: COLORS.primary, stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                    
                    {monthlyData.length > 0 && (
                      <>
                        {/* Area under line */}
                        <path
                          d={`
                            M 0,${240 - (monthlyData[0].harassment + monthlyData[0].bullying + monthlyData[0].others) * 24}
                            ${monthlyData.map((data, i) => {
                              const total = data.harassment + data.bullying + data.others;
                              const x = (i / (monthlyData.length - 1)) * 100;
                              const y = 240 - total * 24;
                              return `L ${x}%,${y}`;
                            }).join(' ')}
                            L 100%,240 L 0,240 Z
                          `}
                          fill="url(#lineGradient)"
                        />
                        
                        {/* Line */}
                        <polyline
                          points={monthlyData.map((data, i) => {
                            const total = data.harassment + data.bullying + data.others;
                            const x = (i / (monthlyData.length - 1)) * 100;
                            const y = 240 - total * 24;
                            return `${x}%,${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke={COLORS.primary}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Data points */}
                        {monthlyData.map((data, i) => {
                          const total = data.harassment + data.bullying + data.others;
                          const x = (i / (monthlyData.length - 1)) * 100;
                          const y = 240 - total * 24;
                          return (
                            <g key={i}>
                              <circle
                                cx={`${x}%`}
                                cy={y}
                                r="5"
                                fill="white"
                                stroke={COLORS.primary}
                                strokeWidth="2"
                              />
                              <circle
                                cx={`${x}%`}
                                cy={y}
                                r="3"
                                fill={COLORS.primary}
                              />
                            </g>
                          );
                        })}
                      </>
                    )}
                  </svg>

                  {/* X-axis labels */}
                  <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-500">
                    {monthlyData.map((data, i) => (
                      <span key={i} className="text-center">{data.month}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.primary }} />
                  <span className="text-xs text-gray-600">Total Cases</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Peak: {Math.max(...monthlyData.map(d => d.harassment + d.bullying + d.others))} cases</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Upcoming Deadlines */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upcoming Deadlines */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Cases requiring immediate attention</p>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No urgent deadlines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((deadline: any) => (
                    <div
                      key={deadline.id}
                      className="p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all"
                      style={{
                        borderColor: deadline.isOverdue ? '#FECACA' : deadline.isUrgent ? '#FDE68A' : '#E5E7EB',
                        backgroundColor: deadline.isOverdue ? '#FEF2F2' : deadline.isUrgent ? '#FFFBEB' : 'white',
                      }}
                      onClick={() => navigate(`/admin/reports?reportId=${deadline.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate mb-1">
                            Report #{deadline.id.slice(-3)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {deadline.title || deadline.description?.substring(0, 30) || 'Untitled'}
                          </p>
                        </div>
                        <Badge
                          className={`text-[10px] font-medium border-0 ${
                            deadline.isOverdue
                              ? 'bg-red-500 text-white'
                              : deadline.isUrgent
                              ? 'bg-amber-500 text-white'
                              : 'bg-green-500 text-white'
                          }`}
                        >
                          {deadline.isOverdue
                            ? `Overdue by ${Math.abs(deadline.daysUntilDeadline)}d`
                            : deadline.daysUntilDeadline === 0
                            ? 'Due Today'
                            : deadline.daysUntilDeadline === 1
                            ? 'Due Tomorrow'
                            : `${deadline.daysUntilDeadline} days`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Visual Analytics - Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reports by Category */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Reports by Category</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Distribution of complaint types</p>
          </CardHeader>
          <CardContent>
            {categoryDistribution.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryDistribution.map((cat, index) => {
                  const colors = ['#1D9E75', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];
                  const color = colors[index % colors.length];
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                        <span className="text-xs text-gray-500">{cat.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports by Status */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Reports by Status</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Current case status distribution</p>
          </CardHeader>
          <CardContent>
            {statusDistribution.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statusDistribution.map((stat, index) => {
                  const statusColors: Record<string, string> = {
                    pending: '#F59E0B',
                    submitted: '#F59E0B',
                    inProgress: '#3B82F6',
                    investigating: '#3B82F6',
                    resolved: '#10B981',
                    dismissed: '#EF4444',
                  };
                  const color = statusColors[stat.name.toLowerCase()] || '#6B7280';
                  return (
                    <div key={stat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 capitalize">
                          {stat.name.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{stat.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${stat.percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/reports')}
              className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-center group"
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <UserPlus className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Assign Case</p>
            </button>
            <button
              onClick={() => navigate('/admin/compliance-reports')}
              className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-center group"
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <FileCheck className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Generate Report</p>
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-center group"
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <ShieldAlert className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">View Escalations</p>
            </button>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-center group"
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <BarChart3 className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Export Analytics</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardRedesign;
