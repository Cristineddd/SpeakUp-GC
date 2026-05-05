import React, { useState, useEffect, type JSX } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Edit,
  Filter,
  Download,
  Calendar,
  User,
  MapPin,
  Search,
  Trash2,
  UserPlus,
  MessageCircle,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useRepresentativeRole } from "../../hooks/useRepresentativeRole";
import { AdminReportService, AdminReport, ReportStats } from "../../services/adminReportService";
import { format } from "date-fns";
import { useNavigate } from "../../compat/router";
import { AssignHandlerDialog } from "../../components/admin/AssignHandlerDialog";
import { HandlerTimeline } from "../../components/admin/HandlerTimeline";
import { ReportStatusManager } from "../../components/case/ReportStatusManager";
import { ROLE_LABELS, ROLE_COLORS } from "../../types/representative";
import { EscalationBadge, SLAIndicator, CompactEscalationInfo } from "../../components/admin/EscalationBadge";
import { EscalationControls } from "../../components/admin/EscalationControls";
import { ESCALATION_LABELS } from "../../types/escalation";
import type { EscalationLevel } from "../../types/escalation";
import LocationMapPicker from "../../components/forms/LocationMapPicker";

// Safe data access helper
const safeGet = (obj: any, path: string, fallback: any = 'N/A') => {
  try {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
};

// Safe date conversion helpers
const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  try {
    // Handle Firestore timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Handle regular date objects or strings
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Failed to convert timestamp to date:', error);
    return null;
  }
};

const safeFormat = (timestamp: any, formatStr: string, fallback: string = 'N/A'): string => {
  const date = safeToDate(timestamp);
  if (!date) return fallback;
  
  try {
    return format(date, formatStr);
  } catch (error) {
    console.warn('Failed to format date:', error);
    return fallback;
  }
};

// Get file type from URL
// FIXED: Improved file type detection for Cloudinary URLs
const getFileType = (url: string): string => {
  try {
    if (!url) return 'unknown';
    
    // Extract file extension from URL (handle query parameters)
    const urlWithoutParams = url.split('?')[0];
    const extension = urlWithoutParams.split('.').pop()?.toLowerCase() || '';
    
    // Check by extension
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
      return 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return 'video';
    } else if (['pdf'].includes(extension)) {
      return 'document';
    } else if (['doc', 'docx', 'txt', 'xlsx', 'xls'].includes(extension)) {
      return 'document';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
      return 'audio';
    }
    
    // Check Cloudinary URL patterns
    if (url.includes('cloudinary')) {
      if (url.includes('/image/') || url.includes('/upload/')) {
        return 'image';
      } else if (url.includes('/video/')) {
        return 'video';
      } else if (url.includes('/raw/') || url.includes('/pdf')) {
        return 'document';
      }
    }
    
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
};

// FIXED: URL validation to prevent 401 errors from invalid URLs
const isValidCloudinaryUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    // Must be HTTPS and include cloudinary or be a valid HTTP(S) URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    // Check if it's a Cloudinary URL
    if (url.includes('cloudinary.com')) {
      return true;
    }
    
    // Could be other valid URL, but be restrictive to avoid 401 errors
    // Only allow cloudinary to be safe
    return false;
  } catch (error) {
    return false;
  }
};

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { role, representativeData } = useRepresentativeRole();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [representativeId, setRepresentativeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [escalationFilter, setEscalationFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [reportToAssign, setReportToAssign] = useState<AdminReport | null>(null);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [reportToEscalate, setReportToEscalate] = useState<AdminReport | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{url: string; index: number; total: number} | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [videoViewerOpen, setVideoViewerOpen] = useState(false);
  
  // FIXED: Evidence caching to prevent repetitive processing
  const [evidenceCache] = useState(new Map<string, string[]>());
  
  const { toast } = useToast();

  // Check if user is a handler (not admin)
  const isHandler = role === 'handler' && !isAdmin;

  // Get representative ID for handlers (use representativeData from hook)
  useEffect(() => {
    if (isHandler && representativeData) {
      console.log('✅ Handler representative found:', representativeData);
      console.log('👤 Handler ID:', representativeData.id);
      console.log('📧 Handler email:', representativeData.email);
      console.log('📛 Handler name:', representativeData.displayName);
      setRepresentativeId(representativeData.id);
    } else if (isHandler && !representativeData) {
      console.warn('⚠️ Handler but no representative data found');
      console.warn('💡 User ID:', currentUser?.uid);
      console.warn('💡 Make sure this user has a representative entry in Firestore');
      setRepresentativeId(null);
    } else {
      console.log('ℹ️ Not a handler', { isHandler, hasRepData: !!representativeData });
    }
  }, [isHandler, representativeData, currentUser]);

  // FIXED: Real-time reports listener
  useEffect(() => {
    setLoading(true);
    
    console.log('🔍 Setting up real-time reports listener...');
    
    const unsubscribe = AdminReportService.subscribeToAllReports((fetchedReports) => {
      console.log(`🔄 Real-time update: ${fetchedReports.length} reports received`);
      
      // Filter reports for handlers
      let displayReports = fetchedReports;
      
      if (isHandler && representativeId) {
        console.log('🔍 Filtering reports for handler:', representativeId);
        displayReports = fetchedReports.filter(report => 
          report.assignedTo === representativeId
        );
        console.log(`📊 Handler has ${displayReports.length} assigned cases`);
      }
      
      // DEBUG: Log assignment info
      fetchedReports.forEach(report => {
        if (report.assignedTo) {
          console.log(`🔍 ${report.id}: ${report.title}`, {
            assignedTo: report.assignedTo,
            assignedToName: report.assignedToName,
            status: report.status
          });
        }
      });
      
      setReports(displayReports);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up real-time listener');
      unsubscribe();
    };
  }, [isHandler, representativeId]);

  // Apply filters when reports or filter values change
  useEffect(() => {
    applyFilters();
  }, [reports, searchTerm, statusFilter, categoryFilter, severityFilter, escalationFilter]);

  // DEBUG: Monitor reports changes
  useEffect(() => {
    console.log('🔄 Reports updated:', reports.length);
    if (reports.length > 0) {
      console.log('📋 Sample report[0] assignment:', {
        id: reports[0].id,
        title: reports[0].title,
        assignedTo: reports[0].assignedTo,
        assignedToName: reports[0].assignedToName,
        assignedToRole: reports[0].assignedToRole
      });
    }
  }, [reports]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const fetchedReports = await AdminReportService.getAllReports();
      
      // Filter reports for handlers
      let displayReports = fetchedReports;
      
      if (isHandler && representativeId) {
        console.log('🔍 Filtering reports for handler:', representativeId);
        displayReports = fetchedReports.filter(report => 
          report.assignedTo === representativeId
        );
        console.log(`📊 Handler has ${displayReports.length} assigned cases out of ${fetchedReports.length} total`);
      }
      
      setReports(displayReports);
      console.log('📊 Fetched reports:', displayReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reports. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const reportStats = await AdminReportService.getReportStats();
      setStats(reportStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        safeGet(report, 'title', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'description', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'location', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'userName', '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => safeGet(report, 'status') === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(report => safeGet(report, 'category') === categoryFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(report => safeGet(report, 'severity') === severityFilter);
    }

    // Escalation filter
    if (escalationFilter !== 'all') {
      const level = parseInt(escalationFilter);
      filtered = filtered.filter(report => (report.escalationLevel || 0) === level);
    }

    setFilteredReports(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-gray-100 text-gray-800';
      case 'inProgress': return 'bg-gray-100 text-gray-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-gray-100 text-gray-800';
      case 'high': return 'bg-gray-100 text-gray-800';
      case 'critical': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !newStatus) return;

    try {
      await AdminReportService.updateReportStatusFromBothCollections(
        selectedReport.id, 
        newStatus
      );
      
      toast({
        title: "Success",
        description: "Report status updated successfully.",
      });
      
      // Refresh data
      fetchReports();
      fetchStats();
      setSelectedReport(null);
      setNewNote('');
      setNewStatus('');
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    }
  };

  const handleQuickStatusUpdate = async (reportId: string, status: AdminReport['status']) => {
    try {
      await AdminReportService.updateReportStatusFromBothCollections(reportId, status);
      
      toast({
        title: "Success",
        description: `Report status updated to ${status.replace(/([A-Z])/g, ' $1').trim()}.`,
      });
      
      // Refresh data
      fetchReports();
      fetchStats();
      
    } catch (error) {
      console.error('Error updating report status:', error);
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    }
  };

  const handleExportConfirmation = () => {
    setExportDialogOpen(true);
  };

  const exportReports = async () => {
    if (filteredReports.length === 0) {
      toast({
        title: "No Data",
        description: "There are no reports to export with the current filters.",
        variant: "destructive",
      });
      setExportDialogOpen(false);
      return;
    }

    setExporting(true);
    
    try {
      const doc = new jsPDF({ 
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Load Poppins font (you'll need to add the font files)
      // For now, we'll use helvetica as fallback
      const font = 'helvetica';
      
      // Clean minimalist design with compact layout
      doc.setFont(font, 'bold');
      doc.setFontSize(16);
      doc.setTextColor(45, 55, 72);
      doc.text('SPEAKUP GC REPORTS', 15, 15);
      
      doc.setFont(font, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 21);
      doc.text(`Total Reports: ${filteredReports.length}`, 15, 25);
      
      // Thin separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, 28, 280, 28);

      // Prepare compact table data
      const tableData = filteredReports.map(report => [
        safeGet(report, 'id', '').substring(0, 6) + '...',
        safeGet(report, 'title', 'No Title').substring(0, 30) + (safeGet(report, 'title', '').length > 30 ? '...' : ''),
        safeGet(report, 'category', 'N/A'),
        safeGet(report, 'severity', 'N/A').toUpperCase(),
        safeGet(report, 'status', 'N/A').replace(/([A-Z])/g, ' $1').trim(),
        safeGet(report, 'userName', 'Unknown').substring(0, 15) + (safeGet(report, 'userName', '').length > 15 ? '...' : ''),
        safeGet(report, 'location', 'N/A').substring(0, 20) + (safeGet(report, 'location', '').length > 20 ? '...' : ''),
        safeFormat(safeGet(report, 'incidentDate'), 'MM/dd/yy', 'N/A'),
        safeFormat(safeGet(report, 'reportedAt'), 'MM/dd/yy', 'N/A'),
        (report.escalationLevel || 0) > 0 ? `Level ${report.escalationLevel}` : 'Normal'
      ]);

      // Create compact table - MAXIMIZED WIDTH
      autoTable(doc, {
        startY: 32,
        head: [[
          'ID', 'Title', 'Category', 'Severity', 'Status', 'Reporter', 'Location', 'Incident', 'Reported', 'Escalation'
        ]],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 7, 
          cellPadding: 1.5,
          textColor: [45, 55, 72],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          font: font,
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [248, 250, 252],
          textColor: [45, 55, 72],
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 2,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 6.5,
          halign: 'center',
        },
        alternateRowStyles: { 
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },  // ID
          1: { cellWidth: 50, halign: 'left' },    // Title - MAXIMIZED
          2: { cellWidth: 28, halign: 'left' },    // Category
          3: { cellWidth: 18, halign: 'center' },  // Severity
          4: { cellWidth: 22, halign: 'center' },  // Status
          5: { cellWidth: 28, halign: 'left' },    // Reporter
          6: { cellWidth: 35, halign: 'left' },    // Location - MAXIMIZED
          7: { cellWidth: 18, halign: 'center' },  // Incident Date
          8: { cellWidth: 18, halign: 'center' },  // Reported Date
          9: { cellWidth: 20, halign: 'center' },  // Escalation
        },
        margin: { left: 5, right: 5 },  // MINIMAL MARGINS
        tableWidth: 'auto',  // Auto width for centering
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      // Compact footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.setFont(font, 'normal');
        doc.text('Confidential - SpeakUp GC Reports Management System', 15, 200);
        doc.text(`Page ${i} of ${pageCount}`, 270, 200, { align: 'right' });
      }

      // Save with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`speakup-gc-reports-${timestamp}.pdf`);

      toast({
        title: "Export Successful",
        description: `PDF exported with ${filteredReports.length} reports in compact format.`,
      });

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
      setExportDialogOpen(false);
    }
  };

  const handleDebugCollections = async () => {
    console.log('🔍 Starting debug of collections...');
    await AdminReportService.debugCollections();
    toast({
      title: "Debug Complete",
      description: "Check the browser console for detailed collection information.",
    });
  };

  const handleCleanupReports = async () => {
    try {
      console.log('🧹 Starting cleanup...');
      await AdminReportService.cleanupReports();
      // Real-time subscription will automatically update the data
      toast({
        title: "Cleanup Complete",
        description: "Invalid reports have been removed. Data updated automatically.",
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Cleanup Failed",
        description: "There was an error during cleanup. Check console for details.",
        variant: "destructive"
      });
    }
  };

  // FIXED: Optimized evidence processing for Cloudinary
  const processEvidence = (evidence: any): { fileUrls: string[]; fileTypes: string[] } => {
    try {
      if (!evidence) {
        return { fileUrls: [], fileTypes: [] };
      }
      
      let fileUrls: string[] = [];
      
      // ✅ CHECK 1: Direct Cloudinary URLs in evidenceURLs (NEW STRUCTURE)
      if (evidence.evidenceURLs && Array.isArray(evidence.evidenceURLs)) {
        fileUrls = evidence.evidenceURLs.filter((url: string) => isValidCloudinaryUrl(url));
      }
      // ✅ CHECK 2: Direct array of URLs
      else if (Array.isArray(evidence)) {
        fileUrls = evidence.filter(url => isValidCloudinaryUrl(url));
      }
      // ✅ CHECK 3: Old structure with fileUrls
      else if (evidence.fileUrls && Array.isArray(evidence.fileUrls)) {
        fileUrls = evidence.fileUrls.filter(url => isValidCloudinaryUrl(url));
      }
      // ✅ CHECK 4: Cloudinary URL directly in evidence object
      else if (evidence.url && isValidCloudinaryUrl(evidence.url)) {
        fileUrls = [evidence.url];
      }
      // ✅ CHECK 5: Extract from nested object structure
      else if (typeof evidence === 'object') {
        // Extract all string values that are valid Cloudinary URLs
        const extractUrls = (obj: any): string[] => {
          if (!obj) return [];
          
          if (typeof obj === 'string' && isValidCloudinaryUrl(obj)) {
            return [obj];
          }
          
          if (Array.isArray(obj)) {
            return obj.flatMap(item => extractUrls(item));
          }
          
          if (typeof obj === 'object') {
            return Object.values(obj).flatMap(value => extractUrls(value));
          }
          
          return [];
        };
        
        fileUrls = extractUrls(evidence);
      }
      
      // Remove duplicates and filter valid URLs
      const seenUrls: {[key: string]: boolean} = {};
      fileUrls = fileUrls.filter(url => {
        if (!isValidCloudinaryUrl(url)) {
          return false;
        }
        if (seenUrls[url]) {
          return false;
        }
        seenUrls[url] = true;
        return true;
      });
      
      const fileTypes = fileUrls.map((url: string) => getFileType(url));
      
      return { fileUrls, fileTypes };
    } catch (error) {
      console.error('Error processing evidence:', error);
      return { fileUrls: [], fileTypes: [] };
    }
  };

  // FIXED: Simplified evidence URL getter
  const getEvidenceUrls = (report: AdminReport): string[] => {
    if (!report?.evidence) return [];
    
    const { fileUrls } = processEvidence(report.evidence);
    return fileUrls;
  };

  // FIXED: Cached evidence getter to prevent repetitive processing
  const getCachedEvidenceUrls = (report: AdminReport): string[] => {
    const cacheKey = report.id;
    
    if (evidenceCache.has(cacheKey)) {
      return evidenceCache.get(cacheKey) || [];
    }
    
    const urls = getEvidenceUrls(report);
    evidenceCache.set(cacheKey, urls);
    
    return urls;
  };

  // Helper function to determine which action buttons to show
  const getActionButtons = (report: AdminReport): JSX.Element[] => {
    const baseButtons: JSX.Element[] = [];
    
    // ESCALATION BUTTON - Visible to Admin only
    if (isAdmin) {
      baseButtons.push(
        <Button 
          key="escalation"
          variant="outline" 
          size="sm"
          onClick={() => {
            setReportToEscalate(report);
            setEscalationDialogOpen(true);
          }}
          title="Manage Escalation"
          className={(report.escalationLevel || 0) > 0 ? "text-orange-600" : "text-gray-600"}
        >
          <AlertTriangle className="h-4 w-4" />
        </Button>
      );
    }

    // ASSIGN HANDLER BUTTON - Visible to Admin only
    if (isAdmin) {
      baseButtons.push(
        <Button 
          key="assign"
          variant="outline" 
          size="sm"
          onClick={() => {
            setReportToAssign(report);
            setAssignDialogOpen(true);
          }}
          title="Assign Handler"
          className={report.assignedToName ? "text-blue-600" : "text-gray-600"}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      );
    }

    // VIEW BUTTON - Different views for Admin and Handler
    baseButtons.push(
      <Dialog key="view">
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedReport(report);
            }}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl max-h-[90vh] sm:max-h-[85vh] p-4 sm:p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg sm:text-xl">
              {isAdmin ? "Full Report Details" : "Case Details"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              ID: <span className="font-mono text-xs break-all">{safeGet(report, 'id', 'N/A')}</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(85vh-140px)] pr-2 sm:pr-3 space-y-4">
              {/* Quick Info Cards - Responsive Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                  <p className="text-xs text-gray-600 font-medium">Status</p>
                  <Badge className={`${getStatusColor(safeGet(selectedReport, 'status', 'pending'))} text-xs mt-1`}>
                    {safeGet(selectedReport, 'status', 'pending')}
                  </Badge>
                </div>
                <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                  <p className="text-xs text-gray-600 font-medium">Severity</p>
                  <Badge className={`${getSeverityColor(safeGet(selectedReport, 'severity', 'low'))} text-xs mt-1`}>
                    {safeGet(selectedReport, 'severity', 'low')}
                  </Badge>
                </div>
                <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                  <p className="text-xs text-gray-600 font-medium">Category</p>
                  <p className="text-xs sm:text-sm font-medium mt-1 truncate">{safeGet(selectedReport, 'category', 'N/A')}</p>
                </div>
                <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                  <p className="text-xs text-gray-600 font-medium">Handler</p>
                  <p className="text-xs font-medium mt-1 truncate">{safeGet(selectedReport, 'assignedToName', 'Unassigned')}</p>
                </div>
              </div>

              {/* Compact Grid Layout - Responsive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Report Info - Different views for Admin and Handler */}
                  {isAdmin ? (
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                      <h4 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Case Information
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div><strong>Title:</strong> {safeGet(selectedReport, 'title', 'No title')}</div>
                        <div><strong>Location:</strong> {safeGet(selectedReport, 'location', 'No location')}</div>
                        {(safeGet(selectedReport, 'latitude') || safeGet(selectedReport, 'longitude')) && (
                          <div>
                            <strong>Coordinates:</strong> {
                              (() => {
                                const lat = safeGet(selectedReport, 'latitude');
                                const lng = safeGet(selectedReport, 'longitude');
                                const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
                                const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
                                return (!isNaN(latNum) && !isNaN(lngNum)) 
                                  ? `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`
                                  : 'N/A';
                              })()
                            }
                          </div>
                        )}
                        {safeGet(selectedReport, 'mapAddress') && (
                          <div><strong>Map Address:</strong> {safeGet(selectedReport, 'mapAddress')}</div>
                        )}
                        <div><strong>Incident Date:</strong> {safeFormat(safeGet(selectedReport, 'incidentDate'), 'MMM dd, yyyy')}</div>
                        <div><strong>Reporter:</strong> {safeGet(selectedReport, 'userName', 'Unknown')}</div>
                        <div><strong>Email:</strong> {safeGet(selectedReport, 'userEmail', 'N/A')}</div>
                        <div><strong>Reported On:</strong> {safeFormat(safeGet(selectedReport, 'reportedAt'), 'MMM dd, h:mm a')}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                      <h4 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Report Info
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div><strong>Title:</strong> {safeGet(selectedReport, 'title', 'No title')}</div>
                        <div><strong>Location:</strong> {safeGet(selectedReport, 'location', 'No location')}</div>
                        {(safeGet(selectedReport, 'latitude') || safeGet(selectedReport, 'longitude')) && (
                          <div>
                            <strong>Coordinates:</strong> {
                              (() => {
                                const lat = safeGet(selectedReport, 'latitude');
                                const lng = safeGet(selectedReport, 'longitude');
                                const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
                                const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
                                return (!isNaN(latNum) && !isNaN(lngNum)) 
                                  ? `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`
                                  : 'N/A';
                              })()
                            }
                          </div>
                        )}
                        {safeGet(selectedReport, 'mapAddress') && (
                          <div><strong>Map Address:</strong> {safeGet(selectedReport, 'mapAddress')}</div>
                        )}
                        <div><strong>Date:</strong> {safeFormat(safeGet(selectedReport, 'incidentDate'), 'MMM dd, yyyy')}</div>
                        <p className="mt-2 text-gray-500">Contact admin for reporter details</p>
                      </div>
                    </div>
                  )}

                  {/* Where It Happened - Location Details */}
                  {(() => {
                    const vicinity = safeGet(selectedReport, 'locationVicinity');
                    
                    return (
                      <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-1 text-blue-700">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Where It Happened
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div>
                            <strong>Location Details:</strong>{' '}
                            {vicinity === 'inside' 
                              ? 'Inside College Vicinity' 
                              : vicinity === 'outside' 
                              ? 'Outside College Vicinity' 
                              : vicinity && vicinity !== 'N/A'
                              ? vicinity
                              : 'Not specified'}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Respondent Information */}
                  {(safeGet(selectedReport, 'respondentName') || safeGet(selectedReport, 'respondentAddress')) && (
                    <div className="bg-orange-50 p-2 sm:p-3 rounded-lg border border-orange-100">
                      <h4 className="font-semibold text-xs sm:text-sm mb-2 text-orange-700">Respondent</h4>
                      <div className="space-y-1 text-xs">
                        {safeGet(selectedReport, 'respondentName') && (
                          <div><strong>Name:</strong> {safeGet(selectedReport, 'respondentName')}</div>
                        )}
                        {safeGet(selectedReport, 'respondentAddress') && (
                          <div>
                            <strong>
                              {safeGet(selectedReport, 'respondentName') === 'Unknown/Not Disclosed' 
                                ? 'Physical Description:' 
                                : 'Address:'}
                            </strong> {safeGet(selectedReport, 'respondentAddress')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Description */}
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                    <h4 className="font-semibold text-xs sm:text-sm mb-2">Description</h4>
                    <div className="text-xs bg-white p-2 rounded border max-h-24 overflow-y-auto">
                      {safeGet(selectedReport, 'description', 'No description provided')}
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(safeGet(selectedReport, 'witnesses') || safeGet(selectedReport, 'additionalInfo')) && (
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                      <h4 className="font-semibold text-xs sm:text-sm mb-2 text-gray-700">Additional Information</h4>
                      <div className="space-y-2 text-xs">
                        {safeGet(selectedReport, 'witnesses') && (
                          <div><strong>Witnesses:</strong> {safeGet(selectedReport, 'witnesses')}</div>
                        )}
                        {safeGet(selectedReport, 'additionalInfo') && (
                          <div className="bg-slate-50 p-2 rounded border">
                            {safeGet(selectedReport, 'additionalInfo')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Map - Display if coordinates exist and are valid numbers */}
              {(() => {
                const lat = safeGet(selectedReport, 'latitude');
                const lng = safeGet(selectedReport, 'longitude');
                const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
                const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
                const hasValidCoords = !isNaN(latNum) && !isNaN(lngNum);
                
                return hasValidCoords && (
                  <div className="col-span-1 md:col-span-2">
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                      <h4 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Incident Location Map
                      </h4>
                      <div className="rounded-lg overflow-hidden border max-h-60 sm:max-h-80">
                        <LocationMapPicker
                          onLocationSelect={() => {}} // Read-only, so no selection needed
                          initialLat={latNum}
                          initialLng={lngNum}
                          centerLat={latNum}
                          centerLng={lngNum}
                          selectedCity=""
                          selectedBarangay=""
                        />
                      </div>
                      {safeGet(selectedReport, 'mapAddress') && (
                        <p className="text-xs text-gray-600 mt-2">
                          <strong>Address:</strong> {safeGet(selectedReport, 'mapAddress')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Admin Notes */}
              {safeGet(selectedReport, 'adminNotes') && (
                <div className="bg-indigo-50 p-2 sm:p-3 rounded-lg border border-indigo-100">
                  <h4 className="font-semibold text-xs sm:text-sm mb-2 text-indigo-700">Admin Notes</h4>
                  <div className="text-xs bg-white p-2 rounded border max-h-16 overflow-y-auto">
                    {safeGet(selectedReport, 'adminNotes')}
                  </div>
                </div>
              )}

              {/* Attachments/Evidence */}
              <div>
                <h4 className="font-medium text-xs sm:text-sm mb-2">Attachments</h4>
                
                {(() => {
                  // Use cached version to avoid repetitive processing
                  const evidenceUrls = getCachedEvidenceUrls(selectedReport);
                  
                  if (evidenceUrls.length === 0) {
                    return (
                      <p className="text-xs sm:text-sm text-gray-500">No attachments found</p>
                    );
                  }
                  
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                      {evidenceUrls.map((url: string, index: number) => {
                        const fileName = url.split('/').pop() || `evidence_${index + 1}`;
                        const fileType = getFileType(url);
                        const isImage = fileType === 'image';
                        const isVideo = fileType === 'video';
                        const isPDF = fileType === 'document' && url.toLowerCase().includes('.pdf');
                        
                        return (
                          <div key={index} className="relative group">
                            {isImage ? (
                              // Image display
                              <div 
                                className="relative cursor-pointer"
                                onClick={() => setFullscreenImage({url, index, total: evidenceUrls.length})}
                              >
                                <img 
                                  src={url} 
                                  alt={fileName}
                                  className="w-full h-24 sm:h-32 md:h-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-lg transition-all"
                                  onError={(e) => {
                                    // Fallback for broken images
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTZhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                                  <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-white opacity-0 group-hover:opacity-100 transition-all drop-shadow-lg" />
                                </div>
                                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 px-1.5 sm:h-7 sm:px-2 opacity-0 group-hover:opacity-100 transition-all shadow-md text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = fileName;
                                      link.click();
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // File display for non-images
                              <div className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg border-2 border-gray-200 h-24 sm:h-32 md:h-40">
                                <div className="flex-1 flex flex-col items-center justify-center w-full">
                                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-1" />
                                  <p className="text-xs text-center truncate font-medium line-clamp-2">{fileName}</p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {fileType}
                                  </Badge>
                                </div>
                                <div className="flex gap-1 w-full">
                                  {isVideo ? (
                                    // Video: Opens in modal viewer
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-7 sm:h-8 text-xs"
                                      onClick={() => {
                                        setSelectedVideoUrl(url);
                                        setVideoViewerOpen(true);
                                      }}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  ) : isPDF ? (
                                    // PDF: Opens in modal viewer
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-7 sm:h-8 text-xs"
                                      onClick={() => {
                                        setSelectedPdfUrl(url);
                                        setPdfViewerOpen(true);
                                      }}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  ) : (
                                    // Other files: Link opens in new tab
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-7 sm:h-8 text-xs"
                                      asChild
                                    >
                                      <a href={url} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 sm:h-8 px-1.5 sm:px-2"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = fileName;
                                      link.click();
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Handler Assignment Timeline */}
              {selectedReport.handlerHistory && selectedReport.handlerHistory.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <HandlerTimeline complaint={selectedReport} />
                </div>
              )}

              {/* Update Status Section - Only visible to Case Handlers */}
              {isHandler && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Update Report Status</h4>
                  <ReportStatusManager
                    reportId={selectedReport.id}
                    currentStatus={selectedReport.status as 'pending' | 'submitted' | 'inProgress' | 'resolved' | 'dismissed'}
                    collectionName="complaints"
                    onStatusUpdated={() => {
                      fetchReports();
                      fetchStats();
                      setSelectedReport(null);
                    }}
                    variant="full"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );

    // CHAT BUTTON - Visible to Handler only
    if (isHandler) {
      baseButtons.push(
        <Button 
          key="chat"
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/case-chat/${report.id}`)}
          title="Open Chat with Complainant"
          className="text-blue-600 hover:text-blue-700"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      );
    }

    // No quick status action buttons for handlers - only Eye and Chat icons

    return baseButtons;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate handler stats from current reports
  const getHandlerStats = () => {
    if (!reports) return null;
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      inProgress: reports.filter(r => r.status === 'inProgress').length,
      resolved: reports.filter(r => ['resolved', 'dismissed'].includes(r.status || '')).length,
      escalated: reports.filter(r => (r.escalationLevel || 0) > 0).length
    };
  };

  return (
    <div className="space-y-6">
      {/* Fullscreen Image Viewer Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-[9999] flex flex-col items-center justify-center" onClick={() => setFullscreenImage(null)}>
          <div className="absolute top-4 right-4 flex gap-2 z-[10000]">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = fullscreenImage.url;
                link.download = `attachment_${fullscreenImage.index + 1}.jpg`;
                link.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage(null);
              }}
            >
              ✕ Close
            </Button>
          </div>
          <img 
            src={fullscreenImage.url} 
            alt="Fullscreen view"
            className="max-w-[90%] max-h-[90%] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {fullscreenImage.index + 1} / {fullscreenImage.total}
          </div>
        </div>
      )}

      {/* Handler Dashboard Stats */}
      {isHandler && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getHandlerStats()?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Assigned to you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getHandlerStats()?.pending || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting your review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getHandlerStats()?.inProgress || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently handling
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getHandlerStats()?.resolved || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Completed cases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Escalated</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getHandlerStats()?.escalated || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Elevated priority
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">
            {isHandler ? 'My Assigned Cases' : 'Reports Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isHandler 
              ? 'View and manage cases assigned to you'
              : 'View and manage all incident reports submitted by users'
            }
          </p>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
                  <p className="text-sm text-gray-600">Total Reports</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingReports}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgressReports}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.resolvedReports}</p>
                  <p className="text-sm text-gray-600">Resolved</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="inProgress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="bullying">Bullying</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="discrimination">Discrimination</SelectItem>
                <SelectItem value="violence">Violence</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            {/* Escalation Filter */}
            <Select value={escalationFilter} onValueChange={setEscalationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Escalations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Escalations</SelectItem>
                <SelectItem value="0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    Normal
                  </div>
                </SelectItem>
                <SelectItem value="1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    Priority
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                    Urgent
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    Critical
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
                setSeverityFilter('all');
                setEscalationFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reports ({filteredReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">
                {reports.length === 0 
                  ? "No reports have been submitted yet." 
                  : "No reports match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Reporter</TableHead>
                  {/* Only show Handler column for admins, not for handlers */}
                  {!isHandler && <TableHead>Handler</TableHead>}
                  <TableHead>Escalation</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const reportEvidence = processEvidence(safeGet(report, 'evidence'));
                  
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{safeGet(report, 'title', 'No Title')}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {safeGet(report, 'location', 'No location')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {safeGet(report, 'userName', 'Unknown')}
                        </div>
                      </TableCell>
                      {/* Only show Handler column for admins */}
                      {!isHandler && (
                        <TableCell>
                          {report.assignedToName ? (
                            <div className="space-y-1">
                              <div className="font-medium text-sm flex items-center gap-2">
                                <User className="h-4 w-4 text-green-500" />
                                {report.assignedToName}
                              </div>
                              {report.assignedToRole && (
                                <Badge className={ROLE_COLORS[report.assignedToRole as any] || 'bg-gray-100 text-gray-800'}>
                                  {ROLE_LABELS[report.assignedToRole as any] || report.assignedToRole}
                                </Badge>
                              )}
                              {report.assignedAt && (
                                <div className="text-xs text-gray-500">
                                  Assigned: {safeFormat(report.assignedAt, 'MMM dd, HH:mm')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <User className="h-4 w-4" />
                              Unassigned
                            </div>
                          )}
                        </TableCell>
                      )}
                      {/* Escalation Column */}
                      <TableCell>
                        <CompactEscalationInfo
                          level={(report.escalationLevel || 0) as EscalationLevel}
                          hoursUnprocessed={report.hoursUnprocessed || 0}
                          slaBreached={report.slaBreached || false}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(safeGet(report, 'severity', 'low'))}>
                          {safeGet(report, 'severity', 'low').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(safeGet(report, 'status', 'pending'))}>
                          {safeGet(report, 'status', 'pending').replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{safeFormat(safeGet(report, 'reportedAt'), 'MMM dd, yyyy')}</div>
                          <div className="text-gray-500">{safeFormat(safeGet(report, 'reportedAt'), 'HH:mm')}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {getActionButtons(report)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Handler Dialog */}
      {reportToAssign && (
        <AssignHandlerDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          complaint={reportToAssign}
          onAssigned={() => {
            // Refresh reports after assignment
            fetchReports();
            toast({
              title: "Success",
              description: "Handler assigned successfully",
            });
          }}
        />
      )}

      {/* Escalation Controls Dialog */}
      {reportToEscalate && (
        <EscalationControls
          open={escalationDialogOpen}
          onOpenChange={setEscalationDialogOpen}
          complaint={{
            id: reportToEscalate.id,
            title: reportToEscalate.title,
            category: reportToEscalate.category,
            reportedAt: reportToEscalate.reportedAt,
            escalationLevel: reportToEscalate.escalationLevel,
            escalationHistory: reportToEscalate.escalationHistory,
          }}
          onEscalated={() => {
            // Refresh reports after escalation
            fetchReports();
          }}
        />
      )}

      {/* PDF Viewer Modal */}
      {selectedPdfUrl && (
        <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] p-0 bg-white" style={{ height: '95vh' }}>
            <div className="flex flex-col h-full w-full">
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <DialogTitle className="text-lg font-semibold">PDF Viewer</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPdfViewerOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden bg-gray-200 relative">
                <iframe
                  src={selectedPdfUrl}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    border: 'none'
                  }}
                  title="PDF Viewer"
                />
              </div>
              <div className="flex gap-2 p-4 border-t bg-gray-50 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={selectedPdfUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPdfViewerOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Video Viewer Modal */}
      {selectedVideoUrl && (
        <Dialog open={videoViewerOpen} onOpenChange={setVideoViewerOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black rounded-lg shadow-2xl border border-gray-700" style={{ height: '90vh' }}>
            <div className="flex flex-col h-full w-full rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <DialogTitle className="text-lg font-bold text-white tracking-wide">Video Evidence</DialogTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVideoViewerOpen(false)}
                  className="h-9 w-9 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full transition-all"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Video Container */}
              <div className="flex-1 overflow-hidden bg-black relative flex items-center justify-center group">
                <video
                  src={selectedVideoUrl}
                  controls
                  autoPlay
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                  className="object-contain"
                />
                {/* Subtle corners decoration */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gray-600 rounded-tl-lg opacity-20 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gray-600 rounded-tr-lg opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gray-600 rounded-bl-lg opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gray-600 rounded-br-lg opacity-20 pointer-events-none"></div>
              </div>
              
              {/* Footer */}
              <div className="flex gap-3 p-5 border-t border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 justify-end items-center">
                <div className="text-xs text-gray-400 mr-auto">
                  Video Player • Press ESC to close
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500 text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/50"
                >
                  <a href={selectedVideoUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVideoViewerOpen(false)}
                  className="bg-gradient-to-r from-gray-700 to-gray-800 border-gray-600 text-white hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminReportsPage;