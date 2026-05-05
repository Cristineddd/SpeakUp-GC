/**
 * Compliance Report Viewer Component
 * Displays generated compliance reports with charts and detailed breakdowns
 */

import React, { type JSX } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  ComplianceSummaryReport,
  FrequencyAnalysis,
  TrendAnalysis,
  ResolutionTimeAnalysis,
  HandlerPerformanceAnalysis,
} from '../../types/complianceReport';
import { format } from 'date-fns';

interface ComplianceReportViewerProps {
  report: ComplianceSummaryReport;
}

export const ComplianceReportViewer: React.FC<ComplianceReportViewerProps> = ({ report }) => {
  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600 bg-red-50';
      case 'decreasing':
        return 'text-green-600 bg-green-50';
      case 'stable':
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Compliance Report</CardTitle>
              <CardDescription>
                Generated on {format(report.generatedAt, 'PPpp')}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Period</div>
              <div className="font-medium">
                {format(report.period.start, 'MMM dd, yyyy')} -{' '}
                {format(report.period.end, 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-900">
                {report.summary.totalIncidents}
              </div>
              <div className="text-sm text-blue-600 mt-1">Total Incidents</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-900">
                {report.summary.resolvedIncidents}
              </div>
              <div className="text-sm text-green-600 mt-1">Resolved</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-900">
                {report.summary.inProgressIncidents}
              </div>
              <div className="text-sm text-yellow-600 mt-1">In Progress</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-3xl font-bold text-orange-900">
                {report.summary.pendingIncidents}
              </div>
              <div className="text-sm text-orange-600 mt-1">Pending</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl font-bold text-purple-900">
                {report.summary.resolutionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-purple-600 mt-1">Resolution Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Analytics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Key Analytics & Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Average Resolution Time */}
            {report.summary.averageResolutionTime && (
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="text-sm text-indigo-600 font-medium">Avg Resolution Time</div>
                <div className="text-2xl font-bold text-indigo-900 mt-1">
                  {Math.round(report.summary.averageResolutionTime)} hrs
                </div>
              </div>
            )}
            
            {/* Cases per Day */}
            <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
              <div className="text-sm text-cyan-600 font-medium">Cases/Day Avg</div>
              <div className="text-2xl font-bold text-cyan-900 mt-1">
                {(report.summary.totalIncidents / Math.max(1, Math.ceil((new Date(report.period.end).getTime() - new Date(report.period.start).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)}
              </div>
            </div>

            {/* Dismissed Rate */}
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="text-sm text-rose-600 font-medium">Dismissed Rate</div>
              <div className="text-2xl font-bold text-rose-900 mt-1">
                {report.summary.totalIncidents > 0 ? ((report.summary.dismissedIncidents / report.summary.totalIncidents) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
            <div className="font-semibold text-blue-900 mb-2">📈 Key Insights:</div>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>✓ {report.summary.resolvedIncidents} incidents resolved ({report.summary.resolutionRate.toFixed(1)}% success rate)</li>
              <li>✓ {report.summary.inProgressIncidents} cases currently under investigation</li>
              <li>✓ {report.summary.pendingIncidents} cases awaiting review or assignment</li>
              {report.handlerPerformanceAnalysis && report.handlerPerformanceAnalysis.handlers.length > 0 && (
                <li>✓ {report.handlerPerformanceAnalysis.handlers.length} active case handlers assigned to incidents</li>
              )}
            </ul>
          </div>

          {/* Data Privacy Badge */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              {report.anonymized ? '🔒 Data anonymized' : '👤 Personal data included'} • GDPR Compliant
            </span>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="frequency" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {report.frequencyAnalysis && <TabsTrigger value="frequency">Frequency</TabsTrigger>}
          {report.trendAnalysis && <TabsTrigger value="trends">Trends</TabsTrigger>}
          {report.resolutionTimeAnalysis && <TabsTrigger value="resolution">Resolution Time</TabsTrigger>}
          {report.handlerPerformanceAnalysis && <TabsTrigger value="handlers">Handlers</TabsTrigger>}
        </TabsList>

        {/* Frequency Analysis Tab */}
        {report.frequencyAnalysis && (
          <TabsContent value="frequency" className="space-y-6">
            <FrequencyAnalysisView analysis={report.frequencyAnalysis} />
          </TabsContent>
        )}

        {/* Trend Analysis Tab */}
        {report.trendAnalysis && (
          <TabsContent value="trends" className="space-y-6">
            <TrendAnalysisView analysis={report.trendAnalysis} getTrendIcon={getTrendIcon} getTrendColor={getTrendColor} />
          </TabsContent>
        )}

        {/* Resolution Time Tab */}
        {report.resolutionTimeAnalysis && (
          <TabsContent value="resolution" className="space-y-6">
            <ResolutionTimeView analysis={report.resolutionTimeAnalysis} />
          </TabsContent>
        )}

        {/* Handler Performance Tab */}
        {report.handlerPerformanceAnalysis && (
          <TabsContent value="handlers" className="space-y-6">
            <HandlerPerformanceView analysis={report.handlerPerformanceAnalysis} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// Frequency Analysis View
const FrequencyAnalysisView: React.FC<{ analysis: FrequencyAnalysis }> = ({ analysis }) => {
  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <>
      {/* By Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Incidents by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.byCategory.map((item) => (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{item.category}</span>
                  {getTrendIcon(item.trend)}
                </div>
                <div className="text-right">
                  <span className="font-bold">{item.count}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By Severity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Incidents by Severity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.bySeverity.map((item) => (
            <div key={item.severity}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium capitalize">{item.severity}</span>
                <div className="text-right">
                  <span className="font-bold">{item.count}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Top Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.byLocation.slice(0, 5).map((item) => (
            <div key={item.location}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.location}</span>
                <div className="text-right">
                  <span className="font-bold">{item.count}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By Time of Day */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Incidents by Time of Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((period) => {
              const periodData = analysis.byTimeOfDay.filter((t) => t.period === period);
              const count = periodData.reduce((sum, t) => sum + t.count, 0);
              return (
                <div key={period} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600">{period}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Trend Analysis View
const TrendAnalysisView: React.FC<{
  analysis: TrendAnalysis;
  getTrendIcon: (trend: any) => JSX.Element;
  getTrendColor: (trend: any) => string;
}> = ({ analysis, getTrendIcon, getTrendColor }) => {
  return (
    <>
      {/* Overall Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div>
              <div className="text-4xl font-bold mb-2">
                {analysis.overallTrend.currentPeriodCount}
              </div>
              <div className="text-sm text-gray-600">Current Period Incidents</div>
              <div className="text-xs text-gray-500 mt-1">
                Previous: {analysis.overallTrend.previousPeriodCount}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={getTrendColor(analysis.overallTrend.direction)}>
                {getTrendIcon(analysis.overallTrend.direction)}
                <span className="ml-1">
                  {Math.abs(analysis.overallTrend.percentageChange).toFixed(1)}%
                </span>
              </Badge>
              <div className="text-sm text-gray-600 mt-2 capitalize">
                {analysis.overallTrend.direction}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Category Trends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.categoryTrends.map((trend) => (
            <div key={trend.category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium capitalize">{trend.category}</span>
              <Badge variant="outline" className={getTrendColor(trend.trend)}>
                {getTrendIcon(trend.trend)}
                <span className="ml-1">{Math.abs(trend.percentageChange).toFixed(1)}%</span>
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};

// Resolution Time View
const ResolutionTimeView: React.FC<{ analysis: ResolutionTimeAnalysis }> = ({ analysis }) => {
  return (
    <>
      {/* Average Times */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Time Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-blue-50 rounded-lg text-center">
              <div className="text-4xl font-bold text-blue-900">
                {analysis.averageResolutionTime.toFixed(1)}h
              </div>
              <div className="text-sm text-blue-600 mt-2">Average Resolution Time</div>
            </div>
            <div className="p-6 bg-green-50 rounded-lg text-center">
              <div className="text-4xl font-bold text-green-900">
                {analysis.medianResolutionTime.toFixed(1)}h
              </div>
              <div className="text-sm text-green-600 mt-2">Median Resolution Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span>Compliance Rate</span>
                <span className="font-bold text-green-600">
                  {analysis.slaCompliance.complianceRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={analysis.slaCompliance.complianceRate} className="h-3" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{analysis.slaCompliance.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{analysis.slaCompliance.withinSLA}</div>
                <div className="text-xs text-green-600">Within SLA</div>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{analysis.slaCompliance.breachedSLA}</div>
                <div className="text-xs text-red-600">Breached</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Handler Performance View
const HandlerPerformanceView: React.FC<{ analysis: HandlerPerformanceAnalysis }> = ({ analysis }) => {
  return (
    <>
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Handler Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <div className="text-4xl font-bold text-blue-900">{analysis.totalHandlers}</div>
            <div className="text-sm text-blue-600 mt-2">Active Handlers</div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.topPerformers.map((performer, idx) => (
            <div key={`${performer.handlerId}-${idx}`} className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white">#{idx + 1}</Badge>
                <div>
                  <div className="font-medium">{performer.handlerName}</div>
                  <div className="text-sm text-gray-600">{performer.metric}</div>
                </div>
              </div>
              <div className="font-bold text-green-600">
                {performer.metric.includes('Rate') || performer.metric.includes('Compliance')
                  ? `${performer.value.toFixed(1)}%`
                  : `${performer.value.toFixed(1)}h`}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All Handlers */}
      <Card>
        <CardHeader>
          <CardTitle>Handler Performance Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.handlers.map((handler) => (
            <div key={handler.handlerId} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{handler.handlerName}</div>
                  <div className="text-sm text-gray-600">{handler.handlerRole}</div>
                </div>
                <Badge variant="outline">
                  {handler.resolutionRate.toFixed(1)}% Resolution
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center text-sm">
                <div>
                  <div className="font-bold">{handler.casesAssigned}</div>
                  <div className="text-gray-600">Assigned</div>
                </div>
                <div>
                  <div className="font-bold text-green-600">{handler.casesResolved}</div>
                  <div className="text-gray-600">Resolved</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{handler.casesInProgress}</div>
                  <div className="text-gray-600">In Progress</div>
                </div>
                <div>
                  <div className="font-bold">{handler.averageResolutionTime.toFixed(1)}h</div>
                  <div className="text-gray-600">Avg Time</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};
