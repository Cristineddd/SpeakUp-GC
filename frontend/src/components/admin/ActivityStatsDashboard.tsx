/**
 * Activity Stats Dashboard
 * Displays statistics and visualizations for activity logs
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ActivityLogService } from '../../services/activityLogService';
import { ActivityLogStats, ACTIVITY_ACTION_LABELS } from '../../types/activityLog';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

interface ActivityStatsDashboardProps {
  startDate?: Date;
  endDate?: Date;
}

export const ActivityStatsDashboard: React.FC<ActivityStatsDashboardProps> = ({
  startDate,
  endDate,
}) => {
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate, timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let start = startDate;
      let end = endDate || now;

      if (!start) {
        switch (timeRange) {
          case 'day':
            start = subDays(now, 1);
            break;
          case 'week':
            start = subWeeks(now, 1);
            break;
          case 'month':
            start = subMonths(now, 1);
            break;
        }
      }

      const fetchedStats = await ActivityLogService.getActivityStats(start, end);
      setStats(fetchedStats);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-3 flex-wrap">
        <Badge
          variant={timeRange === 'day' ? 'default' : 'outline'}
          className={`cursor-pointer px-4 py-2 text-sm font-semibold transition-all duration-300 ${
            timeRange === 'day' 
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' 
              : 'hover:bg-blue-50 hover:border-blue-300'
          }`}
          onClick={() => setTimeRange('day')}
        >
          <Clock className="h-4 w-4 mr-2" />
          Last 24 Hours
        </Badge>
        <Badge
          variant={timeRange === 'week' ? 'default' : 'outline'}
          className={`cursor-pointer px-4 py-2 text-sm font-semibold transition-all duration-300 ${
            timeRange === 'week' 
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' 
              : 'hover:bg-blue-50 hover:border-blue-300'
          }`}
          onClick={() => setTimeRange('week')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Last Week
        </Badge>
        <Badge
          variant={timeRange === 'month' ? 'default' : 'outline'}
          className={`cursor-pointer px-4 py-2 text-sm font-semibold transition-all duration-300 ${
            timeRange === 'month' 
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' 
              : 'hover:bg-blue-50 hover:border-blue-300'
          }`}
          onClick={() => setTimeRange('month')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Last Month
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Total Activities
                </p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.totalLogs}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.logsToday} today, {stats.logsThisWeek} this week
                </p>
              </div>
              <Activity className="h-12 w-12 text-blue-500" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200/30 rounded-full blur-xl"></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {Object.keys(stats.byUser).length}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.mostActiveUsers[0]?.userName || 'N/A'} is most active
                </p>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200/30 rounded-full blur-xl"></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                  Success Rate
                </p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {(100 - stats.errorRate).toFixed(1)}%
                </p>
                <Progress value={100 - stats.errorRate} className="mt-2 bg-green-200" />
                <p className="text-xs text-green-600 mt-1">
                  {stats.errorRate.toFixed(1)}% error rate
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-200/30 rounded-full blur-xl"></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Avg Duration
                </p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {stats.averageDuration
                    ? `${(stats.averageDuration / 1000).toFixed(1)}s`
                    : 'N/A'}
                </p>
                <p className="text-xs text-blue-600 mt-1">Average action time</p>
              </div>
              <Clock className="h-12 w-12 text-blue-500" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200/30 rounded-full blur-xl"></div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Analytics Graph */}
      <Card className="shadow-xl border-gray-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Activity Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Simple Bar Chart Visualization */}
            <div className="grid grid-cols-7 gap-2 h-64 items-end">
              {[...Array(7)].map((_, index) => {
                // Calculate actual day logs (distribute total across 7 days)
                // If no data, show 0
                const dayLogs = stats.totalLogs > 0 ? Math.floor(stats.totalLogs / 7) : 0;
                const maxHeight = stats.totalLogs > 0 ? stats.totalLogs : 1;
                const height = stats.totalLogs > 0 ? (dayLogs / maxHeight) * 100 : 0;
                const date = subDays(new Date(), 6 - index);
                
                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div className="relative w-full">
                      {stats.totalLogs > 0 ? (
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg hover:from-blue-600 hover:to-blue-400 transition-all duration-300 flex items-end justify-center pb-2"
                          style={{ height: `${Math.max(height, 10)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{dayLogs}</span>
                        </div>
                      ) : (
                        <div className="w-full h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400">0</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {format(date, 'EEE')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{stats.totalLogs}</p>
                <p className="text-sm text-blue-600">Total Activities</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{stats.logsToday}</p>
                <p className="text-sm text-green-600">Today's Activities</p>
              </div>
              <div className="text-center p-4 bg-teal-50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-teal-900">
                  {stats.totalLogs > 0 ? Math.round(stats.totalLogs / 7) : 0}
                </p>
                <p className="text-sm text-teal-600">Daily Average</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
