/**
 * Compliance Report Service
 * Generates privacy-compliant reports and analytics
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ComplianceReportConfig,
  ComplianceSummaryReport,
  FrequencyAnalysis,
  TrendAnalysis,
  ResolutionTimeAnalysis,
  HandlerPerformanceAnalysis,
  ComplianceReportExportOptions,
  calculateTrend,
  getTimePeriodLabel,
  getDayOfWeekName,
  anonymizeReportData,
  calculateResolutionTime,
  getDateRangeFromPreset,
  DateRangePreset,
} from '../types/complianceReport';
import { AdminReport } from './adminReportService';
import { format, startOfDay, endOfDay, subDays, getHours, getDay, getMonth, getYear } from 'date-fns';
import {
  ComplianceReportRecord,
  getCategoryLabel,
  getComplainantTypeLabel,
  getFilingIdentity,
  isAnonymousComplaint,
} from '../utils/complianceAnalytics';

export class ComplianceReportService {
  /**
   * Generate frequency analysis report
   */
  static async generateFrequencyAnalysis(
    startDate: Date,
    endDate: Date,
    anonymize: boolean = true
  ): Promise<FrequencyAnalysis> {
    try {
      const reports = await this.fetchReports(startDate, endDate);
      
      if (anonymize) {
        reports.forEach((report) => anonymizeReportData(report));
      }
      
      // By category (with human-readable labels)
      const categoryCount = reports.reduce((acc, report) => {
        const cat = report.category || report.type || 'other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const byCategory = Object.entries(categoryCount).map(([category, count]) => {
        const trend = this.calculateCategoryTrend(category, startDate, endDate);
        
        return {
          category: getCategoryLabel(category),
          count,
          percentage: reports.length > 0 ? (count / reports.length) * 100 : 0,
          trend,
        };
      }).sort((a, b) => b.count - a.count);
      
      // By severity
      const severityCount = reports.reduce((acc, report) => {
        const sev = report.severity || 'low';
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const bySeverity = Object.entries(severityCount).map(([severity, count]) => ({
        severity: severity.charAt(0).toUpperCase() + severity.slice(1),
        count,
        percentage: reports.length > 0 ? (count / reports.length) * 100 : 0,
      })).sort((a, b) => b.count - a.count);
      
      // By location
      const locationCount = reports.reduce((acc, report) => {
        const loc = report.location || 'Unknown';
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const byLocation = Object.entries(locationCount).map(([location, count]) => ({
        location: anonymize ? 'Location ' + location.charAt(0) : location,
        count,
        percentage: reports.length > 0 ? (count / reports.length) * 100 : 0,
      })).sort((a, b) => b.count - a.count);

      const anonymousCount = reports.filter((report) => isAnonymousComplaint(report as ComplianceReportRecord)).length;
      const identifiedCount = reports.length - anonymousCount;

      const byFilingIdentity = [
        {
          label: 'Anonymous' as const,
          count: anonymousCount,
          percentage: reports.length > 0 ? (anonymousCount / reports.length) * 100 : 0,
        },
        {
          label: 'Identified' as const,
          count: identifiedCount,
          percentage: reports.length > 0 ? (identifiedCount / reports.length) * 100 : 0,
        },
      ];

      const complainantTypeCount = reports.reduce((acc, report) => {
        const record = report as ComplianceReportRecord;
        const typeLabel = getComplainantTypeLabel(record.complainantType);
        acc[typeLabel] = (acc[typeLabel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byComplainantType = Object.entries(complainantTypeCount)
        .map(([label, count]) => ({
          type: label.toLowerCase().replace(/\s+/g, '_'),
          label,
          count,
          percentage: reports.length > 0 ? (count / reports.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const categoryIdentityMap = new Map<string, { anonymous: number; identified: number }>();
      reports.forEach((report) => {
        const category = report.category || report.type || 'other';
        const existing = categoryIdentityMap.get(category) || { anonymous: 0, identified: 0 };
        if (isAnonymousComplaint(report as ComplianceReportRecord)) {
          existing.anonymous += 1;
        } else {
          existing.identified += 1;
        }
        categoryIdentityMap.set(category, existing);
      });

      const identityByCategory = Array.from(categoryIdentityMap.entries())
        .map(([category, counts]) => ({
          category,
          categoryLabel: getCategoryLabel(category),
          anonymous: counts.anonymous,
          identified: counts.identified,
          total: counts.anonymous + counts.identified,
        }))
        .sort((a, b) => b.total - a.total);
      
      // By time of day
      const timeOfDayCount: Record<number, number> = {};
      reports.forEach((report) => {
        const date = new Date(report.reportedAt);
        const hour = getHours(date);
        timeOfDayCount[hour] = (timeOfDayCount[hour] || 0) + 1;
      });
      
      const byTimeOfDay = Object.entries(timeOfDayCount).map(([hour, count]) => ({
        hour: parseInt(hour),
        period: getTimePeriodLabel(parseInt(hour)),
        count,
      })).sort((a, b) => a.hour - b.hour);
      
      // By day of week
      const dayOfWeekCount: Record<number, number> = {};
      reports.forEach((report) => {
        const date = new Date(report.reportedAt);
        const day = getDay(date);
        dayOfWeekCount[day] = (dayOfWeekCount[day] || 0) + 1;
      });
      
      const byDayOfWeek = Object.entries(dayOfWeekCount).map(([day, count]) => ({
        day: getDayOfWeekName(parseInt(day)),
        dayNumber: parseInt(day),
        count,
      })).sort((a, b) => a.dayNumber - b.dayNumber);
      
      // By month
      const monthCount: Record<string, number> = {};
      reports.forEach((report) => {
        const date = new Date(report.reportedAt);
        const monthKey = `${getYear(date)}-${getMonth(date)}`;
        monthCount[monthKey] = (monthCount[monthKey] || 0) + 1;
      });
      
      const byMonth = Object.entries(monthCount).map(([key, count]) => {
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month);
        return {
          month: format(date, 'MMM yyyy'),
          year,
          count,
        };
      }).sort((a, b) => a.year - b.year);
      
      return {
        totalIncidents: reports.length,
        period: { start: startDate, end: endDate },
        byCategory,
        bySeverity,
        byLocation,
        byTimeOfDay,
        byDayOfWeek,
        byMonth,
        byFilingIdentity,
        byComplainantType,
        identityByCategory,
      };
    } catch (error) {
      console.error('Error generating frequency analysis:', error);
      throw error;
    }
  }
  
  /**
   * Generate trend analysis report
   */
  static async generateTrendAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<TrendAnalysis> {
    try {
      const currentReports = await this.fetchReports(startDate, endDate);
      
      // Get previous period data for comparison
      const periodDuration = endDate.getTime() - startDate.getTime();
      const previousStart = new Date(startDate.getTime() - periodDuration);
      const previousEnd = startDate;
      const previousReports = await this.fetchReports(previousStart, previousEnd);
      
      // Overall trend
      const trendData = calculateTrend(currentReports.length, previousReports.length);
      const overallTrend = {
        direction: trendData.direction,
        percentageChange: trendData.percentageChange,
        previousPeriodCount: previousReports.length,
        currentPeriodCount: currentReports.length,
      };
      
      // Category trends
      const categories = Array.from(new Set([
        ...currentReports.map(r => r.category || 'other'),
        ...previousReports.map(r => r.category || 'other'),
      ]));
      
      const categoryTrends = categories.map((category) => {
        const currentCount = currentReports.filter(r => (r.category || 'other') === category).length;
        const previousCount = previousReports.filter(r => (r.category || 'other') === category).length;
        const trend = calculateTrend(currentCount, previousCount);
        
        // Generate data points (weekly breakdown)
        const dataPoints = this.generateWeeklyDataPoints(currentReports, category, 'category');
        
        return {
          category,
          trend: trend.direction,
          percentageChange: trend.percentageChange,
          dataPoints,
        };
      });
      
      // Severity trends
      const severities = ['low', 'medium', 'high', 'critical'];
      const severityTrends = severities.map((severity) => {
        const currentCount = currentReports.filter(r => r.severity === severity).length;
        const previousCount = previousReports.filter(r => r.severity === severity).length;
        const trend = calculateTrend(currentCount, previousCount);
        
        const dataPoints = this.generateWeeklyDataPoints(currentReports, severity, 'severity');
        
        return {
          severity,
          trend: trend.direction,
          percentageChange: trend.percentageChange,
          dataPoints,
        };
      });
      
      // Location trends (top 5 locations)
      const locationCounts = currentReports.reduce((acc, r) => {
        const loc = r.location || 'Unknown';
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topLocations = Object.entries(locationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([location]) => location);
      
      const locationTrends = topLocations.map((location) => {
        const currentCount = currentReports.filter(r => r.location === location).length;
        const previousCount = previousReports.filter(r => r.location === location).length;
        const trend = calculateTrend(currentCount, previousCount);
        
        const dataPoints = this.generateWeeklyDataPoints(currentReports, location, 'location');
        
        return {
          location,
          trend: trend.direction,
          percentageChange: trend.percentageChange,
          dataPoints,
        };
      });
      
      return {
        period: { start: startDate, end: endDate },
        overallTrend,
        categoryTrends,
        severityTrends,
        locationTrends,
      };
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      throw error;
    }
  }
  
  /**
   * Generate resolution time analysis
   */
  static async generateResolutionTimeAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<ResolutionTimeAnalysis> {
    try {
      const reports = await this.fetchReports(startDate, endDate);
      const resolvedReports = reports.filter(r => r.status === 'resolved');
      
      // Calculate resolution times
      const resolutionTimes = resolvedReports
        .map(r => calculateResolutionTime(r.reportedAt, r.lastUpdated))
        .filter((time): time is number => time !== null);
      
      const averageResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;
      
      const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
      const medianResolutionTime = sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length / 2)]
        : 0;
      
      // By category
      const categories = Array.from(new Set(resolvedReports.map(r => r.category || 'other')));
      const byCategory = categories.map((category) => {
        const categoryReports = resolvedReports.filter(r => (r.category || 'other') === category);
        const times = categoryReports
          .map(r => calculateResolutionTime(r.reportedAt, r.lastUpdated))
          .filter((time): time is number => time !== null);
        
        const avgTime = times.length > 0 
          ? times.reduce((sum, t) => sum + t, 0) / times.length 
          : 0;
        const sorted = [...times].sort((a, b) => a - b);
        const medianTime = sorted.length > 0 
          ? sorted[Math.floor(sorted.length / 2)] 
          : 0;
        
        return {
          category,
          averageTime: avgTime,
          medianTime,
          count: categoryReports.length,
        };
      });
      
      // By severity
      const severities = ['low', 'medium', 'high', 'critical'];
      const bySeverity = severities.map((severity) => {
        const severityReports = resolvedReports.filter(r => r.severity === severity);
        const times = severityReports
          .map(r => calculateResolutionTime(r.reportedAt, r.lastUpdated))
          .filter((time): time is number => time !== null);
        
        const avgTime = times.length > 0
          ? times.reduce((sum, t) => sum + t, 0) / times.length
          : 0;
        const sorted = [...times].sort((a, b) => a - b);
        const medianTime = sorted.length > 0
          ? sorted[Math.floor(sorted.length / 2)]
          : 0;
        
        return {
          severity,
          averageTime: avgTime,
          medianTime,
          count: severityReports.length,
        };
      });
      
      // SLA compliance (assuming 48 hours SLA)
      const SLA_HOURS = 48;
      const withinSLA = resolutionTimes.filter(time => time <= SLA_HOURS).length;
      const breachedSLA = resolutionTimes.filter(time => time > SLA_HOURS).length;
      
      return {
        averageResolutionTime,
        medianResolutionTime,
        byCategory,
        bySeverity,
        slaCompliance: {
          total: resolutionTimes.length,
          withinSLA,
          breachedSLA,
          complianceRate: resolutionTimes.length > 0 
            ? (withinSLA / resolutionTimes.length) * 100 
            : 0,
        },
      };
    } catch (error) {
      console.error('Error generating resolution time analysis:', error);
      throw error;
    }
  }
  
  /**
   * Generate handler performance analysis
   */
  static async generateHandlerPerformanceAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<HandlerPerformanceAnalysis> {
    try {
      const reports = await this.fetchReports(startDate, endDate);
      const assignedReports = reports.filter(r => r.assignedTo);
      
      // Group by handler
      const handlerMap = new Map<string, AdminReport[]>();
      assignedReports.forEach((report) => {
        if (report.assignedTo) {
          const existing = handlerMap.get(report.assignedTo) || [];
          handlerMap.set(report.assignedTo, [...existing, report]);
        }
      });
      
      // Analyze each handler
      const handlers = Array.from(handlerMap.entries()).map(([handlerId, handlerReports]) => {
        const resolved = handlerReports.filter(r => r.status === 'resolved');
        const inProgress = handlerReports.filter(r => r.status === 'inProgress');
        
        const resolutionTimes = resolved
          .map(r => calculateResolutionTime(r.reportedAt, r.lastUpdated))
          .filter((time): time is number => time !== null);
        
        const avgTime = resolutionTimes.length > 0
          ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
          : 0;
        
        return {
          handlerId,
          handlerName: handlerReports[0]?.assignedToName || 'Unknown',
          handlerRole: handlerReports[0]?.assignedToRole || 'Unknown',
          casesAssigned: handlerReports.length,
          casesResolved: resolved.length,
          casesInProgress: inProgress.length,
          averageResolutionTime: avgTime,
          resolutionRate: handlerReports.length > 0
            ? (resolved.length / handlerReports.length) * 100
            : 0,
        };
      });
      
      // Top performers
      const topPerformers = [
        ...handlers
          .sort((a, b) => b.resolutionRate - a.resolutionRate)
          .slice(0, 3)
          .map(h => ({
            handlerId: h.handlerId,
            handlerName: h.handlerName,
            metric: 'Resolution Rate',
            value: h.resolutionRate,
          })),
        ...handlers
          .filter(h => h.averageResolutionTime > 0)
          .sort((a, b) => a.averageResolutionTime - b.averageResolutionTime)
          .slice(0, 3)
          .map(h => ({
            handlerId: h.handlerId,
            handlerName: h.handlerName,
            metric: 'Fastest Resolution',
            value: h.averageResolutionTime,
          })),
      ];
      
      return {
        totalHandlers: handlers.length,
        handlers,
        topPerformers,
      };
    } catch (error) {
      console.error('Error generating handler performance analysis:', error);
      throw error;
    }
  }
  
  /**
   * Generate complete compliance summary report
   */
  static async generateComplianceSummaryReport(
    config: ComplianceReportConfig
  ): Promise<ComplianceSummaryReport> {
    try {
      const reports = await this.fetchReports(config.startDate, config.endDate);

      const anonymousIncidents = reports.filter((report) =>
        isAnonymousComplaint(report as ComplianceReportRecord)
      ).length;
      const identifiedIncidents = reports.length - anonymousIncidents;
      
      // Summary stats
      const summary = {
        totalIncidents: reports.length,
        resolvedIncidents: reports.filter(r => r.status === 'resolved').length,
        pendingIncidents: reports.filter(r => r.status === 'pending' || r.status === 'submitted').length,
        inProgressIncidents: reports.filter(r => r.status === 'inProgress').length,
        dismissedIncidents: reports.filter(r => r.status === 'dismissed' || r.status === 'closed').length,
        resolutionRate: reports.length > 0
          ? (reports.filter(r => r.status === 'resolved').length / reports.length) * 100
          : 0,
        averageResolutionTime: 0,
        anonymousIncidents,
        identifiedIncidents,
        anonymousRate: reports.length > 0 ? (anonymousIncidents / reports.length) * 100 : 0,
        identifiedRate: reports.length > 0 ? (identifiedIncidents / reports.length) * 100 : 0,
      };
      
      // Generate analyses based on report type
      let frequencyAnalysis, trendAnalysis, resolutionTimeAnalysis, handlerPerformanceAnalysis;
      
      if (['frequency_analysis', 'monthly_summary', 'quarterly_summary', 'annual_summary', 'category_breakdown', 'severity_analysis', 'location_analysis'].includes(config.type)) {
        frequencyAnalysis = await this.generateFrequencyAnalysis(
          config.startDate,
          config.endDate,
          config.anonymizeData
        );
      }
      
      if (['trend_analysis', 'monthly_summary', 'quarterly_summary', 'annual_summary'].includes(config.type)) {
        trendAnalysis = await this.generateTrendAnalysis(
          config.startDate,
          config.endDate
        );
      }
      
      if (['resolution_time', 'monthly_summary', 'quarterly_summary', 'annual_summary'].includes(config.type)) {
        resolutionTimeAnalysis = await this.generateResolutionTimeAnalysis(
          config.startDate,
          config.endDate
        );
        summary.averageResolutionTime = resolutionTimeAnalysis.averageResolutionTime;
      }
      
      if (['handler_performance', 'monthly_summary', 'quarterly_summary', 'annual_summary'].includes(config.type)) {
        handlerPerformanceAnalysis = await this.generateHandlerPerformanceAnalysis(
          config.startDate,
          config.endDate
        );
      }
      
      return {
        reportId: `report_${Date.now()}`,
        generatedAt: new Date(),
        generatedBy: 'System',
        reportType: config.type,
        period: {
          start: config.startDate,
          end: config.endDate,
        },
        summary,
        frequencyAnalysis,
        trendAnalysis,
        resolutionTimeAnalysis,
        handlerPerformanceAnalysis,
        dataPrivacyCompliant: true,
        anonymized: config.anonymizeData,
        personalDataIncluded: config.includePersonalData,
      };
    } catch (error) {
      console.error('Error generating compliance summary report:', error);
      throw error;
    }
  }
  
  /**
   * Fetch reports within date range
   */
  private static async fetchReports(startDate: Date, endDate: Date): Promise<AdminReport[]> {
    try {
      const complaintsRef = collection(db, 'complaints');
      const q = query(
        complaintsRef,
        where('reportedAt', '>=', Timestamp.fromDate(startDate)),
        where('reportedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('reportedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamps to JavaScript Dates
        const reportedAt = data.reportedAt?.toDate ? data.reportedAt.toDate() : data.reportedAt;
        const lastUpdated = data.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated;
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt;
        
        return {
          ...data,
          id: doc.id,
          reportedAt,
          lastUpdated,
          createdAt,
        } as unknown as AdminReport;
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }
  
  /**
   * Calculate category trend (placeholder - needs historical data)
   */
  private static calculateCategoryTrend(
    category: string,
    startDate: Date,
    endDate: Date
  ): 'increasing' | 'decreasing' | 'stable' {
    // Simplified trend calculation
    // In production, compare with previous period
    return 'stable';
  }
  
  /**
   * Generate weekly data points for trend charts
   */
  private static generateWeeklyDataPoints(
    reports: AdminReport[],
    filterValue: string,
    filterType: 'category' | 'severity' | 'location'
  ): Array<{ date: Date; count: number }> {
    const weeklyData: Record<string, number> = {};
    
    reports
      .filter((r) => {
        if (filterType === 'category') return (r.category || 'other') === filterValue;
        if (filterType === 'severity') return r.severity === filterValue;
        if (filterType === 'location') return r.location === filterValue;
        return false;
      })
      .forEach((r) => {
        const date = new Date(r.reportedAt);
        const weekStart = format(startOfDay(date), 'yyyy-MM-dd');
        weeklyData[weekStart] = (weeklyData[weekStart] || 0) + 1;
      });
    
    return Object.entries(weeklyData)
      .map(([date, count]) => ({
        date: new Date(date),
        count,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
