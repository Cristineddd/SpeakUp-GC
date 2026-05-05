import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { AdminReportService, AdminReport } from '../../services/adminReportService';

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

  // Calculate actual response time for reports
  const calculateResponseTime = (reports: AdminReport[]): number => {
    const resolvedReports = reports.filter(report => 
      report.status === 'resolved' && report.reportedAt && report.lastUpdated
    );

    if (resolvedReports.length === 0) return 0;

    const totalHours = resolvedReports.reduce((total, report) => {
      try {
        const reportedAt = new Date(report.reportedAt);
        const updatedAt = new Date(report.lastUpdated);
        
        const diffHours = (updatedAt.getTime() - reportedAt.getTime()) / (1000 * 60 * 60);
        return total + Math.max(0, diffHours);
      } catch (error) {
        return total;
      }
    }, 0);

    return Math.round(totalHours / resolvedReports.length);
  };

  // Calculate daily active users (users who submitted reports today)
  const calculateDailyActiveUsers = (reports: AdminReport[]): number => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const todayReporters = new Set(
      reports
        .filter(report => {
          try {
            const reportedAt = new Date(report.reportedAt);
            return reportedAt >= todayStart && reportedAt <= todayEnd;
          } catch (error) {
            return false;
          }
        })
        .map(report => report.userId)
        .filter(Boolean)
    );

    return todayReporters.size;
  };

  // Calculate reports over time for last 7 days
  const calculateReportsOverTime = (reports: AdminReport[]) => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(date => {
      const dateStr = format(date, 'MM/dd');
      const count = reports.filter(report => {
        try {
          const reportedAt = new Date(report.reportedAt);
          return format(reportedAt, 'MM/dd') === dateStr;
        } catch (error) {
          return false;
        }
      }).length;

      return { date: dateStr, count };
    });
  };

  // Calculate user growth (users registered over time)
  const calculateUserGrowth = async (): Promise<Array<{ date: string; users: number }>> => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'asc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      }));

      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });

      let cumulativeUsers = 0;
      return last7Days.map(date => {
        const dateStr = format(date, 'MM/dd');
        
        // Count users registered on or before this date
        const usersOnDate = users.filter(user => {
          try {
            const userDate = user.createdAt;
            return userDate <= endOfDay(date);
          } catch (error) {
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

  // Calculate reports by category
  const calculateReportsByCategory = (reports: AdminReport[]) => {
    const categoryCount: Record<string, number> = {};
    
    reports.forEach(report => {
      const category = report.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Calculate reports by status
  const calculateReportsByStatus = (reports: AdminReport[]) => {
    const statusCount: Record<string, number> = {};
    
    reports.forEach(report => {
      const status = report.status || 'pending';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  };

  useEffect(() => {
    setLoading(true);
    console.log('📊 Analytics: Setting up real-time data listeners...');
    
    // Subscribe to real-time reports for accurate analytics
    const reportsUnsubscribe = AdminReportService.subscribeToAllReports(
      async (reports) => {
        try {
          console.log('📈 Analytics: Real-time reports update:', reports.length, 'reports');
          
          const totalReports = reports.length;
          const resolvedReports = reports.filter(report => report.status === 'resolved').length;
          const dailyActiveUsers = calculateDailyActiveUsers(reports);
          const averageResponseTime = calculateResponseTime(reports);
          const reportsOverTime = calculateReportsOverTime(reports);
          const userGrowth = await calculateUserGrowth();
          const reportsByCategory = calculateReportsByCategory(reports);
          const reportsByStatus = calculateReportsByStatus(reports);

          const analyticsData = {
            dailyActiveUsers,
            totalReports,
            resolvedReports,
            averageResponseTime,
            reportsOverTime,
            userGrowth,
            reportsByCategory,
            reportsByStatus,
          };

          console.log('✅ Analytics: Accurate data calculated:', {
            dailyActiveUsers,
            totalReports,
            resolvedReports,
            averageResponseTime: `${averageResponseTime}h`,
            reportsOverTimePeriod: `${reportsOverTime.length} days`,
            userGrowthPeriod: `${userGrowth.length} days`,
            categories: reportsByCategory.length,
            statuses: reportsByStatus.length
          });

          setData(analyticsData);
          setLoading(false);
        } catch (error) {
          console.error('❌ Analytics: Error processing real-time data:', error);
          setLoading(false);
        }
      }
    );

    // Cleanup function to unsubscribe from real-time listener
    return () => {
      console.log('🧹 Analytics: Cleaning up real-time listeners...');
      reportsUnsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.dailyActiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              Users who submitted reports today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              All time reports submitted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.resolvedReports}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalReports > 0 
                ? `${Math.round((data.resolvedReports / data.totalReports) * 100)}% resolution rate`
                : 'No reports'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageResponseTime}h</div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Reports Over Time (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.reportsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>User Growth (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Reports by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.reportsByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>Reports by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.reportsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <strong>Data Period:</strong> Last 7 Days
            </div>
            <div>
              <strong>Total Categories:</strong> {data.reportsByCategory.length}
            </div>
            <div>
              <strong>Resolution Rate:</strong> {data.totalReports > 0 
                ? `${Math.round((data.resolvedReports / data.totalReports) * 100)}%`
                : '0%'
              }
            </div>
            <div>
              <strong>Last Updated:</strong> {format(new Date(), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;