import React, { useState, useEffect, type JSX } from 'react';
import { NotificationService } from "../../services/notificationService";
import { InternalNotesSection } from "../../components/admin/InternalNotesSection";
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
  X,
  Lock
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
import { useNavigate, useLocation } from "../../compat/router";
import { AssignHandlerDialog } from "../../components/admin/AssignHandlerDialog";
import { HandlerTimeline } from "../../components/admin/HandlerTimeline";
import { ReportStatusManager } from "../../components/case/ReportStatusManager";
import { ROLE_LABELS, ROLE_COLORS } from "../../types/representative";
import { EscalationBadge, SLAIndicator, CompactEscalationInfo } from "../../components/admin/EscalationBadge";
import { EscalationControls } from "../../components/admin/EscalationControls";
import { ESCALATION_LABELS } from "../../types/escalation";
import type { EscalationLevel } from "../../types/escalation";
import LocationMapPicker from "../../components/forms/LocationMapPicker";
import { FORMAL_COMPLAINT_CATEGORIES, getFormalComplaintCategoryLabel } from "../../constants/formalComplaintCategories";

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
  const [escalationFilter, setEscalationFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const location = useLocation();
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
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);
  
  // FIXED: Evidence caching to prevent repetitive processing
  const [evidenceCache] = useState(new Map<string, string[]>());
  
  const { toast } = useToast();

  // Check if user is a handler (not admin)
  const isHandler = role === 'handler' && !isAdmin;

  // Read URL query params on mount to pre-select tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam && ['all', 'active', 'investigating', 'resolved'].includes(statusParam)) {
      setActiveTab(statusParam);
    }
  }, [location.search]);

  // Get representative ID for handlers (use representativeData from hook)
  useEffect(() => {
    if (isHandler && representativeData) {
      console.log('✅ Handler representative found:', {
        repId: representativeData.id,
        email: representativeData.email,
        name: representativeData.displayName,
        userId: representativeData.userId,
        currentUserId: currentUser?.uid
      });
      setRepresentativeId(representativeData.id);
    } else if (isHandler && !representativeData) {
      console.warn('⚠️ Handler but no representative data found');
      console.warn('💡 User ID:', currentUser?.uid);
      console.warn('💡 Make sure this user has a representative entry in Firestore');
      setRepresentativeId(null);
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
        console.log('🔍 Handler info:', {
          representativeId,
          representativeEmail: representativeData?.email,
          representativeName: representativeData?.displayName
        });
        
        // Show all assigned cases for debugging
        const allAssignedCases = fetchedReports.filter(r => r.assignedTo);
        console.log('📋 All assigned cases:', allAssignedCases.map(r => ({
          id: r.id,
          title: r.title,
          assignedTo: r.assignedTo,
          assignedToName: r.assignedToName,
          matches: r.assignedTo === representativeId
        })));
        
        displayReports = fetchedReports.filter(report => 
          report.assignedTo === representativeId
        );
        console.log(`📊 Handler has ${displayReports.length} assigned cases out of ${fetchedReports.length} total`);
        
        if (displayReports.length === 0 && allAssignedCases.length > 0) {
          console.warn('⚠️ MISMATCH: Cases are assigned but not to this handler ID');
          console.warn('💡 Check if representative ID matches the assigned handler ID');
        }
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
  }, [reports, searchTerm, statusFilter, categoryFilter, escalationFilter, activeTab]);

  // Auto-open report from URL query parameter (e.g., from notification)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportId = params.get('reportId');
    const noteId = params.get('noteId');
    
    if (reportId && reports.length > 0) {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        console.log('📬 Opening report from notification:', reportId, noteId ? `with note: ${noteId}` : '');
        setSelectedReport(report);
        
        // Set highlight note ID if present
        if (noteId) {
          setHighlightNoteId(noteId);
        }
        
        // Clean up URL after opening (delayed to allow scroll to complete)
        setTimeout(() => {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }, 2000);
      }
    }
  }, [location.search, reports]);

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

    // Tab-based status filter (takes priority over dropdown filter)
    if (activeTab === 'active') {
      filtered = filtered.filter(report => {
        const status = safeGet(report, 'status');
        return status === 'pending' || status === 'submitted';
      });
    } else if (activeTab === 'investigating') {
      filtered = filtered.filter(report => safeGet(report, 'status') === 'inProgress');
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(report => safeGet(report, 'status') === 'resolved');
    }
    // If activeTab is 'all', no tab-based filtering

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        safeGet(report, 'title', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'description', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'location', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'userName', '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Additional status filter from dropdown (only if tab is 'all')
    if (activeTab === 'all' && statusFilter !== 'all') {
      filtered = filtered.filter(report => safeGet(report, 'status') === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(report => safeGet(report, 'category') === categoryFilter);
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

    const complainantId = selectedReport.userId;
    if (complainantId) {
      const statusMap: Record<string, any> = {
        inProgress: 'inProgress', pending: 'pending',
        resolved: 'resolved', dismissed: 'dismissed', submitted: 'pending',
      };
      await NotificationService.sendComplaintStatusNotification(
        complainantId,
        selectedReport.id,
        selectedReport.title || 'Your complaint',
        statusMap[newStatus] || 'pending',
        newNote || undefined
      ).catch(e => console.error('Notif failed (non-critical):', e));
    }

    toast({ title: "Success", description: "Report status updated successfully." });
    fetchReports();
    fetchStats();
    setSelectedReport(null);
    setHighlightNoteId(null);
    setNewNote('');
    setNewStatus('');
  } catch (error) {
    toast({ title: "Error", description: "Failed to update report status.", variant: "destructive" });
  }
};
      

const handleQuickStatusUpdate = async (reportId: string, status: AdminReport['status']) => {
  try {
    await AdminReportService.updateReportStatusFromBothCollections(reportId, status);

    const report = reports.find(r => r.id === reportId);
    const complainantId = report?.userId;
    if (complainantId && report) {
      const statusMap: Record<string, any> = {
        inProgress: 'inProgress', pending: 'pending',
        resolved: 'resolved', dismissed: 'dismissed', submitted: 'pending',
      };
      await NotificationService.sendComplaintStatusNotification(
        complainantId,
        reportId,
        report.title || 'Your complaint',
        statusMap[status] || 'pending'
      ).catch(e => console.error('Notif failed (non-critical):', e));
    }

    toast({ title: "Success", description: `Status updated to ${status?.replace(/([A-Z])/g, ' $1').trim()}.` });
    fetchReports();
    fetchStats();
  } catch (error) {
    console.error('Error updating report status:', error);
    toast({ title: "Error", description: "Failed to update report status.", variant: "destructive" });
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
        getFormalComplaintCategoryLabel(String(safeGet(report, 'category', ''))),
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
          'ID', 'Title', 'Category', 'Status', 'Reporter', 'Location', 'Incident', 'Reported', 'Escalation'
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
          3: { cellWidth: 22, halign: 'center' },  // Status
          4: { cellWidth: 28, halign: 'left' },    // Reporter
          5: { cellWidth: 35, halign: 'left' },    // Location - MAXIMIZED
          6: { cellWidth: 18, halign: 'center' },  // Incident Date
          7: { cellWidth: 18, halign: 'center' },  // Reported Date
          8: { cellWidth: 20, halign: 'center' },  // Escalation
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
            className="relative group"
          >
            <Eye className="h-4 w-4" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              View Details
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl max-h-[90vh] sm:max-h-[85vh] p-4 sm:p-6">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {isAdmin ? "Full Report Details" : "Case Details"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Report ID: <span className="font-mono text-sm break-all">{safeGet(report, 'id', 'N/A')}</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(85vh-140px)] pr-2 sm:pr-3 space-y-4">
              {/* Quick Info Cards - Responsive Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 font-medium mb-2">Status</p>
                  <Badge className={`${getStatusColor(safeGet(selectedReport, 'status', 'pending'))} text-sm`}>
                    {safeGet(selectedReport, 'status', 'pending')}
                  </Badge>
                </div>
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 font-medium mb-2">Category</p>
                  <p className="text-sm font-semibold">
                    {getFormalComplaintCategoryLabel(String(safeGet(selectedReport, 'category', '')))}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 font-medium mb-2">Handler</p>
                  <p className="text-sm font-semibold">{safeGet(selectedReport, 'assignedToName', 'Unassigned')}</p>
                </div>
              </div>

              {/* Main Content - Single Column for Better Readability */}
              <div className="space-y-4">
                {/* Report Info - Different views for Admin and Handler */}
                {isAdmin ? (
                  <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                    <h4 className="font-bold text-base mb-4 flex items-center gap-2 text-blue-700">
                      <FileText className="h-5 w-5" />
                      Case Information
                    </h4>
                    <div className="space-y-3">
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Title</p>
                        <p className="text-base font-semibold">{safeGet(selectedReport, 'title', 'No title')}</p>
                      </div>
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Location</p>
                        <p className="text-base font-semibold">{safeGet(selectedReport, 'location', 'No location')}</p>
                      </div>
                      {(() => {
                        const location = safeGet(selectedReport, 'location', '').toLowerCase();
                        const locationVicinity = safeGet(selectedReport, 'locationVicinity', '').toLowerCase();
                        const isOnline = location === 'online' || locationVicinity === 'online';
                        const mapAddress = safeGet(selectedReport, 'mapAddress');
                        return !isOnline && mapAddress && (
                          <div className="pb-3 border-b">
                            <p className="text-sm text-gray-600 mb-1 font-medium">Map Address</p>
                            <p className="text-base font-semibold">{mapAddress}</p>
                          </div>
                        );
                      })()}
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Incident Date</p>
                        <p className="text-base font-semibold">{safeFormat(safeGet(selectedReport, 'incidentDate'), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Reporter</p>
                        <p className="text-base font-semibold">{safeGet(selectedReport, 'userName', 'Unknown')}</p>
                      </div>
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Email</p>
                        <p className="text-base font-semibold">{safeGet(selectedReport, 'userEmail', 'N/A')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 font-medium">Reported On</p>
                        <p className="text-base font-semibold">{safeFormat(safeGet(selectedReport, 'reportedAt'), 'MMM dd, h:mm a')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                    <h4 className="font-bold text-base mb-4 flex items-center gap-2 text-blue-700">
                      <FileText className="h-5 w-5" />
                      Report Information
                    </h4>
                    <div className="space-y-3">
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Title</p>
                        <p className="text-base font-semibold">{safeGet(selectedReport, 'title', 'No title')}</p>
                      </div>
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Location</p>
                        <p className="text-base font-semibold">{safeGet(selectedReport, 'location', 'No location')}</p>
                      </div>
                      {(() => {
                        const location = safeGet(selectedReport, 'location', '').toLowerCase();
                        const locationVicinity = safeGet(selectedReport, 'locationVicinity', '').toLowerCase();
                        const isOnline = location === 'online' || locationVicinity === 'online';
                        const mapAddress = safeGet(selectedReport, 'mapAddress');
                        return !isOnline && mapAddress && (
                          <div className="pb-3 border-b">
                            <p className="text-sm text-gray-600 mb-1 font-medium">Map Address</p>
                            <p className="text-base font-semibold">{mapAddress}</p>
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-sm text-gray-600 mb-1 font-medium">Incident Date</p>
                        <p className="text-base font-semibold">{safeFormat(safeGet(selectedReport, 'incidentDate'), 'MMM dd, yyyy')}</p>
                      </div>
                      <p className="mt-4 text-sm text-gray-500 italic bg-gray-50 p-3 rounded">Contact admin for reporter details</p>
                    </div>
                  </div>
                )}

                {/* Where It Happened - Location Details */}
                {(() => {
                  const vicinity = safeGet(selectedReport, 'locationVicinity');
                  
                  return (
                    <div className="bg-blue-50 p-4 rounded-lg border">
                      <h4 className="font-bold text-base mb-3 flex items-center gap-2 text-blue-700">
                        <MapPin className="h-5 w-5" />
                        Where It Happened
                      </h4>
                      <div>
                        <p className="text-sm text-gray-700 mb-1 font-medium">Location Details:</p>
                        <p className="text-base font-semibold text-gray-900">
                        {vicinity === 'inside' 
                          ? 'Inside College Vicinity' 
                          : vicinity === 'outside' 
                          ? 'Outside College Vicinity' 
                          : vicinity && vicinity !== 'N/A'
                          ? vicinity
                          : 'Not specified'}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Respondent Information */}
                {(safeGet(selectedReport, 'respondentName') || safeGet(selectedReport, 'respondentAddress')) && (
                  <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                    <h4 className="font-bold text-base mb-3 text-orange-700">Respondent Information</h4>
                    <div className="space-y-2">
                      {safeGet(selectedReport, 'respondentName') && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Name:</span> 
                          <span className="ml-2 font-semibold text-gray-900">{safeGet(selectedReport, 'respondentName')}</span>
                        </div>
                      )}
                      {safeGet(selectedReport, 'respondentAddress') && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">
                            {safeGet(selectedReport, 'respondentName') === 'Unknown/Not Disclosed' 
                              ? 'Physical Description:' 
                              : 'Address:'}
                          </span>
                          <span className="ml-2 font-semibold text-gray-900">{safeGet(selectedReport, 'respondentAddress')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                  <h4 className="font-bold text-base mb-3 text-gray-700">What Happened</h4>
                  <div className="text-sm bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto leading-relaxed">
                    {safeGet(selectedReport, 'description', 'No description provided')}
                  </div>
                </div>

                {/* Additional Info */}
                {(safeGet(selectedReport, 'witnesses') || safeGet(selectedReport, 'additionalInfo')) && (
                  <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                    <h4 className="font-bold text-base mb-3 text-gray-700">Additional Information</h4>
                    <div className="space-y-3">
                      {safeGet(selectedReport, 'witnesses') && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Witnesses:</span>
                          <span className="ml-2 font-semibold text-gray-900">{safeGet(selectedReport, 'witnesses')}</span>
                        </div>
                      )}
                      {safeGet(selectedReport, 'additionalInfo') && (
                        <div className="bg-gray-50 p-3 rounded border text-sm leading-relaxed">
                          {safeGet(selectedReport, 'additionalInfo')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Location Map - Display if coordinates exist, are valid, AND location is not online */}
              {(() => {
                const lat = safeGet(selectedReport, 'latitude');
                const lng = safeGet(selectedReport, 'longitude');
                const location = safeGet(selectedReport, 'location', '').toLowerCase();
                const locationVicinity = safeGet(selectedReport, 'locationVicinity', '').toLowerCase();
                const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
                const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
                const hasValidCoords = !isNaN(latNum) && !isNaN(lngNum);
                const isOnline = location === 'online' || locationVicinity === 'online';
                
                return hasValidCoords && !isOnline && (
                  <div>
                    <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                      <h4 className="font-bold text-base mb-3 flex items-center gap-2 text-green-700">
                        <MapPin className="h-5 w-5" />
                        Incident Location Map
                      </h4>
                      <div className="rounded-lg overflow-hidden border-2 max-h-80">
                        <LocationMapPicker
                          onLocationSelect={() => {}} // Read-only, so no selection needed
                          initialLat={latNum}
                          initialLng={lngNum}
                          centerLat={latNum}
                          centerLng={lngNum}
                          selectedCity=""
                          selectedBarangay=""
                          readOnly={true}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Admin Notes */}
              {safeGet(selectedReport, 'adminNotes') && (
                <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                  <h4 className="font-bold text-base mb-3 text-indigo-700">Admin Notes</h4>
                  <div className="text-sm bg-white p-3 rounded border max-h-24 overflow-y-auto leading-relaxed">
                    {safeGet(selectedReport, 'adminNotes')}
                  </div>
                </div>
              )}

              {/* Attachments/Evidence */}
              <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                <h4 className="font-bold text-base mb-3 text-purple-700">Attachments & Evidence</h4>
                
                {(() => {
                  // Use cached version to avoid repetitive processing
                  const evidenceUrls = getCachedEvidenceUrls(selectedReport);
                  const externalLinks = safeGet(selectedReport, 'evidenceExternalLinks', []) || [];
                  const hasExternalLinks = Array.isArray(externalLinks) && externalLinks.length > 0;
                  
                  // Enhanced debug logging
                  console.log('📎 Evidence Debug:', {
                    evidenceUrls: evidenceUrls.length,
                    externalLinks: externalLinks,
                    externalLinksLength: externalLinks?.length || 0,
                    hasExternalLinks: hasExternalLinks,
                    reportId: selectedReport?.id,
                    rawEvidence: selectedReport.evidenceExternalLinks,
                    fullReport: selectedReport
                  });
                  
                  if (evidenceUrls.length === 0 && !hasExternalLinks) {
                    return (
                      <p className="text-sm text-gray-500 italic">No attachments or external links found</p>
                    );
                  }
                  
                  return (
                    <div className="space-y-6">
                      {evidenceUrls.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-3">
                            📎 {evidenceUrls.length} File{evidenceUrls.length !== 1 ? 's' : ''} Uploaded
                          </p>
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
                                    // Other files: Direct download
                                    <a
                                      href={url}
                                      download={fileName}
                                      className="flex-1 h-7 sm:h-8 text-xs flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                          </div>
                        </div>
                      )}

                      {/* External Links */}
                      {hasExternalLinks && (
                        <div className={evidenceUrls.length > 0 ? "pt-4 border-t-2 border-gray-200" : ""}>
                          <p className="text-base font-bold text-blue-700 mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            External Links ({externalLinks.length})
                          </p>
                          <div className="space-y-3">
                            {externalLinks.map((link: string, index: number) => (
                              <div key={index} className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-colors">
                                <svg className="h-6 w-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <a 
                                  href={link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-base text-blue-700 hover:text-blue-900 underline font-medium flex-1 break-all"
                                >
                                  {link}
                                </a>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                                  onClick={() => {
                                    window.open(link, '_blank');
                                  }}
                                >
                                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Open
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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

              {/* Internal Notes Section - Only visible to Admin and Case Handler */}
              <div className="border-t pt-6 mt-6">
                <InternalNotesSection
                  caseId={selectedReport.id}
                  caseTitle={selectedReport.title || 'Case'}
                  assignedToId={selectedReport.assignedTo}
                  assignedToRole={selectedReport.assignedToRole as 'admin' | 'handler'}
                  highlightNoteId={highlightNoteId || undefined}
                />
              </div>
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
          className="text-blue-600 hover:text-blue-700 relative group"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Open Chat
          </span>
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

  const reportCardClass =
    'border-emerald-100/80 bg-white/95 shadow-sm ring-1 ring-emerald-950/[0.04] overflow-hidden';

  // Calculate tab counts
  const tabCounts = {
    all: reports.length,
    active: reports.filter(r => r.status === 'pending' || (r.status as string) === 'submitted').length,
    investigating: reports.filter(r => r.status === 'inProgress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL
    const newUrl = tab === 'all' ? '/admin/reports' : `/admin/reports?status=${tab}`;
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div className="w-full space-y-8 pb-10">
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

      {/* Handler Dashboard Stats - ONLY for handlers, NOT for admins */}
      {!isAdmin && isHandler && (
        <div className={`mb-2 grid grid-cols-1 gap-4 ${(getHandlerStats()?.escalated || 0) > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <Card className={reportCardClass}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/60 bg-emerald-50/30 pb-3">
              <CardTitle className="text-sm font-medium text-emerald-950">Total Cases</CardTitle>
              <FileText className="h-4 w-4 text-[#1a7a45]" aria-hidden />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold tabular-nums text-emerald-950">{getHandlerStats()?.total || 0}</div>
              <p className="mt-1 text-xs text-emerald-900/55">
                Assigned to you
              </p>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/60 bg-emerald-50/30 pb-3">
              <CardTitle className="text-sm font-medium text-emerald-950">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-[#1a7a45]/75" aria-hidden />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold tabular-nums text-emerald-950">{getHandlerStats()?.pending || 0}</div>
              <p className="mt-1 text-xs text-emerald-900/55">
                Awaiting your review
              </p>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/60 bg-emerald-50/30 pb-3">
              <CardTitle className="text-sm font-medium text-emerald-950">In Progress</CardTitle>
              <AlertTriangle className="h-4 w-4 text-[#1a7a45]/70" aria-hidden />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold tabular-nums text-emerald-950">{getHandlerStats()?.inProgress || 0}</div>
              <p className="mt-1 text-xs text-emerald-900/55">
                Currently handling
              </p>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/60 bg-emerald-50/30 pb-3">
              <CardTitle className="text-sm font-medium text-emerald-950">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-[#1a7a45]" aria-hidden />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold tabular-nums text-emerald-950">{getHandlerStats()?.resolved || 0}</div>
              <p className="mt-1 text-xs text-emerald-900/55">
                Completed cases
              </p>
            </CardContent>
          </Card>

          {(getHandlerStats()?.escalated || 0) > 0 && (
            <Card className={reportCardClass}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/60 bg-emerald-50/30 pb-3">
                <CardTitle className="text-sm font-medium text-emerald-950">Escalated</CardTitle>
                <AlertTriangle className="h-4 w-4 text-emerald-900/65" aria-hidden />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold tabular-nums text-emerald-950">{getHandlerStats()?.escalated || 0}</div>
                <p className="mt-1 text-xs text-emerald-900/55">
                  Elevated priority
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="relative rounded-xl border-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-6 py-6 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-2">
              <FileText className="h-4 w-4 text-white" />
              <p className="text-xs font-bold uppercase tracking-wider text-white">Case Intake</p>
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              {isHandler ? 'My Assigned Cases' : 'Reports Management'}
            </h1>
            <p className="text-sm text-white/90 font-medium mt-1">
              {isHandler 
                ? 'View and manage cases assigned to you'
                : 'View and manage all incident reports submitted by users'
              }
            </p>
          </div>
          {!isHandler && (
            <Button 
              onClick={handleExportConfirmation}
              className="bg-white text-green-600 hover:bg-white/90 font-bold shadow-lg"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={reportCardClass}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-emerald-950">{stats.totalReports}</p>
                  <p className="text-sm text-emerald-900/55">Total Reports</p>
                </div>
                <div className="rounded-xl bg-emerald-100/60 p-2.5 ring-1 ring-emerald-200/50">
                  <FileText className="h-7 w-7 text-[#1a7a45]" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-emerald-950">{stats.pendingReports}</p>
                  <p className="text-sm text-emerald-900/55">Pending</p>
                </div>
                <div className="rounded-xl bg-emerald-100/50 p-2.5 ring-1 ring-emerald-200/40">
                  <Clock className="h-7 w-7 text-emerald-800/80" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-emerald-950">{stats.inProgressReports}</p>
                  <p className="text-sm text-emerald-900/55">In Progress</p>
                </div>
                <div className="rounded-xl bg-emerald-100/50 p-2.5 ring-1 ring-emerald-200/40">
                  <AlertTriangle className="h-7 w-7 text-emerald-900/70" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-emerald-950">{stats.resolvedReports}</p>
                  <p className="text-sm text-emerald-900/55">Resolved</p>
                </div>
                <div className="rounded-xl bg-emerald-100/60 p-2.5 ring-1 ring-emerald-200/50">
                  <CheckCircle className="h-7 w-7 text-[#1a7a45]" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
        <nav className="flex space-x-8 px-6" aria-label="Status tabs">
          <button
            onClick={() => handleTabChange('all')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'all'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            All
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'all' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.all}
            </span>
          </button>
          
          <button
            onClick={() => handleTabChange('active')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'active'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Active
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'active' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.active}
            </span>
          </button>
          
          <button
            onClick={() => handleTabChange('investigating')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'investigating'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Under Investigation
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'investigating' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.investigating}
            </span>
          </button>
          
          <button
            onClick={() => handleTabChange('resolved')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'resolved'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Resolved
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'resolved' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.resolved}
            </span>
          </button>
        </nav>
      </div>

      {/* Filters */}
      <Card className={reportCardClass}>
        <CardHeader className="border-b border-emerald-100/70 bg-gradient-to-r from-emerald-50/45 to-transparent pb-4 pt-5">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a7a45]/10 text-[#1a7a45]">
              <Filter className="h-4 w-4" aria-hidden />
            </span>
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div>
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-emerald-100/90 bg-white focus-visible:border-[#1a7a45]/40 focus-visible:ring-[#1a7a45]/20"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-emerald-100/90 bg-white focus:ring-[#1a7a45]/20">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="inProgress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="border-emerald-100/90 bg-white focus:ring-[#1a7a45]/20">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {FORMAL_COMPLAINT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Escalation Filter */}
            <Select value={escalationFilter} onValueChange={setEscalationFilter}>
              <SelectTrigger className="border-emerald-100/90 bg-white focus:ring-[#1a7a45]/20">
                <SelectValue placeholder="All Escalations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Escalations</SelectItem>
                <SelectItem value="0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-200" />
                    Normal
                  </div>
                </SelectItem>
                <SelectItem value="1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    Priority
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-600" />
                    Urgent
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-900" />
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
                setEscalationFilter('all');
              }}
              className="border-emerald-200/90 text-emerald-900 hover:bg-emerald-50/90"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className={reportCardClass}>
        <CardHeader className="border-b border-emerald-100/70 bg-gradient-to-r from-emerald-50/40 to-transparent pb-4 pt-5">
          <CardTitle className="text-base font-semibold text-emerald-950">
            Reports <span className="font-normal text-emerald-800/60">({filteredReports.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100/70 ring-1 ring-emerald-200/50">
                <FileText className="h-7 w-7 text-[#1a7a45]/70" aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-emerald-950">No reports found</h3>
              <p className="text-sm text-emerald-900/55">
                {reports.length === 0 
                  ? "No reports have been submitted yet." 
                  : "No reports match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-xl">
              <Table>
              <TableHeader className="bg-emerald-50/55 [&_tr]:border-emerald-100/80">
                <TableRow className="border-emerald-100/80 hover:bg-transparent">
                  <TableHead className="text-emerald-950/75">Report</TableHead>
                  <TableHead className="text-emerald-950/75">Reporter</TableHead>
                  {/* Only show Handler column for admins, not for handlers */}
                  {!isHandler && <TableHead className="text-emerald-950/75">Handler</TableHead>}
                  <TableHead className="text-emerald-950/75">Escalation</TableHead>
                  <TableHead className="text-emerald-950/75">Status</TableHead>
                  <TableHead className="text-emerald-950/75">Date</TableHead>
                  <TableHead className="text-emerald-950/75">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const reportEvidence = processEvidence(safeGet(report, 'evidence'));
                  
                  return (
                    <TableRow
                      key={report.id}
                      className="border-b border-emerald-100/50 transition-colors hover:bg-emerald-50/35"
                    >
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
                          {safeGet(report, 'userName', 'Unknown') === 'Anonymous' ? (
                            <>
                              <Lock className="h-4 w-4 text-amber-600" />
                              <span className="text-amber-700 font-medium">Anonymous</span>
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4 text-gray-400" />
                              {safeGet(report, 'userName', 'Unknown')}
                            </>
                          )}
                        </div>
                      </TableCell>
                      {/* Only show Handler column for admins */}
                      {!isHandler && (
                        <TableCell>
                          {report.assignedToName ? (
                            <div className="space-y-1">
                              <div className="font-medium text-sm flex items-center gap-2">
                                <User className="h-4 w-4 text-[#1a7a45]" />
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
                        {(report.escalationLevel || 0) > 0 ? (
                          <CompactEscalationInfo
                            level={(report.escalationLevel || 0) as EscalationLevel}
                            hoursUnprocessed={report.hoursUnprocessed || 0}
                            slaBreached={report.slaBreached || false}
                          />
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                            None
                          </Badge>
                        )}
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

      {/* Export PDF Confirmation Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Reports to PDF</DialogTitle>
            <DialogDescription>
              Export {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} with the current filters applied.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              The PDF will include all visible reports in a compact, professional format with:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Report ID, Title, and Category</li>
              <li>Status and Reporter information</li>
              <li>Location and Incident dates</li>
              <li>Escalation level (if any)</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              onClick={exportReports}
              disabled={exporting}
              className="bg-[#16A34A] hover:bg-[#15803D]"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedPdfUrl)}&embedded=true`}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    border: 'none'
                  }}
                  title="PDF Viewer"
                  allow="autoplay"
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