/**
 * Compliance Report Service
 * Generates privacy-compliant reports from live complaint records.
 */

import { format, startOfDay, endOfDay, subDays, getHours, getDay, getMonth, getYear } from 'date-fns';
import {
  ComplianceReportConfig,
  ComplianceSummaryReport,
  FrequencyAnalysis,
  TrendAnalysis,
  ResolutionTimeAnalysis,
  HandlerPerformanceAnalysis,
  calculateTrend,
  getTimePeriodLabel,
  getDayOfWeekName,
} from '../types/complianceReport';
import { AdminReport, AdminReportService } from './adminReportService';
import {
  ComplianceReportRecord,
  getCanonicalCategory,
  getCanonicalSeverity,
  getCaseLocation,
  getCategoryLabel,
  getComplainantTypeLabel,
  getFiledAt,
  getFirstResponseAt,
  getResolutionHours,
  getSeverityLabel,
  isAnonymousComplaint,
  isDismissedStatus,
  isInProgressStatus,
  isPendingStatus,
  isResolvedStatus,
  RESPONSE_SLA_HOURS,
  RESPONSE_SLA_LABEL,
} from '../utils/complianceAnalytics';
import { safeToDate } from '../utils/dateFormat';

export class ComplianceReportService {
  static async generateFrequencyAnalysis(
    startDate: Date,
    endDate: Date,
    _anonymize: boolean = true
  ): Promise<FrequencyAnalysis> {
    const reports = await this.fetchReports(startDate, endDate);
    return this.buildFrequencyAnalysis(reports, startDate, endDate);
  }

  static async generateTrendAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<TrendAnalysis> {
    const currentReports = await this.fetchReports(startDate, endDate);
    const periodDuration = endOfDay(endDate).getTime() - startOfDay(startDate).getTime();
    const previousEnd = endOfDay(subDays(startOfDay(startDate), 1));
    const previousStart = startOfDay(new Date(previousEnd.getTime() - periodDuration));
    const previousReports = await this.fetchReports(previousStart, previousEnd);
    return this.buildTrendAnalysis(currentReports, previousReports, startDate, endDate);
  }

  static async generateResolutionTimeAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<ResolutionTimeAnalysis> {
    const reports = await this.fetchReports(startDate, endDate);
    return this.buildResolutionTimeAnalysis(reports);
  }

  static async generateHandlerPerformanceAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<HandlerPerformanceAnalysis> {
    const reports = await this.fetchReports(startDate, endDate);
    return this.buildHandlerPerformanceAnalysis(reports);
  }

  static async generateComplianceSummaryReport(
    config: ComplianceReportConfig
  ): Promise<ComplianceSummaryReport> {
    try {
      const startDate = startOfDay(config.startDate);
      const endDate = endOfDay(config.endDate);
      const reports = await this.fetchReports(startDate, endDate);

      const anonymousIncidents = reports.filter((report) =>
        isAnonymousComplaint(report as ComplianceReportRecord)
      ).length;
      const identifiedIncidents = reports.length - anonymousIncidents;
      const resolvedIncidents = reports.filter((r) => isResolvedStatus(r.status)).length;
      const pendingIncidents = reports.filter((r) => isPendingStatus(r.status)).length;
      const inProgressIncidents = reports.filter((r) => isInProgressStatus(r.status)).length;
      const dismissedIncidents = reports.filter((r) => isDismissedStatus(r.status)).length;

      const summary = {
        totalIncidents: reports.length,
        resolvedIncidents,
        pendingIncidents,
        inProgressIncidents,
        dismissedIncidents,
        resolutionRate: reports.length > 0 ? (resolvedIncidents / reports.length) * 100 : 0,
        averageResolutionTime: 0,
        anonymousIncidents,
        identifiedIncidents,
        anonymousRate: reports.length > 0 ? (anonymousIncidents / reports.length) * 100 : 0,
        identifiedRate: reports.length > 0 ? (identifiedIncidents / reports.length) * 100 : 0,
      };

      let frequencyAnalysis;
      let trendAnalysis;
      let resolutionTimeAnalysis;
      let handlerPerformanceAnalysis;

      if (
        [
          'frequency_analysis',
          'monthly_summary',
          'quarterly_summary',
          'annual_summary',
          'category_breakdown',
          'severity_analysis',
          'location_analysis',
        ].includes(config.type)
      ) {
        frequencyAnalysis = this.buildFrequencyAnalysis(reports, startDate, endDate);
      }

      if (['trend_analysis', 'monthly_summary', 'quarterly_summary', 'annual_summary'].includes(config.type)) {
        const periodDuration = endDate.getTime() - startDate.getTime();
        const previousEnd = endOfDay(subDays(startDate, 1));
        const previousStart = startOfDay(new Date(previousEnd.getTime() - periodDuration));
        const previousReports = await this.fetchReports(previousStart, previousEnd);
        trendAnalysis = this.buildTrendAnalysis(reports, previousReports, startDate, endDate);
      }

      if (['resolution_time', 'monthly_summary', 'quarterly_summary', 'annual_summary'].includes(config.type)) {
        resolutionTimeAnalysis = this.buildResolutionTimeAnalysis(reports);
        summary.averageResolutionTime = resolutionTimeAnalysis.averageResolutionTime;
      }

      if (['handler_performance', 'monthly_summary', 'quarterly_summary', 'annual_summary'].includes(config.type)) {
        handlerPerformanceAnalysis = this.buildHandlerPerformanceAnalysis(reports);
      }

      return {
        reportId: `report_${Date.now()}`,
        generatedAt: new Date(),
        generatedBy: 'System',
        reportType: config.type,
        period: {
          start: startDate,
          end: endDate,
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

  private static async fetchReports(startDate: Date, endDate: Date): Promise<AdminReport[]> {
    const start = startOfDay(startDate).getTime();
    const end = endOfDay(endDate).getTime();
    const allReports = await AdminReportService.getAllReports();

    return allReports.filter((report) => {
      if (report.isDeleted) return false;
      const filed = getFiledAt(report);
      if (!filed) return false;
      const time = filed.getTime();
      return time >= start && time <= end;
    });
  }

  private static buildFrequencyAnalysis(
    reports: AdminReport[],
    startDate: Date,
    endDate: Date
  ): FrequencyAnalysis {
    const categoryCount = reports.reduce((acc, report) => {
      const cat = getCanonicalCategory(report);
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = Object.entries(categoryCount)
      .map(([category, count]) => ({
        category: getCategoryLabel(category),
        count,
        percentage: reports.length > 0 ? (count / reports.length) * 100 : 0,
        trend: this.calculateCategoryTrend(reports, category, startDate, endDate),
      }))
      .sort((a, b) => b.count - a.count);

    const severityCount = reports.reduce((acc, report) => {
      const sev = getCanonicalSeverity(report);
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = Object.entries(severityCount)
      .map(([severity, count]) => ({
        severity: getSeverityLabel(severity),
        count,
        percentage: reports.length > 0 ? (count / reports.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const locationCount = reports.reduce((acc, report) => {
      const loc = getCaseLocation(report);
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byLocation = Object.entries(locationCount)
      .map(([location, count]) => ({
        location,
        count,
        percentage: reports.length > 0 ? (count / reports.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const anonymousCount = reports.filter((report) =>
      isAnonymousComplaint(report as ComplianceReportRecord)
    ).length;
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
      const typeLabel = getComplainantTypeLabel((report as ComplianceReportRecord).complainantType);
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
      const category = getCanonicalCategory(report);
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

    const timeOfDayCount: Record<number, number> = {};
    reports.forEach((report) => {
      const hour = this.getIncidentHour(report);
      timeOfDayCount[hour] = (timeOfDayCount[hour] || 0) + 1;
    });

    const byTimeOfDay = Object.entries(timeOfDayCount)
      .map(([hour, count]) => ({
        hour: parseInt(hour, 10),
        period: getTimePeriodLabel(parseInt(hour, 10)),
        count,
      }))
      .sort((a, b) => a.hour - b.hour);

    const dayOfWeekCount: Record<number, number> = {};
    reports.forEach((report) => {
      const date = this.getIncidentDay(report);
      if (!date) return;
      const day = getDay(date);
      dayOfWeekCount[day] = (dayOfWeekCount[day] || 0) + 1;
    });

    const byDayOfWeek = Object.entries(dayOfWeekCount)
      .map(([day, count]) => ({
        day: getDayOfWeekName(parseInt(day, 10)),
        dayNumber: parseInt(day, 10),
        count,
      }))
      .sort((a, b) => a.dayNumber - b.dayNumber);

    const monthCount: Record<string, number> = {};
    reports.forEach((report) => {
      const date = getFiledAt(report);
      if (!date) return;
      const monthKey = `${getYear(date)}-${getMonth(date)}`;
      monthCount[monthKey] = (monthCount[monthKey] || 0) + 1;
    });

    const byMonth = Object.entries(monthCount)
      .map(([key, count]) => {
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month);
        return {
          month: format(date, 'MMM yyyy'),
          year,
          count,
        };
      })
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

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
  }

  private static buildTrendAnalysis(
    currentReports: AdminReport[],
    previousReports: AdminReport[],
    startDate: Date,
    endDate: Date
  ): TrendAnalysis {
    const trendData = calculateTrend(currentReports.length, previousReports.length);
    const overallTrend = {
      direction: trendData.direction,
      percentageChange: trendData.percentageChange,
      previousPeriodCount: previousReports.length,
      currentPeriodCount: currentReports.length,
    };

    const categories = Array.from(
      new Set([
        ...currentReports.map((r) => getCanonicalCategory(r)),
        ...previousReports.map((r) => getCanonicalCategory(r)),
      ])
    );

    const categoryTrends = categories.map((category) => {
      const currentCount = currentReports.filter((r) => getCanonicalCategory(r) === category).length;
      const previousCount = previousReports.filter((r) => getCanonicalCategory(r) === category).length;
      const trend = calculateTrend(currentCount, previousCount);

      return {
        category: getCategoryLabel(category),
        trend: trend.direction,
        percentageChange: trend.percentageChange,
        dataPoints: this.generateWeeklyDataPoints(currentReports, category, 'category'),
      };
    });

    const severities = Array.from(
      new Set([
        ...currentReports.map((r) => getCanonicalSeverity(r)),
        ...previousReports.map((r) => getCanonicalSeverity(r)),
        'low',
        'medium',
        'high',
        'critical',
      ])
    );

    const severityTrends = severities.map((severity) => {
      const currentCount = currentReports.filter((r) => getCanonicalSeverity(r) === severity).length;
      const previousCount = previousReports.filter((r) => getCanonicalSeverity(r) === severity).length;
      const trend = calculateTrend(currentCount, previousCount);

      return {
        severity: getSeverityLabel(severity),
        trend: trend.direction,
        percentageChange: trend.percentageChange,
        dataPoints: this.generateWeeklyDataPoints(currentReports, severity, 'severity'),
      };
    });

    const locationCounts = currentReports.reduce((acc, r) => {
      const loc = getCaseLocation(r);
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topLocations = Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([location]) => location);

    const locationTrends = topLocations.map((location) => {
      const currentCount = currentReports.filter((r) => getCaseLocation(r) === location).length;
      const previousCount = previousReports.filter((r) => getCaseLocation(r) === location).length;
      const trend = calculateTrend(currentCount, previousCount);

      return {
        location,
        trend: trend.direction,
        percentageChange: trend.percentageChange,
        dataPoints: this.generateWeeklyDataPoints(currentReports, location, 'location'),
      };
    });

    return {
      period: { start: startDate, end: endDate },
      overallTrend,
      categoryTrends,
      severityTrends,
      locationTrends,
    };
  }

  private static buildResolutionTimeAnalysis(reports: AdminReport[]): ResolutionTimeAnalysis {
    const resolvedReports = reports.filter((r) => isResolvedStatus(r.status));
    const resolutionTimes = resolvedReports
      .map((r) => getResolutionHours(r))
      .filter((time): time is number => time !== null);

    const averageResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;

    const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
    const medianResolutionTime =
      sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : 0;

    const categories = Array.from(new Set(resolvedReports.map((r) => getCanonicalCategory(r))));
    const byCategory = categories.map((category) => {
      const categoryReports = resolvedReports.filter((r) => getCanonicalCategory(r) === category);
      const times = categoryReports
        .map((r) => getResolutionHours(r))
        .filter((time): time is number => time !== null);

      const avgTime = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
      const sorted = [...times].sort((a, b) => a - b);
      const medianTime = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

      return {
        category: getCategoryLabel(category),
        averageTime: avgTime,
        medianTime,
        count: categoryReports.length,
      };
    });

    const severities = Array.from(new Set(resolvedReports.map((r) => getCanonicalSeverity(r))));
    const bySeverity = severities.map((severity) => {
      const severityReports = resolvedReports.filter((r) => getCanonicalSeverity(r) === severity);
      const times = severityReports
        .map((r) => getResolutionHours(r))
        .filter((time): time is number => time !== null);

      const avgTime = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
      const sorted = [...times].sort((a, b) => a - b);
      const medianTime = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

      return {
        severity: getSeverityLabel(severity),
        averageTime: avgTime,
        medianTime,
        count: severityReports.length,
      };
    });

    let withinSLA = 0;
    let breachedSLA = 0;
    const now = Date.now();

    reports.forEach((report) => {
      const filed = getFiledAt(report);
      if (!filed) return;
      const firstResponse = getFirstResponseAt(report);
      const elapsedHours = ((firstResponse ? firstResponse.getTime() : now) - filed.getTime()) / (1000 * 60 * 60);

      if (!firstResponse && elapsedHours <= RESPONSE_SLA_HOURS) {
        return;
      }

      if (firstResponse && elapsedHours <= RESPONSE_SLA_HOURS) {
        withinSLA += 1;
      } else {
        breachedSLA += 1;
      }
    });

    const total = withinSLA + breachedSLA;

    return {
      averageResolutionTime,
      medianResolutionTime,
      byCategory,
      bySeverity,
      slaCompliance: {
        total,
        withinSLA,
        breachedSLA,
        complianceRate: total > 0 ? (withinSLA / total) * 100 : 0,
        windowHours: RESPONSE_SLA_HOURS,
        windowLabel: RESPONSE_SLA_LABEL,
      },
    };
  }

  private static buildHandlerPerformanceAnalysis(reports: AdminReport[]): HandlerPerformanceAnalysis {
    const assignedReports = reports.filter((r) => r.assignedTo);
    const handlerMap = new Map<string, AdminReport[]>();

    assignedReports.forEach((report) => {
      if (!report.assignedTo) return;
      const existing = handlerMap.get(report.assignedTo) || [];
      handlerMap.set(report.assignedTo, [...existing, report]);
    });

    const handlers = Array.from(handlerMap.entries()).map(([handlerId, handlerReports]) => {
      const resolved = handlerReports.filter((r) => isResolvedStatus(r.status));
      const inProgress = handlerReports.filter((r) => isInProgressStatus(r.status));
      const resolutionTimes = resolved
        .map((r) => getResolutionHours(r))
        .filter((time): time is number => time !== null);

      const avgTime =
        resolutionTimes.length > 0
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
        resolutionRate: handlerReports.length > 0 ? (resolved.length / handlerReports.length) * 100 : 0,
      };
    });

    const topPerformers = [
      ...handlers
        .sort((a, b) => b.resolutionRate - a.resolutionRate)
        .slice(0, 3)
        .map((h) => ({
          handlerId: h.handlerId,
          handlerName: h.handlerName,
          metric: 'Resolution Rate',
          value: h.resolutionRate,
        })),
      ...handlers
        .filter((h) => h.averageResolutionTime > 0)
        .sort((a, b) => a.averageResolutionTime - b.averageResolutionTime)
        .slice(0, 3)
        .map((h) => ({
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
  }

  private static calculateCategoryTrend(
    reports: AdminReport[],
    category: string,
    startDate: Date,
    endDate: Date
  ): 'increasing' | 'decreasing' | 'stable' {
    const start = startOfDay(startDate).getTime();
    const end = endOfDay(endDate).getTime();
    const mid = start + (end - start) / 2;

    const firstHalf = reports.filter((report) => {
      if (getCanonicalCategory(report) !== category) return false;
      const filed = getFiledAt(report);
      return filed ? filed.getTime() < mid : false;
    }).length;

    const secondHalf = reports.filter((report) => {
      if (getCanonicalCategory(report) !== category) return false;
      const filed = getFiledAt(report);
      return filed ? filed.getTime() >= mid : false;
    }).length;

    return calculateTrend(secondHalf, firstHalf).direction;
  }

  private static getIncidentHour(report: AdminReport): number {
    const period = String(report.incidentTime || '').toUpperCase();
    if (period === 'AM') return 9;
    if (period === 'PM') return 15;
    const filed = getFiledAt(report);
    return filed ? getHours(filed) : 0;
  }

  private static getIncidentDay(report: AdminReport): Date | null {
    return safeToDate(report.incidentDate) || getFiledAt(report);
  }

  private static generateWeeklyDataPoints(
    reports: AdminReport[],
    filterValue: string,
    filterType: 'category' | 'severity' | 'location'
  ): Array<{ date: Date; count: number }> {
    const weeklyData: Record<string, number> = {};

    reports
      .filter((r) => {
        if (filterType === 'category') return getCanonicalCategory(r) === filterValue;
        if (filterType === 'severity') return getCanonicalSeverity(r) === filterValue;
        if (filterType === 'location') return getCaseLocation(r) === filterValue;
        return false;
      })
      .forEach((r) => {
        const date = getFiledAt(r);
        if (!date) return;
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
