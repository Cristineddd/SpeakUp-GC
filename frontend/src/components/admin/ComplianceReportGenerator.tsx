/**
 * Compliance Report Generator Component
 * UI for generating privacy-compliant reports with configuration options
 */

import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Shield,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { ComplianceReportService } from '../../services/complianceReportService';
import {
  ComplianceReportType,
  DateRangePreset,
  ComplianceSummaryReport,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_CATEGORIES,
  getReportCategory,
  DATE_RANGE_LABELS,
  getDateRangeFromPreset,
} from '../../types/complianceReport';
import { endOfDay, format, startOfDay } from 'date-fns';
import { addBrandedPdfFooter, addBrandedPdfHeader, getSpeakUpLogoDataUrl } from '../../utils/pdfBranding';
import { formatDurationHours } from '../../utils/complianceAnalytics';

interface ComplianceReportGeneratorProps {
  onReportGenerated?: (report: ComplianceSummaryReport) => void;
}

export const ComplianceReportGenerator: React.FC<ComplianceReportGeneratorProps> = ({
  onReportGenerated,
}) => {
  const [reportType, setReportType] = useState<ComplianceReportType>('monthly_summary');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [anonymizeData, setAnonymizeData] = useState(true);
  const [includePersonalData, setIncludePersonalData] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ComplianceSummaryReport | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);

      // Get date range
      let startDate: Date, endDate: Date;
      if (dateRangePreset === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast({
            title: 'Invalid Date Range',
            description: 'Please select both start and end dates',
            variant: 'destructive',
          });
          return;
        }
        const [sy, sm, sd] = customStartDate.split('-').map(Number);
        const [ey, em, ed] = customEndDate.split('-').map(Number);
        startDate = startOfDay(new Date(sy, sm - 1, sd));
        endDate = endOfDay(new Date(ey, em - 1, ed));
      } else {
        const range = getDateRangeFromPreset(dateRangePreset);
        startDate = range.start;
        endDate = range.end;
      }

      // Generate report
      const report = await ComplianceReportService.generateComplianceSummaryReport({
        type: reportType,
        startDate,
        endDate,
        includePersonalData,
        anonymizeData,
      });

      setGeneratedReport(report);
      onReportGenerated?.(report);

      toast({
        title: 'Report Generated',
        description: `${REPORT_TYPE_LABELS[reportType]} has been generated successfully`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!generatedReport) return;

    try {
      const doc = new jsPDF();
      const logo = await getSpeakUpLogoDataUrl();
      let yPos = addBrandedPdfHeader(
        doc,
        'Compliance Report',
        REPORT_TYPE_LABELS[generatedReport.reportType],
        logo
      );

      const ensureSpace = (needed = 40) => {
        if (yPos + needed < 270) return;
        doc.addPage();
        yPos = addBrandedPdfHeader(doc, 'Compliance Report (continued)', undefined, logo);
      };

      // Report info - Compact and Clean
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Period:', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${format(generatedReport.period.start, 'MMM dd, yyyy')} - ${format(generatedReport.period.end, 'MMM dd, yyyy')}`,
        35,
        yPos
      );
      yPos += 5;
      
      doc.text('Generated:', 15, yPos);
      doc.text(format(generatedReport.generatedAt, 'MMM dd, yyyy HH:mm'), 35, yPos);
      yPos += 5;
      
      doc.text('Privacy:', 15, yPos);
      doc.text(
        generatedReport.anonymized ? 'Anonymized' : 'Personal Data Included',
        35,
        yPos
      );
      yPos += 12;
      
      // Summary statistics - Clean Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Summary Statistics', 15, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const summaryData = [
        ['Total Incidents', generatedReport.summary.totalIncidents.toString()],
        ['Anonymous Filings', `${generatedReport.summary.anonymousIncidents ?? 0} (${(generatedReport.summary.anonymousRate ?? 0).toFixed(1)}%)`],
        ['Identified Filings', `${generatedReport.summary.identifiedIncidents ?? 0} (${(generatedReport.summary.identifiedRate ?? 0).toFixed(1)}%)`],
        ['Resolved', generatedReport.summary.resolvedIncidents.toString()],
        ['In Progress', generatedReport.summary.inProgressIncidents.toString()],
        ['Pending', generatedReport.summary.pendingIncidents.toString()],
        ['Dismissed / Closed', generatedReport.summary.dismissedIncidents.toString()],
        ['Resolution Rate', `${generatedReport.summary.resolutionRate.toFixed(1)}%`],
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: 15, right: 15, bottom: 18 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Complainant filing identity
      if (generatedReport.frequencyAnalysis?.byFilingIdentity?.length) {
        ensureSpace();

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Complainant Filing Identity', 15, yPos);
        yPos += 6;

        const identityData = generatedReport.frequencyAnalysis.byFilingIdentity.map((item) => [
          item.label,
          item.count.toString(),
          `${item.percentage.toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Filing Type', 'Count', 'Share']],
          body: identityData,
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
          headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          margin: { left: 15, right: 15, bottom: 18 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        if (generatedReport.frequencyAnalysis.byComplainantType?.length) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Complainant Role at Filing', 15, yPos);
          yPos += 5;

          const roleData = generatedReport.frequencyAnalysis.byComplainantType.map((row) => [
            row.label,
            row.count.toString(),
            `${row.percentage.toFixed(1)}%`,
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Role', 'Count', 'Share']],
            body: roleData,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: 15, right: 15, bottom: 18 },
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        if (generatedReport.frequencyAnalysis.identityByCategory?.length) {
          ensureSpace();

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Anonymous vs Identified by Category', 15, yPos);
          yPos += 5;

          const categoryIdentityData = generatedReport.frequencyAnalysis.identityByCategory.map((row) => [
            row.categoryLabel,
            row.anonymous.toString(),
            row.identified.toString(),
            row.total.toString(),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Category', 'Anonymous', 'Identified', 'Total']],
            body: categoryIdentityData,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: 15, right: 15, bottom: 18 },
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }
      
      // Frequency analysis if available
      if (generatedReport.frequencyAnalysis) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Category Breakdown', 15, yPos);
        yPos += 6;
        
        // Handle both array and object formats for byCategory
        const categoryArray = Array.isArray(generatedReport.frequencyAnalysis.byCategory)
          ? generatedReport.frequencyAnalysis.byCategory
          : Object.entries(generatedReport.frequencyAnalysis.byCategory).map(([category, data]: [string, any]) => ({
              category,
              count: data.count,
              percentage: data.percentage,
            }));
        
        const categoryData = categoryArray.map(item => [
          (item.category || 'Unknown').replace(/_/g, ' ').toUpperCase(),
          item.count?.toString() || '0',
          `${(item.percentage || 0).toFixed(1)}%`,
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Count', 'Percentage']],
          body: categoryData.length > 0 ? categoryData : [['No data', '0', '0%']],
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'left',
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250],
          },
          margin: { left: 15, right: 15, bottom: 18 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Resolution time analysis if available
      if (generatedReport.resolutionTimeAnalysis) {
        ensureSpace();
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Resolution Time Analysis', 15, yPos);
        yPos += 6;
        
        const resolutionData = [
          ['Average Resolution Time', formatDurationHours(generatedReport.resolutionTimeAnalysis.averageResolutionTime)],
          ['Median Resolution Time', formatDurationHours(generatedReport.resolutionTimeAnalysis.medianResolutionTime)],
          ['Response SLA', generatedReport.resolutionTimeAnalysis.slaCompliance.windowLabel || '7-day first-response window'],
          ['SLA Compliance Rate', `${generatedReport.resolutionTimeAnalysis.slaCompliance.complianceRate.toFixed(1)}%`],
          ['Within SLA', `${generatedReport.resolutionTimeAnalysis.slaCompliance.withinSLA} cases`],
          ['Breached SLA', `${generatedReport.resolutionTimeAnalysis.slaCompliance.breachedSLA} cases`],
        ];
        
        autoTable(doc, {
          startY: yPos,
          body: resolutionData,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250],
          },
          margin: { left: 15, right: 15, bottom: 18 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Trend analysis if available
      if (generatedReport.trendAnalysis) {
        ensureSpace();
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Trend Analysis', 15, yPos);
        yPos += 6;
        
        const trendData = [
          ['Current Period', `${generatedReport.trendAnalysis.overallTrend.currentPeriodCount} incidents`],
          ['Previous Period', `${generatedReport.trendAnalysis.overallTrend.previousPeriodCount} incidents`],
          ['Trend Direction', generatedReport.trendAnalysis.overallTrend.direction.toUpperCase()],
          ['Change', `${generatedReport.trendAnalysis.overallTrend.percentageChange > 0 ? '+' : ''}${generatedReport.trendAnalysis.overallTrend.percentageChange.toFixed(1)}%`],
        ];
        
        autoTable(doc, {
          startY: yPos,
          body: trendData,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250],
          },
          margin: { left: 15, right: 15, bottom: 18 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Handler performance if available
      if (generatedReport.handlerPerformanceAnalysis) {
        ensureSpace();
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Staff Performance Summary', 15, yPos);
        yPos += 6;
        
        const handlerData = generatedReport.handlerPerformanceAnalysis.handlers.slice(0, 10).map(handler => [
          handler.handlerName,
          handler.casesAssigned.toString(),
          handler.casesResolved.toString(),
          `${handler.resolutionRate.toFixed(1)}%`,
          formatDurationHours(handler.averageResolutionTime),
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Staff Member', 'Assigned', 'Resolved', 'Success Rate', 'Avg Time']],
          body: handlerData,
          theme: 'plain',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'left',
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250],
          },
          margin: { left: 15, right: 15, bottom: 18 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addBrandedPdfFooter(doc, i, pageCount, 'Confidential — SpeakUp GC Compliance Report');
      }
      
      doc.save(`compliance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: 'Export Successful',
        description: 'Report exported as PDF',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!generatedReport) return;

    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Header
      csvContent += `SpeakUp GC Compliance Report\n`;
      csvContent += `Report Type: ${REPORT_TYPE_LABELS[generatedReport.reportType]}\n`;
      csvContent += `Period: ${format(generatedReport.period.start, 'yyyy-MM-dd')} to ${format(generatedReport.period.end, 'yyyy-MM-dd')}\n`;
      csvContent += `Generated: ${format(generatedReport.generatedAt, 'yyyy-MM-dd HH:mm')}\n`;
      csvContent += `Privacy: ${generatedReport.anonymized ? 'Anonymized' : 'Personal Data Included'}\n\n`;
      
      // Summary
      csvContent += `Summary Statistics\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Incidents,${generatedReport.summary.totalIncidents}\n`;
      csvContent += `Anonymous Filings,${generatedReport.summary.anonymousIncidents ?? 0}\n`;
      csvContent += `Identified Filings,${generatedReport.summary.identifiedIncidents ?? 0}\n`;
      csvContent += `Anonymous Rate,${(generatedReport.summary.anonymousRate ?? 0).toFixed(1)}%\n`;
      csvContent += `Identified Rate,${(generatedReport.summary.identifiedRate ?? 0).toFixed(1)}%\n`;
      csvContent += `Resolved,${generatedReport.summary.resolvedIncidents}\n`;
      csvContent += `In Progress,${generatedReport.summary.inProgressIncidents}\n`;
      csvContent += `Pending,${generatedReport.summary.pendingIncidents}\n`;
      csvContent += `Dismissed / Closed,${generatedReport.summary.dismissedIncidents}\n`;
      csvContent += `Resolution Rate,${generatedReport.summary.resolutionRate.toFixed(1)}%\n\n`;
      
      // Frequency analysis
      if (generatedReport.frequencyAnalysis) {
        if (generatedReport.frequencyAnalysis.byFilingIdentity?.length) {
          csvContent += `Filing Identity\n`;
          csvContent += `Type,Count,Percentage\n`;
          generatedReport.frequencyAnalysis.byFilingIdentity.forEach((item) => {
            csvContent += `${item.label},${item.count},${item.percentage.toFixed(1)}%\n`;
          });
          csvContent += `\n`;
        }

        if (generatedReport.frequencyAnalysis.byComplainantType?.length) {
          csvContent += `Complainant Role at Filing\n`;
          csvContent += `Role,Count,Percentage\n`;
          generatedReport.frequencyAnalysis.byComplainantType.forEach((row) => {
            csvContent += `${row.label},${row.count},${row.percentage.toFixed(1)}%\n`;
          });
          csvContent += `\n`;
        }

        csvContent += `Frequency Analysis - By Category\n`;
        csvContent += `Category,Count,Percentage\n`;
        const categoryRows = Array.isArray(generatedReport.frequencyAnalysis.byCategory)
          ? generatedReport.frequencyAnalysis.byCategory
          : Object.entries(generatedReport.frequencyAnalysis.byCategory).map(([category, data]: [string, any]) => ({
              category,
              count: data.count,
              percentage: data.percentage,
            }));
        categoryRows.forEach((item) => {
          csvContent += `${item.category},${item.count},${(item.percentage || 0).toFixed(1)}%\n`;
        });
        csvContent += `\n`;
      }
      
      // Resolution time
      if (generatedReport.resolutionTimeAnalysis) {
        csvContent += `Resolution Time Analysis\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `Average Resolution Time,${formatDurationHours(generatedReport.resolutionTimeAnalysis.averageResolutionTime)}\n`;
        csvContent += `Median Resolution Time,${formatDurationHours(generatedReport.resolutionTimeAnalysis.medianResolutionTime)}\n`;
        csvContent += `Response SLA,${generatedReport.resolutionTimeAnalysis.slaCompliance.windowLabel || '7-day first-response window'}\n`;
        csvContent += `SLA Compliance,${generatedReport.resolutionTimeAnalysis.slaCompliance.withinSLA}/${generatedReport.resolutionTimeAnalysis.slaCompliance.total}\n`;
      }
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Export Successful',
        description: 'Report exported as CSV',
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export CSV. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (!generatedReport) return;

    try {
      const jsonString = JSON.stringify(generatedReport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Successful',
        description: 'Report exported as JSON',
      });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export JSON. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Export All Formats
  const handleExportAll = async () => {
    if (!generatedReport) return;

    try {
      // Small delay between downloads to prevent browser blocking
      handleExportPDF();
      await new Promise(resolve => setTimeout(resolve, 500));
      handleExportCSV();
      await new Promise(resolve => setTimeout(resolve, 500));
      handleExportJSON();
      
      toast({
        title: 'Export Complete',
        description: 'All formats downloaded successfully (PDF, CSV, JSON)',
      });
    } catch (error) {
      console.error('Error exporting all formats:', error);
      toast({
        title: 'Export Failed',
        description: 'Some formats may not have downloaded. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getReportIcon = (type: ComplianceReportType) => {
    switch (type) {
      case 'frequency_analysis':
      case 'category_breakdown':
        return <BarChart3 className="h-5 w-5" />;
      case 'trend_analysis':
        return <TrendingUp className="h-5 w-5" />;
      case 'resolution_time':
        return <Clock className="h-5 w-5" />;
      case 'handler_performance':
        return <Users className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E1F5EE' }}>
                <FileText className="h-5 w-5" style={{ color: '#1D9E75' }} />
              </div>
              <div>
                <CardTitle className="text-xl">Generate Compliance Report</CardTitle>
                <CardDescription className="text-sm">
                  Create privacy-compliant analytics and reports
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Shield className="h-3.5 w-3.5" style={{ color: '#1D9E75' }} />
              <span className="font-medium">GDPR Compliant</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="report-type" className="text-base font-semibold">Report Type</Label>
              <p className="text-sm text-gray-500 mt-1">
                {REPORT_TYPE_DESCRIPTIONS[reportType]}
              </p>
            </div>
            <Select value={reportType} onValueChange={(value) => setReportType(value as ComplianceReportType)}>
              <SelectTrigger id="report-type" className="h-auto py-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                {/* Compliance & Performance Overview */}
                <div className="px-2 py-2 text-xs font-semibold text-gray-500 border-b">
                  {REPORT_CATEGORIES.OVERVIEW}
                </div>
                <SelectItem value="monthly_summary">
                  <div className="flex items-start gap-3 py-1">
                    <FileText className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.monthly_summary}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Comprehensive monthly overview</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="quarterly_summary">
                  <div className="flex items-start gap-3 py-1">
                    <FileText className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.quarterly_summary}</div>
                      <div className="text-xs text-gray-500 mt-0.5">90-day performance trends</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="annual_summary">
                  <div className="flex items-start gap-3 py-1">
                    <FileText className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.annual_summary}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Year-over-year comparisons</div>
                    </div>
                  </div>
                </SelectItem>

                {/* Analytical & Statistical Reports */}
                <div className="px-2 py-2 text-xs font-semibold text-gray-500 border-b border-t mt-2">
                  {REPORT_CATEGORIES.ANALYTICAL}
                </div>
                <SelectItem value="frequency_analysis">
                  <div className="flex items-start gap-3 py-1">
                    <BarChart3 className="h-4 w-4 mt-0.5 text-blue-600" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.frequency_analysis}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Volume patterns & trends</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="trend_analysis">
                  <div className="flex items-start gap-3 py-1">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-purple-600" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.trend_analysis}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Historical analysis & predictions</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="category_breakdown">
                  <div className="flex items-start gap-3 py-1">
                    <BarChart3 className="h-4 w-4 mt-0.5 text-indigo-600" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.category_breakdown}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Classification statistics</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="location_analysis">
                  <div className="flex items-start gap-3 py-1">
                    <BarChart3 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.location_analysis}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Campus location distribution</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="severity_analysis">
                  <div className="flex items-start gap-3 py-1">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-red-600" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.severity_analysis}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Harassment degree / severity mix</div>
                    </div>
                  </div>
                </SelectItem>

                {/* Performance & Metrics Reports */}
                <div className="px-2 py-2 text-xs font-semibold text-gray-500 border-b border-t mt-2">
                  {REPORT_CATEGORIES.PERFORMANCE}
                </div>
                <SelectItem value="resolution_time">
                  <div className="flex items-start gap-3 py-1">
                    <Clock className="h-4 w-4 mt-0.5 text-amber-600" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.resolution_time}</div>
                      <div className="text-xs text-gray-500 mt-0.5">SLA compliance & timings</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="handler_performance">
                  <div className="flex items-start gap-3 py-1">
                    <Users className="h-4 w-4 mt-0.5 text-teal-600" />
                    <div>
                      <div className="font-medium">{REPORT_TYPE_LABELS.handler_performance}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Staff efficiency & workload</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Report Type Info */}
          {['monthly_summary', 'quarterly_summary', 'annual_summary'].includes(reportType) ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-700">
                <strong>Complete Report:</strong> This report includes all available analyses (Frequency, Trends, Resolution Metrics, and Staff Performance).
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Focused Report:</strong> This report contains detailed in-depth analysis of one specific area.
              </div>
            </div>
          )}

          {/* Date Range Selection */}
          <div className="space-y-2">
            <Label htmlFor="date-range">Date Range</Label>
            <Select value={dateRangePreset} onValueChange={(value) => setDateRangePreset(value as DateRangePreset)}>
              <SelectTrigger id="date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range (if selected) */}
          {dateRangePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Shield className="h-4 w-4" style={{ color: '#1D9E75' }} />
              Privacy & Compliance Settings
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="anonymize">Anonymize Personal Data</Label>
                <p className="text-sm text-gray-500">
                  Replace names and emails with generic identifiers
                </p>
              </div>
              <Switch
                id="anonymize"
                checked={anonymizeData}
                onCheckedChange={setAnonymizeData}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="personal-data">Include Personal Data</Label>
                <p className="text-sm text-gray-500">
                  Include names and contact information (requires authorization)
                </p>
              </div>
              <Switch
                id="personal-data"
                checked={includePersonalData}
                onCheckedChange={setIncludePersonalData}
                disabled={anonymizeData}
              />
            </div>

            {includePersonalData && !anonymizeData && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Including personal data requires proper authorization
                  and must comply with GDPR and data protection regulations.
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateReport}
            disabled={generating}
            className="w-full text-white"
            style={{ backgroundColor: '#1D9E75' }}
            size="lg"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Report...
              </>
            ) : (
              <>
                {getReportIcon(reportType)}
                <span className="ml-2">Generate {REPORT_TYPE_LABELS[reportType]}</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Report Preview */}
      {generatedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Report Generated Successfully
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    {REPORT_TYPE_LABELS[generatedReport.reportType]}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {format(generatedReport.period.start, 'MMM dd, yyyy')} -{' '}
                  {format(generatedReport.period.end, 'MMM dd, yyyy')}
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Export Report</DialogTitle>
                    <DialogDescription>
                      Download in single or multiple formats
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {/* Export All - Primary Option */}
                    <Button 
                      className="w-full text-white"
                      style={{ backgroundColor: '#1D9E75' }}
                      onClick={() => handleExportAll()}
                      disabled={!generatedReport}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All Formats (PDF + CSV + JSON)
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">Or choose individual format</span>
                      </div>
                    </div>

                    {/* Individual Export Options */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="justify-start"
                        onClick={() => handleExportPDF()}
                        disabled={!generatedReport}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF Only
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start"
                        onClick={() => handleExportCSV()}
                        disabled={!generatedReport}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        CSV Only
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start"
                        onClick={() => handleExportJSON()}
                        disabled={!generatedReport}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        JSON Only
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Excel (Soon)
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-white border border-gray-200 rounded-xl">
                <div className="text-3xl font-bold text-gray-900">
                  {generatedReport.summary.totalIncidents}
                </div>
                <div className="text-sm text-gray-500 font-medium mt-1">Total Incidents</div>
              </div>
              <div className="p-5 bg-white border border-gray-200 rounded-xl">
                <div className="text-3xl font-bold text-gray-900">
                  {generatedReport.summary.resolvedIncidents}
                </div>
                <div className="text-sm text-gray-500 font-medium mt-1">Resolved</div>
              </div>
              <div className="p-5 bg-white border border-gray-200 rounded-xl">
                <div className="text-3xl font-bold text-gray-900">
                  {generatedReport.summary.inProgressIncidents}
                </div>
                <div className="text-sm text-amber-600 font-medium mt-1">In Progress</div>
              </div>
              <div className="p-5 bg-white border border-gray-200 rounded-xl">
                <div className="text-3xl font-bold text-gray-900">
                  {generatedReport.summary.resolutionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500 font-medium mt-1">Resolution Rate</div>
              </div>
            </div>

            {/* Compliance Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {generatedReport.dataPrivacyCompliant && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Privacy Compliant
                </Badge>
              )}
              {generatedReport.anonymized && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  Data Anonymized
                </Badge>
              )}
              {!generatedReport.personalDataIncluded && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  No Personal Data
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
