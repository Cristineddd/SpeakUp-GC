/**
 * Compliance Report Types
 * Data privacy compliant reporting and analytics
 */

import { Timestamp } from 'firebase/firestore';

// Report types
export type ComplianceReportType = 
  | 'frequency_analysis'
  | 'trend_analysis'
  | 'category_breakdown'
  | 'location_analysis'
  | 'severity_analysis'
  | 'resolution_time'
  | 'handler_performance'
  | 'monthly_summary'
  | 'quarterly_summary'
  | 'annual_summary';

// Date range presets
export type DateRangePreset = 
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_6_months'
  | 'last_year'
  | 'custom';

// Compliance report configuration
export interface ComplianceReportConfig {
  type: ComplianceReportType;
  startDate: Date;
  endDate: Date;
  includePersonalData: boolean; // GDPR compliance flag
  anonymizeData: boolean;
  categories?: string[];
  locations?: string[];
  severities?: string[];
  statuses?: string[];
}

// Frequency analysis data
export interface FrequencyAnalysis {
  totalIncidents: number;
  period: {
    start: Date;
    end: Date;
  };
  
  byCategory: {
    category: string;
    count: number;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  
  bySeverity: {
    severity: string;
    count: number;
    percentage: number;
  }[];
  
  byLocation: {
    location: string;
    count: number;
    percentage: number;
  }[];
  
  byTimeOfDay: {
    hour: number;
    period: string; // Morning, Afternoon, Evening, Night
    count: number;
  }[];
  
  byDayOfWeek: {
    day: string;
    dayNumber: number;
    count: number;
  }[];
  
  byMonth: {
    month: string;
    year: number;
    count: number;
  }[];
}

// Trend analysis data
export interface TrendAnalysis {
  period: {
    start: Date;
    end: Date;
  };
  
  overallTrend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
    previousPeriodCount: number;
    currentPeriodCount: number;
  };
  
  categoryTrends: {
    category: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
    dataPoints: Array<{
      date: Date;
      count: number;
    }>;
  }[];
  
  severityTrends: {
    severity: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
    dataPoints: Array<{
      date: Date;
      count: number;
    }>;
  }[];
  
  locationTrends: {
    location: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
    dataPoints: Array<{
      date: Date;
      count: number;
    }>;
  }[];
}

// Resolution time analysis
export interface ResolutionTimeAnalysis {
  averageResolutionTime: number; // in hours
  medianResolutionTime: number;
  
  byCategory: {
    category: string;
    averageTime: number;
    medianTime: number;
    count: number;
  }[];
  
  bySeverity: {
    severity: string;
    averageTime: number;
    medianTime: number;
    count: number;
  }[];
  
  slaCompliance: {
    total: number;
    withinSLA: number;
    breachedSLA: number;
    complianceRate: number;
  };
}

// Handler performance analysis
export interface HandlerPerformanceAnalysis {
  totalHandlers: number;
  
  handlers: Array<{
    handlerId: string;
    handlerName: string;
    handlerRole: string;
    casesAssigned: number;
    casesResolved: number;
    casesInProgress: number;
    averageResolutionTime: number;
    resolutionRate: number;
    satisfactionScore?: number;
  }>;
  
  topPerformers: Array<{
    handlerId: string;
    handlerName: string;
    metric: string;
    value: number;
  }>;
}

// Compliance summary report
export interface ComplianceSummaryReport {
  reportId: string;
  generatedAt: Date;
  generatedBy: string;
  reportType: ComplianceReportType;
  period: {
    start: Date;
    end: Date;
  };
  
  summary: {
    totalIncidents: number;
    resolvedIncidents: number;
    pendingIncidents: number;
    inProgressIncidents: number;
    dismissedIncidents: number;
    resolutionRate: number;
    averageResolutionTime: number;
  };
  
  frequencyAnalysis?: FrequencyAnalysis;
  trendAnalysis?: TrendAnalysis;
  resolutionTimeAnalysis?: ResolutionTimeAnalysis;
  handlerPerformanceAnalysis?: HandlerPerformanceAnalysis;
  
  // Privacy compliance
  dataPrivacyCompliant: boolean;
  anonymized: boolean;
  personalDataIncluded: boolean;
}

// Export format options
export interface ComplianceReportExportOptions {
  format: 'pdf' | 'xlsx' | 'csv' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  includePersonalData: boolean;
  anonymizeData: boolean;
}

// Chart data for visualizations
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

// Helper: Get date range from preset
export const getDateRangeFromPreset = (preset: DateRangePreset): { start: Date; end: Date } => {
  const now = new Date();
  const end = now;
  let start: Date;
  
  switch (preset) {
    case 'last_7_days':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last_30_days':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'last_90_days':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'last_6_months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      break;
    case 'last_year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'custom':
      start = now;
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  return { start, end };
};

// Helper: Calculate trend direction
export const calculateTrend = (
  current: number,
  previous: number
): { direction: 'increasing' | 'decreasing' | 'stable'; percentageChange: number } => {
  if (previous === 0) {
    return { direction: current > 0 ? 'increasing' : 'stable', percentageChange: 0 };
  }
  
  const percentageChange = ((current - previous) / previous) * 100;
  
  if (Math.abs(percentageChange) < 5) {
    return { direction: 'stable', percentageChange };
  } else if (percentageChange > 0) {
    return { direction: 'increasing', percentageChange };
  } else {
    return { direction: 'decreasing', percentageChange };
  }
};

// Helper: Get time period label
export const getTimePeriodLabel = (hour: number): string => {
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

// Helper: Get day of week name
export const getDayOfWeekName = (dayNumber: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber];
};

// Helper: Anonymize data
export const anonymizeReportData = <T extends { userName?: string; userEmail?: string }>(
  data: T
): T => {
  return {
    ...data,
    userName: data.userName ? 'Anonymous User' : undefined,
    userEmail: data.userEmail ? 'anonymous@example.com' : undefined,
  };
};

// Helper: Calculate resolution time in hours
export const calculateResolutionTime = (
  reportedAt: Date | Timestamp | string,
  resolvedAt: Date | Timestamp | string | null | undefined
): number | null => {
  if (!resolvedAt) return null;
  
  const reported = typeof reportedAt === 'string' 
    ? new Date(reportedAt)
    : (reportedAt as any).toDate ? (reportedAt as any).toDate() : reportedAt;
    
  const resolved = typeof resolvedAt === 'string'
    ? new Date(resolvedAt)
    : (resolvedAt as any).toDate ? (resolvedAt as any).toDate() : resolvedAt;
  
  return (resolved.getTime() - reported.getTime()) / (1000 * 60 * 60); // Convert to hours
};

// Report category groupings for organized display
export const REPORT_CATEGORIES = {
  OVERVIEW: 'Compliance & Performance Overview',
  ANALYTICAL: 'Analytical & Statistical Reports',
  PERFORMANCE: 'Performance & Metrics Reports',
} as const;

// Professional report labels organized by category
export const REPORT_TYPE_LABELS: Record<ComplianceReportType, string> = {
  // Compliance & Performance Overview
  monthly_summary: 'Monthly Performance Summary',
  quarterly_summary: 'Quarterly Performance Summary',
  annual_summary: 'Annual Performance Summary',
  
  // Analytical & Statistical Reports
  frequency_analysis: 'Case Volume & Frequency Analysis',
  trend_analysis: 'Trend & Pattern Analysis',
  category_breakdown: 'Case Classification Report',
  location_analysis: 'Geographic Distribution Report',
  severity_analysis: 'Severity Level Distribution',
  
  // Performance & Metrics Reports
  resolution_time: 'Resolution Performance Metrics',
  handler_performance: 'Staff Performance Analysis',
};

// Report descriptions for better context
export const REPORT_TYPE_DESCRIPTIONS: Record<ComplianceReportType, string> = {
  monthly_summary: 'Comprehensive monthly overview of case management performance and key metrics',
  quarterly_summary: 'Quarterly compliance report with performance trends and analytics',
  annual_summary: 'Annual compliance summary with year-over-year comparisons',
  
  frequency_analysis: 'Detailed analysis of case volumes, patterns, and frequency trends',
  trend_analysis: 'Historical trend analysis with predictive insights and pattern recognition',
  category_breakdown: 'Statistical breakdown of cases by category and classification',
  location_analysis: 'Geographic analysis of case distribution across locations',
  severity_analysis: 'Analysis of incident severity levels and priority distribution',
  
  resolution_time: 'Performance metrics for case resolution times and SLA compliance',
  handler_performance: 'Detailed analysis of staff performance, workload, and efficiency metrics',
};

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days (Monthly)',
  last_90_days: 'Last 90 Days (Quarterly)',
  last_6_months: 'Last 6 Months',
  last_year: 'Last 12 Months (Annual)',
  custom: 'Custom Date Range',
};

// Helper: Get report category
export const getReportCategory = (type: ComplianceReportType): string => {
  if (['monthly_summary', 'quarterly_summary', 'annual_summary'].includes(type)) {
    return REPORT_CATEGORIES.OVERVIEW;
  }
  if (['frequency_analysis', 'trend_analysis', 'category_breakdown', 'location_analysis', 'severity_analysis'].includes(type)) {
    return REPORT_CATEGORIES.ANALYTICAL;
  }
  return REPORT_CATEGORIES.PERFORMANCE;
};
