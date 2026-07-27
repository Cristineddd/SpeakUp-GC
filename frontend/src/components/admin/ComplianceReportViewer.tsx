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
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CategoryBarChart } from '../charts/CategoryBarChart';
import { TrendLineChart, formatTrendCategoryLabel, TREND_CHART_COLORS } from '../charts/TrendLineChart';
import { MiniTrendSparkline } from '../charts/MiniTrendSparkline';
import { ResolutionBarChart } from '../charts/ResolutionBarChart';
import { HandlerPerformanceChart } from '../charts/HandlerPerformanceChart';
import { SeverityPieChart } from '../charts/SeverityPieChart';
import { ComplainantIdentityPieChart } from '../charts/ComplainantIdentityPieChart';
import { IdentityByCategoryChart } from '../charts/IdentityByCategoryChart';
import { FILING_IDENTITY_STYLES, type FilingIdentityLabel } from '../../constants/filingIdentity';
import { format } from 'date-fns';
import { ComplianceSummaryReport, FrequencyAnalysis, TrendAnalysis, ResolutionTimeAnalysis, HandlerPerformanceAnalysis } from '../../types/complianceReport';

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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="text-3xl font-bold text-green-900">
                {report.summary.totalIncidents || 0}
              </div>
              <div className="text-sm text-green-600 font-medium mt-1">Total Incidents</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
              <div className="text-3xl font-bold text-indigo-900">
                {report.summary.anonymousIncidents ?? 0}
              </div>
              <div className="text-sm text-indigo-600 font-medium mt-1 flex items-center gap-1">
                <EyeOff className="h-3.5 w-3.5" />
                Anonymous
              </div>
              <div className="text-xs text-indigo-500 mt-1">
                {(report.summary.anonymousRate ?? 0).toFixed(1)}% of filings
              </div>
            </div>
            <div className="p-5 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border border-teal-200">
              <div className="text-3xl font-bold text-teal-900">
                {report.summary.identifiedIncidents ?? 0}
              </div>
              <div className="text-sm text-teal-600 font-medium mt-1 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                Identified
              </div>
              <div className="text-xs text-teal-500 mt-1">
                {(report.summary.identifiedRate ?? 0).toFixed(1)}% of filings
              </div>
            </div>
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
              <div className="text-3xl font-bold text-emerald-900">
                {report.summary.resolvedIncidents || 0}
              </div>
              <div className="text-sm text-emerald-600 font-medium mt-1">Resolved</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
              <div className="text-3xl font-bold text-amber-900">
                {report.summary.inProgressIncidents || 0}
              </div>
              <div className="text-sm text-amber-600 font-medium mt-1">In Progress</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
              <div className="text-3xl font-bold text-orange-900">
                {report.summary.pendingIncidents || 0}
              </div>
              <div className="text-sm text-orange-600 font-medium mt-1">Pending</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200">
              <div className="text-3xl font-bold text-cyan-900">
                {report.summary.resolutionRate?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-cyan-600 font-medium mt-1">Resolution Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Analytics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Key Analytics & Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Average Resolution Time - Always show */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
              <div className="text-sm text-indigo-600 font-medium">Avg Resolution Time</div>
              <div className="text-2xl font-bold text-indigo-900 mt-1">
                {report.summary.averageResolutionTime ? Math.round(report.summary.averageResolutionTime) : 0} hrs
              </div>
            </div>
            
            {/* Cases per Day */}
            <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200">
              <div className="text-sm text-cyan-600 font-medium">Cases/Day Avg</div>
              <div className="text-2xl font-bold text-cyan-900 mt-1">
                {((report.summary.totalIncidents || 0) / Math.max(1, Math.ceil((new Date(report.period.end).getTime() - new Date(report.period.start).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)}
              </div>
            </div>

            {/* Dismissed Rate */}
            <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl border border-rose-200">
              <div className="text-sm text-rose-600 font-medium">Dismissed Rate</div>
              <div className="text-2xl font-bold text-rose-900 mt-1">
                {(report.summary.totalIncidents > 0 && report.summary.dismissedIncidents) ? ((report.summary.dismissedIncidents / report.summary.totalIncidents) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 space-y-2">
            <div className="font-semibold text-green-900 mb-2">Key Insights</div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-green-800">
              <li>{report.summary.resolvedIncidents || 0} incidents resolved ({report.summary.resolutionRate?.toFixed(1) || 0}% success rate)</li>
              <li>{report.summary.anonymousIncidents ?? 0} anonymous filings ({report.summary.anonymousRate?.toFixed(1) || 0}%) vs {report.summary.identifiedIncidents ?? 0} identified ({report.summary.identifiedRate?.toFixed(1) || 0}%)</li>
              <li>{report.summary.inProgressIncidents || 0} cases currently under investigation</li>
              <li>{report.summary.pendingIncidents || 0} cases awaiting review or assignment</li>
              {report.handlerPerformanceAnalysis && report.handlerPerformanceAnalysis.handlers && report.handlerPerformanceAnalysis.handlers.length > 0 && (
                <li>{report.handlerPerformanceAnalysis.handlers.length} active case handlers assigned to incidents</li>
              )}
            </ul>
          </div>

          {/* Data Privacy Badge */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              {report.anonymized ? 'Data anonymized' : 'Personal data included'} • GDPR Compliant
            </span>
          </div>
        </CardContent>
      </Card>
      {/* Analysis Included Badge */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Analyses Included:</span>
            {report.frequencyAnalysis && (
              <Badge className="bg-blue-600">
                <BarChart3 className="h-3 w-3 mr-1" />
                Frequency Analysis
              </Badge>
            )}
            {report.trendAnalysis && (
              <Badge className="bg-purple-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trend Analysis
              </Badge>
            )}
            {report.resolutionTimeAnalysis && (
              <Badge className="bg-amber-600">
                <Clock className="h-3 w-3 mr-1" />
                Resolution Metrics
              </Badge>
            )}
            {report.handlerPerformanceAnalysis && (
              <Badge className="bg-teal-600">
                <Users className="h-3 w-3 mr-1" />
                Staff Performance
              </Badge>
            )}
            {!report.frequencyAnalysis && !report.trendAnalysis && !report.resolutionTimeAnalysis && !report.handlerPerformanceAnalysis && (
              <span className="text-sm text-gray-500">Summary data only</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={report.frequencyAnalysis ? "frequency" : report.trendAnalysis ? "trends" : report.resolutionTimeAnalysis ? "resolution" : "handlers"} className="w-full">
        <TabsList className={`grid w-full ${
          [report.frequencyAnalysis, report.trendAnalysis, report.resolutionTimeAnalysis, report.handlerPerformanceAnalysis].filter(Boolean).length === 1 
            ? 'grid-cols-1' 
            : [report.frequencyAnalysis, report.trendAnalysis, report.resolutionTimeAnalysis, report.handlerPerformanceAnalysis].filter(Boolean).length === 2
            ? 'grid-cols-2'
            : [report.frequencyAnalysis, report.trendAnalysis, report.resolutionTimeAnalysis, report.handlerPerformanceAnalysis].filter(Boolean).length === 3
            ? 'grid-cols-3'
            : 'grid-cols-4'
        }`}>
          {report.frequencyAnalysis && <TabsTrigger value="frequency">Frequency Analysis</TabsTrigger>}
          {report.trendAnalysis && <TabsTrigger value="trends">Trend Analysis</TabsTrigger>}
          {report.resolutionTimeAnalysis && <TabsTrigger value="resolution">Resolution Metrics</TabsTrigger>}
          {report.handlerPerformanceAnalysis && <TabsTrigger value="handlers">Staff Performance</TabsTrigger>}
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

const FrequencyAnalysisView: React.FC<{ analysis: FrequencyAnalysis }> = ({ analysis }) => {
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

  return (
    <>
      {/* Filing Identity — Anonymous vs Identified */}
      {analysis.byFilingIdentity && analysis.byFilingIdentity.some((item) => item.count > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-indigo-600" />
              Complainant Filing Identity
            </CardTitle>
            <CardDescription>
              Based on filing preference captured at submission (anonymous toggle or identified complainant details)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['Anonymous', 'Identified'] as FilingIdentityLabel[]).map((label) => {
                const item = analysis.byFilingIdentity!.find((row) => row.label === label) ?? {
                  label,
                  count: 0,
                  percentage: 0,
                };
                const styles = FILING_IDENTITY_STYLES[label];

                return (
                  <div
                    key={label}
                    className={`rounded-xl border p-4 ${styles.bg} ${styles.border}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                        <span className={`font-semibold ${styles.text}`}>{label}</span>
                      </div>
                      <span className={`text-2xl font-bold ${styles.text}`}>{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
                      <div
                        className={`h-full rounded-full transition-all ${styles.bar}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      {item.percentage.toFixed(1)}% of total filings
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
              <div className="flex justify-center lg:justify-start">
                <ComplainantIdentityPieChart data={analysis.byFilingIdentity} />
              </div>

              {analysis.byComplainantType && analysis.byComplainantType.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <p className="mb-3 text-sm font-semibold text-gray-900">Complainant role at filing</p>
                  <div className="space-y-3">
                    {analysis.byComplainantType.map((row) => (
                      <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-gray-700">{row.label}</span>
                          <span className="font-medium text-gray-900">
                            {row.count} ({row.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-gray-500"
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {analysis.byFilingIdentity.some((row) => row.label === 'Anonymous' && row.count > 0) && (
                    <p className="mt-3 text-xs text-gray-500">
                      Anonymous filings may not include complainant role details.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identity by Category */}
      {analysis.identityByCategory && analysis.identityByCategory.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              Anonymous vs Identified by Category
            </CardTitle>
            <CardDescription>Which complaint types are filed anonymously vs with identified complainant details</CardDescription>
          </CardHeader>
          <CardContent>
            <IdentityByCategoryChart data={analysis.identityByCategory} />
          </CardContent>
        </Card>
      )}

      {/* Severity distribution */}
      {analysis.bySeverity && analysis.bySeverity.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Severity Distribution
            </CardTitle>
            <CardDescription>Breakdown of cases by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <SeverityPieChart
              data={analysis.bySeverity.map((item) => ({
                severity: item.severity.toLowerCase(),
                count: item.count,
                percentage: item.percentage,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Visual Charts */}
      {analysis.byCategory && Array.isArray(analysis.byCategory) && analysis.byCategory.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Cases by Category
            </CardTitle>
            <CardDescription>Visual breakdown of incident categories</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={analysis.byCategory} />
          </CardContent>
        </Card>
      )}

      {/* By Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Incidents by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.byCategory && (Array.isArray(analysis.byCategory) 
            ? analysis.byCategory.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{item.category}</span>
                      {item.trend && getTrendIcon(item.trend)}
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{item.count || 0}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({(item.percentage || 0).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={item.percentage || 0} className="h-2" />
                </div>
              ))
            : Object.entries(analysis.byCategory).map(([category, data]: [string, any]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                    <div className="text-right">
                      <span className="font-bold">{data.count || 0}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({(data.percentage || 0).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={data.percentage || 0} className="h-2" />
                </div>
              ))
          )}
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
          {analysis.byLocation && Array.isArray(analysis.byLocation) && analysis.byLocation.length > 0
            ? analysis.byLocation.slice(0, 5).map((item) => (
                <div key={item.location}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.location || 'Unknown'}</span>
                    <div className="text-right">
                      <span className="font-bold">{item.count || 0}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({(item.percentage || 0).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={item.percentage || 0} className="h-2" />
                </div>
              ))
            : <div className="text-sm text-gray-500">No location data available</div>
          }
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
              const periodData = analysis.byTimeOfDay && Array.isArray(analysis.byTimeOfDay)
                ? analysis.byTimeOfDay.filter((t) => t.period === period)
                : [];
              const count = periodData.reduce((sum, t) => sum + (t.count || 0), 0);
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
const COMPLIANCE_SECTION_HEADER = 'space-y-1 p-4 pb-2';
const COMPLIANCE_SECTION_CONTENT = 'px-4 pb-4 pt-0';

const TrendAnalysisView: React.FC<{
  analysis: TrendAnalysis;
  getTrendIcon: (trend: any) => JSX.Element;
  getTrendColor: (trend: any) => string;
}> = ({ analysis, getTrendIcon, getTrendColor }) => {
  return (
    <>
      {/* Overall Trend */}
      <Card>
        <CardHeader className={COMPLIANCE_SECTION_HEADER}>
          <CardTitle className="text-lg">Overall Trend</CardTitle>
        </CardHeader>
        <CardContent className={COMPLIANCE_SECTION_CONTENT}>
          <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-5">
            <div>
              <div className="mb-1 text-3xl font-bold sm:text-4xl">
                {analysis.overallTrend.currentPeriodCount}
              </div>
              <div className="text-sm text-gray-600">Current Period Incidents</div>
              <div className="mt-1 text-xs text-gray-500">
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
              <div className="mt-2 text-sm capitalize text-gray-600">
                {analysis.overallTrend.direction}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Line Chart */}
      {analysis.categoryTrends && Array.isArray(analysis.categoryTrends) && analysis.categoryTrends.length > 0 && (
        <Card>
          <CardHeader className={COMPLIANCE_SECTION_HEADER}>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Category Trends Over Time
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Historical trend comparison across incident categories
            </CardDescription>
          </CardHeader>
          <CardContent className={COMPLIANCE_SECTION_CONTENT}>
            <TrendLineChart trends={analysis.categoryTrends} height={300} />
          </CardContent>
        </Card>
      )}

      {/* Category Trends */}
      <Card>
        <CardHeader className={COMPLIANCE_SECTION_HEADER}>
          <CardTitle className="text-lg">Category Trends</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Period-over-period change by incident category
          </CardDescription>
        </CardHeader>
        <CardContent className={COMPLIANCE_SECTION_CONTENT}>
          {analysis.categoryTrends && Array.isArray(analysis.categoryTrends) && analysis.categoryTrends.length > 0 ? (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100">
              {analysis.categoryTrends.map((trend, index) => {
                const color = TREND_CHART_COLORS[index % TREND_CHART_COLORS.length];
                const totalCases = trend.dataPoints.reduce((sum, dp) => sum + dp.count, 0);

                return (
                  <div
                    key={trend.category}
                    className="flex items-center gap-3 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50/80 sm:gap-4 sm:px-4 sm:py-3"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {formatTrendCategoryLabel(trend.category)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {totalCases} case{totalCases === 1 ? '' : 's'} in period
                      </p>
                    </div>

                    <div className="hidden shrink-0 sm:block">
                      <MiniTrendSparkline dataPoints={trend.dataPoints} color={color} />
                    </div>

                    <Badge
                      variant="outline"
                      className={`shrink-0 gap-1 tabular-nums ${getTrendColor(trend.trend)}`}
                    >
                      {getTrendIcon(trend.trend)}
                      <span>{Math.abs(trend.percentageChange || 0).toFixed(1)}%</span>
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500">
              No trend data available
            </div>
          )}
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

      {/* Resolution Time by Category Chart */}
      {analysis.byCategory && Array.isArray(analysis.byCategory) && analysis.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Average Resolution Time by Category
            </CardTitle>
            <CardDescription>Compare resolution performance across different incident types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResolutionBarChart data={analysis.byCategory} />
          </CardContent>
        </Card>
      )}
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

      {/* Handler Performance Chart */}
      {analysis.handlers && Array.isArray(analysis.handlers) && analysis.handlers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Staff Workload Distribution
            </CardTitle>
            <CardDescription>Visual comparison of case resolution status by staff member</CardDescription>
          </CardHeader>
          <CardContent>
            <HandlerPerformanceChart data={analysis.handlers.map(h => ({
              codiMemberName: h.handlerName,
              casesResolved: h.casesResolved,
              casesInProgress: h.casesInProgress,
              casesAssigned: h.casesAssigned
            }))} />
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.topPerformers && Array.isArray(analysis.topPerformers) && analysis.topPerformers.length > 0
            ? analysis.topPerformers.map((performer, idx) => (
                <div key={`${performer.handlerId}-${idx}`} className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-white">#{idx + 1}</Badge>
                    <div>
                      <div className="font-medium">{performer.handlerName || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">{performer.metric || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="font-bold text-green-600">
                    {performer.metric && (performer.metric.includes('Rate') || performer.metric.includes('Compliance'))
                      ? `${(performer.value || 0).toFixed(1)}%`
                      : `${(performer.value || 0).toFixed(1)}h`}
                  </div>
                </div>
              ))
            : <div className="text-sm text-gray-500 p-3">No top performers data available</div>
          }
        </CardContent>
      </Card>

      {/* All Handlers */}
      <Card>
        <CardHeader>
          <CardTitle>Handler Performance Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.handlers && Array.isArray(analysis.handlers) && analysis.handlers.length > 0
            ? analysis.handlers.map((handler) => (
                <div key={handler.handlerId} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{handler.handlerName || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">{handler.handlerRole || 'N/A'}</div>
                    </div>
                    <Badge variant="outline">
                      {(handler.resolutionRate || 0).toFixed(1)}% Resolution
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center text-sm">
                    <div>
                      <div className="font-bold">{handler.casesAssigned || 0}</div>
                      <div className="text-gray-600">Assigned</div>
                    </div>
                    <div>
                      <div className="font-bold text-green-600">{handler.casesResolved || 0}</div>
                      <div className="text-gray-600">Resolved</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-600">{handler.casesInProgress || 0}</div>
                      <div className="text-gray-600">In Progress</div>
                    </div>
                    <div>
                      <div className="font-bold">{(handler.averageResolutionTime || 0).toFixed(1)}h</div>
                      <div className="text-gray-600">Avg Time</div>
                    </div>
                  </div>
                </div>
              ))
            : <div className="text-sm text-gray-500 p-3">No handler data available</div>
          }
        </CardContent>
      </Card>
    </>
  );
};
