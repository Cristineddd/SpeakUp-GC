import React, { useEffect, useState } from 'react';
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from 'date-fns';

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
    totalUsers: 0,
    totalReports: 0,
    activeCases: 0,
    casesWithDecision: 0,
  });
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users count
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    });

    // Fetch reports
    const reportsQuery = query(collection(db, 'complaints'));
    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setStats(prev => ({
        ...prev,
        totalReports: reports.length,
        activeCases: reports.filter((r: any) => r.status === 'pending' || r.status === 'inProgress').length,
        casesWithDecision: reports.filter((r: any) => r.status === 'resolved').length,
      }));

      // Get active cases for table
      const active = reports
        .filter((r: any) => r.status === 'pending' || r.status === 'inProgress')
        .slice(0, 5);
      setActiveCases(active);

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
      unsubUsers();
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
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Admin Overview</p>
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Top Metrics - 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend="+11%"
          onClick={() => navigate('/admin/users')}
        />
        <MetricCard
          title="Total Reports"
          value={stats.totalReports}
          icon={FileText}
          trend="+100%"
          onClick={() => navigate('/admin/reports')}
        />
        <MetricCard
          title="Active Cases"
          value={stats.activeCases}
          icon={ShieldAlert}
          trend="0%"
        />
        <MetricCard
          title="Cases with Decision"
          value={stats.casesWithDecision}
          icon={CheckCircle}
          trend="0%"
          onClick={() => navigate('/admin/closed-cases')}
        />
      </div>

      {/* Middle Section - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Recent Complaints + Monthly Reports */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recent Complaints - Moved here */}
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
                  <div className="space-y-3">
                    {activeCases.map((case_: any) => (
                      <div
                        key={case_.id}
                        className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => navigate(`/admin/reports?reportId=${case_.id}`)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate mb-1">
                              {case_.title || case_.description?.substring(0, 50) || 'Untitled'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{case_.type || 'General'}</span>
                              <span>•</span>
                              <span>{case_.isAnonymous ? 'Anonymous' : case_.complainantName}</span>
                              <span>•</span>
                              <span>{case_.createdAt?.toDate ? format(case_.createdAt.toDate(), 'MMM dd') : 'N/A'}</span>
                            </div>
                          </div>
                          {getStatusBadge(case_.status)}
                        </div>
                      </div>
                    ))}
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

        {/* Right Column - Calendar + Hearings */}
        <div className="lg:col-span-3 space-y-6">
          {/* Mini Calendar */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {daysInMonth.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={i}
                      className={`
                        text-center text-sm py-2 rounded-lg cursor-pointer transition-colors
                        ${isToday 
                          ? 'font-bold text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                      style={isToday ? { backgroundColor: COLORS.primary } : {}}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-center group"
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <UserPlus className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Manage Users</p>
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-center group"
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <BarChart3 className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">View Reports</p>
            </button>
            <button
              onClick={() => navigate('/admin/closed-cases')}
              className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-center group"
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <Archive className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Archive Cases</p>
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
              <p className="text-sm font-semibold text-gray-900">Generate Compliance Report</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardRedesign;
