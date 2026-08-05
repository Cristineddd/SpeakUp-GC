import React, { useState, useEffect, useMemo, useCallback, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { NotificationService } from "../../services/notificationService";
import { InternalNotesSection } from "../../components/admin/InternalNotesSection";
import {
  CaseDetailField,
  CaseDetailGrid,
  CaseDetailNotice,
  CaseDetailSection,
  CaseDetailStat,
  CaseDetailTextBlock,
} from '../../components/case/CaseDetailLayout';
import { isDuplicateCaseText, shouldShowCaseTextField } from '../../utils/caseDetailText';
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
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useRepresentativeRole } from "../../hooks/useRepresentativeRole";
import { AdminReportService, AdminReport, ReportStats } from "../../services/adminReportService";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { useNavigate, useLocation } from "../../compat/router";
import { HandlerTimeline } from "../../components/admin/HandlerTimeline";
import { ReportStatusManager } from "../../components/case/ReportStatusManager";
import { EscalationBadge, SLAIndicator, CompactEscalationInfo } from "../../components/admin/EscalationBadge";
import { EscalationControls } from "../../components/admin/EscalationControls";
import { ESCALATION_LABELS } from "../../types/escalation";
import type { EscalationLevel } from "../../types/escalation";
import LocationMapPicker from "../../components/forms/LocationMapPicker";
import { FORMAL_COMPLAINT_CATEGORIES, getFormalComplaintCategoryLabel } from "../../constants/formalComplaintCategories";
import { PDFViewerModal } from "../../components/common/PDFViewerModal";
import { getDisplayCaseNumber, getInternalCaseRef } from "../../utils/caseId";
import {
  CASE_SEEN_EVENT,
  CASE_SEEN_HYDRATED_EVENT,
  countUnseenActionableCases,
  hydrateSeenCases,
  isUnseenActionableCase,
  markCaseSeen,
} from "../../utils/caseQueueBadge";
import { CodiRoleBadge } from "../../components/admin/CodiRoleBadge";
import { CaseActivityTimeline } from "../../components/admin/CaseActivityTimeline";

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
    
    // Handle YYYY-MM-DD string format (from formal complaint date inputs)
    if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
      // Add time to avoid timezone issues
      const date = new Date(timestamp + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date;
      }
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

const formatReportVicinity = (v: string) => {
  if (v === 'inside') return 'Inside College Vicinity';
  if (v === 'outside') return 'Outside College Vicinity';
  if (v === 'online') return 'Online / Digital Platform';
  if (v && v !== 'N/A') return v;
  return 'Not specified';
};

const formatReportIncidentTime = (time?: string) => {
  if (!time || time === 'N/A') return null;
  if (time === 'AM') return 'Morning (12:00 AM – 11:59 AM)';
  if (time === 'PM') return 'Afternoon/Evening (12:00 PM – 11:59 PM)';
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return time;
  }
};

const formatReportHarassmentDegree = (degree?: string) => {
  const labels: Record<string, string> = {
    light: 'Light',
    severe: 'Severe',
    grave: 'Grave',
  };
  return degree ? labels[degree] || degree.replace(/_/g, ' ') : null;
};

const isOnlineReportLocation = (report: AdminReport) => {
  const location = safeGet(report, 'location', '').toLowerCase();
  const vicinity = safeGet(report, 'locationVicinity', '').toLowerCase();
  return location === 'online' || vicinity === 'online';
};

const formatRespondentName = (name?: string) => {
  if (!name) return '';
  if (name === 'Unknown/Not Disclosed' || name === 'UnknownNot Disclosed') {
    return 'Unknown / Not Disclosed';
  }
  return name;
};

const isUnknownRespondent = (name?: string) =>
  name === 'Unknown/Not Disclosed' || name === 'UnknownNot Disclosed';

const safeFormat = (timestamp: any, formatStr: string, fallback: string = 'N/A'): string => {
  // Handle YYYY-MM-DD string format directly first
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    try {
      const date = new Date(timestamp + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return format(date, formatStr);
      }
    } catch (error) {
      console.warn('Failed to format YYYY-MM-DD date:', error);
    }
  }
  
  const date = safeToDate(timestamp);
  if (!date) return fallback;
  
  try {
    return format(date, formatStr);
  } catch (error) {
    console.warn('Failed to format date:', error);
    return fallback;
  }
};

// Generate user-friendly file name
const getUserFriendlyFileName = (url: string, index: number, fileType: string): string => {
  try {
    // Get extension from URL
    const urlWithoutParams = url.split('?')[0];
    const extension = urlWithoutParams.split('.').pop()?.toLowerCase() || '';
    
    // Create friendly name based on file type
    let baseName = '';
    switch (fileType) {
      case 'image':
        baseName = `Image ${index + 1}`;
        break;
      case 'video':
        baseName = `Video ${index + 1}`;
        break;
      case 'document':
        if (extension === 'pdf') {
          baseName = `PDF Document ${index + 1}`;
        } else {
          baseName = `Document ${index + 1}`;
        }
        break;
      case 'audio':
        baseName = `Audio ${index + 1}`;
        break;
      default:
        baseName = `File ${index + 1}`;
    }
    
    // Add extension if available
    return extension ? `${baseName}.${extension}` : baseName;
  } catch (error) {
    return `Evidence ${index + 1}`;
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

// Helper functions for operational metrics
const getDaysOpen = (report: AdminReport): number => {
  const createdAt = safeToDate(report.reportedAt);
  if (!createdAt) return 0;
  return differenceInDays(new Date(), createdAt);
};

const getLastUpdated = (report: AdminReport): string => {
  const lastUpdated = safeToDate((report as any).lastUpdated) || safeToDate((report as any).updatedAt) || safeToDate(report.reportedAt);
  if (!lastUpdated) return 'N/A';
  return formatDistanceToNow(lastUpdated, { addSuffix: true });
};

const needsAttention = (report: AdminReport): boolean => {
  const updatedAt = safeToDate((report as any).lastUpdated) || safeToDate((report as any).updatedAt) || safeToDate(report.reportedAt);
  if (!updatedAt) return false;

  const daysSinceUpdate = differenceInDays(new Date(), updatedAt);
  const isStale = daysSinceUpdate >= 3;
  const isEscalated = (report.escalationLevel || 0) > 0;
  const hasFollowUp = safeGet(report, 'followUpRequested', false);

  return isStale || isEscalated || hasFollowUp;
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
  const [notesCounts, setNotesCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [escalationFilter, setEscalationFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const location = useLocation();
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<string>('details');
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // NOTE: Removed assignDialogOpen and reportToAssign - no longer assigning handlers
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [reportToEscalate, setReportToEscalate] = useState<AdminReport | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{url: string; index: number; total: number} | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [videoViewerOpen, setVideoViewerOpen] = useState(false);
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);
  const [quickSummaryReport, setQuickSummaryReport] = useState<AdminReport | null>(null);
  const [quickSummaryOpen, setQuickSummaryOpen] = useState(false);
  const [seenRevision, setSeenRevision] = useState(0);

  const markReportReviewed = useCallback((reportId: string) => {
    if (!currentUser?.uid || !reportId) return;
    markCaseSeen(currentUser.uid, reportId);
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!modalOpen || !selectedReport?.id) return;
    markReportReviewed(selectedReport.id);
  }, [modalOpen, selectedReport?.id, markReportReviewed]);

  // FIXED: Evidence caching to prevent repetitive processing
  const [evidenceCache] = useState(new Map<string, string[]>());
  
  const { toast } = useToast();

  // CODI (Committee on Decorum and Investigation) = CODI Member role
  // They are the same - CODI is the official term for CODI Members in this system
  // Support both 'codi' and 'handler' role values in Firestore
  const isCODI = (role as string) === 'codi' || role === 'handler';
  const isHandler = isCODI; // Alias for backward compatibility

  const queueBadgeOptions = useMemo(
    () => ({ isCODI, representativeId }),
    [isCODI, representativeId]
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    void hydrateSeenCases(currentUser.uid);
  }, [currentUser?.uid]);

  useEffect(() => {
    const onCaseSeen = () => setSeenRevision((value) => value + 1);
    window.addEventListener(CASE_SEEN_EVENT, onCaseSeen);
    window.addEventListener(CASE_SEEN_HYDRATED_EVENT, onCaseSeen);
    return () => {
      window.removeEventListener(CASE_SEEN_EVENT, onCaseSeen);
      window.removeEventListener(CASE_SEEN_HYDRATED_EVENT, onCaseSeen);
    };
  }, []);

  const isUnseenInQueue = useCallback(
    (report: AdminReport) => {
      if (!currentUser?.uid) return false;
      void seenRevision;
      return isUnseenActionableCase(
        report.id,
        { status: report.status, assignedTo: report.assignedTo },
        currentUser.uid,
        queueBadgeOptions
      );
    },
    [currentUser?.uid, queueBadgeOptions, seenRevision]
  );

  const unseenQueueCount = useMemo(() => {
    if (!currentUser?.uid) return 0;
    void seenRevision;
    return countUnseenActionableCases(
      reports.map((report) => ({
        id: report.id,
        status: report.status,
        assignedTo: report.assignedTo,
      })),
      currentUser.uid,
      queueBadgeOptions
    );
  }, [reports, currentUser?.uid, queueBadgeOptions, seenRevision]);
  
  // Debug: Log role information
  console.log('AdminReportsPage - Role Info:', { role, isAdmin, isCODI, isHandler: isCODI });

  // Read URL query params on mount to pre-select tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam && ['all', 'active', 'unassigned', 'investigating', 'resolved', 'needs-attention'].includes(statusParam)) {
      setActiveTab(statusParam);
    }
  }, [location.search]);

  // Reset modal tab and close modal when selectedReport becomes null
  useEffect(() => {
    if (!selectedReport) {
      setModalTab('details');
      setModalOpen(false);
    }
  }, [selectedReport]);

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
      
      // CODI sees ALL cases (no filtering by assignment)
      // They can take any unassigned case or work on cases assigned to them
      console.log(`📊 Total cases visible: ${fetchedReports.length}`);
      
      setReports(fetchedReports);
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
  }, [reports, searchTerm, statusFilter, categoryFilter, escalationFilter, activeTab, sortField, sortDirection, location.search, representativeId]);

  // Auto-open report from URL query parameter (e.g., from notification)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportId = params.get('reportId');
    const noteId = params.get('noteId');
    
    if (reportId) {
      // If reportId is present, refresh reports first to ensure we have the latest data
      if (reports.length === 0) {
        console.log('📬 Report ID in URL, fetching reports first...');
        fetchReports();
        return;
      }
      
      const report = reports.find(r => r.id === reportId);
      if (report) {
        console.log('📬 Opening report from notification:', reportId, noteId ? `with note: ${noteId}` : '');
        
        // Get tab parameter from URL
        const tabParam = params.get('tab');
        if (tabParam && ['details', 'evidence', 'notes', 'activity'].includes(tabParam)) {
          setModalTab(tabParam);
          console.log('📑 Setting modal tab to:', tabParam);
        } else {
          setModalTab('details'); // Default to details tab
        }
        
        setSelectedReport(report);
        setModalOpen(true); // CRITICAL: Open the modal!
        markReportReviewed(report.id);
        console.log('✅ Modal opened with report:', report.id);
        
        // Set highlight note ID if present
        if (noteId) {
          setHighlightNoteId(noteId);
          setModalTab('notes'); // Switch to notes tab if noteId is present
        }
        
        // Clean up URL after opening (delayed to allow scroll to complete)
        setTimeout(() => {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }, 2000);
      } else {
        // Report not found in current list, wait and retry
        console.log('⚠️ Report not found in current list, waiting for Firestore sync...');
        
        // Retry after 1 second to allow Firestore real-time listener to update
        setTimeout(() => {
          const retryReport = reports.find(r => r.id === reportId);
          if (retryReport) {
            console.log('✅ Report found after retry, opening...');
            
            // Set modal tab
            const tabParam = params.get('tab');
            if (tabParam && ['details', 'evidence', 'notes', 'activity'].includes(tabParam)) {
              setModalTab(tabParam);
            } else {
              setModalTab('details');
            }
            
            setSelectedReport(retryReport);
            setModalOpen(true); // CRITICAL: Open the modal!
            markReportReviewed(retryReport.id);
            console.log('✅ Modal opened after retry:', retryReport.id);
            
            if (noteId) {
              setHighlightNoteId(noteId);
              setModalTab('notes');
            }
            
            setTimeout(() => {
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
            }, 2000);
          } else {
            console.log('Report not found after retry, refreshing reports...');
            fetchReports();
          }
        }, 1500);
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

  // Fetch notes counts for all reports
  useEffect(() => {
    if (reports.length === 0) return;

    const fetchNotesCounts = async () => {
      try {
        const { CaseNoteService } = await import('../../services/caseNoteService');
        const counts: Record<string, number> = {};
        
        for (const report of reports) {
          const notes = await CaseNoteService.getNotesByCaseId(report.id);
          counts[report.id] = notes.length;
        }
        
        setNotesCounts(counts);
        console.log('📝 Fetched notes counts for', Object.keys(counts).length, 'reports');
      } catch (error) {
        console.error('Error fetching notes counts:', error);
      }
    };

    fetchNotesCounts();
  }, [reports]);

  useEffect(() => {
    if (!fullscreenImage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setFullscreenImage(null);
      }
    };

    document.body.style.overflow = 'hidden';
    document.body.dataset.evidenceLightboxOpen = 'true';
    window.addEventListener('keydown', onKeyDown, true);

    const disableDialogPointerEvents = () => {
      document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-dialog-content]').forEach((layer) => {
        (layer as HTMLElement).style.pointerEvents = 'none';
      });
    };

    const restoreDialogPointerEvents = () => {
      document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-dialog-content]').forEach((layer) => {
        (layer as HTMLElement).style.pointerEvents = '';
      });
    };

    disableDialogPointerEvents();
    const syncPointerEvents = window.setTimeout(disableDialogPointerEvents, 0);

    return () => {
      window.clearTimeout(syncPointerEvents);
      document.body.style.overflow = '';
      delete document.body.dataset.evidenceLightboxOpen;
      window.removeEventListener('keydown', onKeyDown, true);
      restoreDialogPointerEvents();
    };
  }, [fullscreenImage]);

  const closeFullscreenImage = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const fetchedReports = await AdminReportService.getAllReports();
      
      // CODI sees ALL cases (no filtering)
      setReports(fetchedReports);
      console.log('📊 Fetched reports:', fetchedReports.length);
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

  const getActivityCount = (report: AdminReport): number => {
    const noteCount = notesCounts[report.id] ?? report.notesCount ?? 0;
    const statusChanges = Array.isArray(report.statusHistory) ? report.statusHistory.length : 0;
    const handlerChanges = Array.isArray(report.handlerHistory) ? report.handlerHistory.length : 0;
    const escalations = Array.isArray(report.escalationHistory) ? report.escalationHistory.length : 0;

    let count = noteCount + statusChanges + handlerChanges + escalations;

    // Fallback: if lastUpdated moved after filing but no tracked events, count at least one update
    if (count === 0) {
      const filedAt = safeToDate(report.reportedAt);
      const updatedAt =
        safeToDate((report as AdminReport & { updatedAt?: string }).lastUpdated) ||
        safeToDate((report as AdminReport & { updatedAt?: string }).updatedAt);
      if (filedAt && updatedAt && updatedAt.getTime() - filedAt.getTime() > 60_000) {
        count = 1;
      }
    }

    return count;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
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
    } else if (activeTab === 'unassigned') {
      filtered = filtered.filter(report => {
        const status = safeGet(report, 'status');
        const assigned = safeGet(report, 'assignedTo');
        return !assigned && (status === 'pending' || status === 'submitted');
      });
    } else if (activeTab === 'investigating') {
      filtered = filtered.filter(report => safeGet(report, 'status') === 'inProgress');
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(report => safeGet(report, 'status') === 'resolved');
    } else if (activeTab === 'needs-attention') {
      // Needs Attention: stale (3+ days), escalated, or follow-up requested
      filtered = filtered.filter(report => needsAttention(report));
    } else if (activeTab === 'all') {
      // "All" tab excludes closed cases - closed cases only appear in Case Archive page
      filtered = filtered.filter(report => safeGet(report, 'status') !== 'closed');
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        safeGet(report, 'title', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'description', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'location', '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(report, 'userName', '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // CODI "my assigned" filter from URL (?assigned=me)
    const assignedParam = new URLSearchParams(location.search).get('assigned');
    if (assignedParam === 'me' && representativeId) {
      filtered = filtered.filter((report) => safeGet(report, 'assignedTo') === representativeId);
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

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = (safeGet(a, 'title', '') || '').localeCompare(safeGet(b, 'title', '') || '');
          break;
        case 'complainant':
          comparison = (safeGet(a, 'userName', '') || '').localeCompare(safeGet(b, 'userName', '') || '');
          break;
        case 'handler':
          comparison = (safeGet(a, 'assignedToName', '') || '').localeCompare(safeGet(b, 'assignedToName', '') || '');
          break;
        case 'status':
          comparison = (safeGet(a, 'status', '') || '').localeCompare(safeGet(b, 'status', '') || '');
          break;
        case 'escalation':
          comparison = (a.escalationLevel || 0) - (b.escalationLevel || 0);
          break;
        case 'date':
        default:
          const dateA = safeToDate(a.reportedAt)?.getTime() || 0;
          const dateB = safeToDate(b.reportedAt)?.getTime() || 0;
          comparison = dateB - dateA; // Default: newest first
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredReports(filtered);
  };

  // Convert status to simplified user-friendly label (shorter for better UX)
  const getStatusLabel = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'submitted':
        return 'Pending';
      case 'inprogress':
      case 'investigating':
      case 'awaiting_response':
      case 'under_deliberation':
      case 'validated':
        return 'Investigating';
      case 'resolved':
        return 'Decision Already Made';
      case 'dismissed':
        return 'Closed';
      default:
        return status || 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    const label = getStatusLabel(status);
    switch (label) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs';
      case 'Investigating': return 'bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs';
      case 'Decision Already Made': return 'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20 px-3 py-1 rounded-full text-xs';
      case 'Closed': return 'bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 rounded-full text-xs';
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
          'ID', 'Title', 'Category', 'Status', 'Complainant', 'Location', 'Incident', 'Reported', 'Escalation'
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
          4: { cellWidth: 28, halign: 'left' },    // Complainant
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

    // QUICK SUMMARY BUTTON - Visible to all
    baseButtons.push(
      <div key="quick-summary" className="relative group">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            markReportReviewed(report.id);
            setQuickSummaryReport(report);
            setQuickSummaryOpen(true);
          }}
          className="text-gray-600 hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" />
        </Button>
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Quick Summary
        </span>
      </div>
    );

    // ESCALATION BUTTON - Visible to Admin only
    if (isAdmin) {
      baseButtons.push(
        <div key="escalation" className="relative group">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setReportToEscalate(report);
              setEscalationDialogOpen(true);
            }}
            className={(report.escalationLevel || 0) > 0 ? "text-orange-600 hover:bg-orange-50" : "text-gray-600 hover:bg-gray-50"}
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Escalate Case
          </span>
        </div>
      );
    }

    // TAKE CASE BUTTON - Visible to CODI for unassigned cases
    if (isCODI && !report.assignedTo) {
      baseButtons.push(
        <div key="take-case" className="relative group">
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              if (!representativeId || !currentUser) {
                toast({
                  title: 'Error',
                  description: 'Could not identify your handler profile. Please contact an administrator.',
                  variant: 'destructive',
                });
                return;
              }
              try {
                const { takeCase } = await import('../../services/caseAssignmentService');
                await takeCase({
                  complaintId: report.id,
                  handlerRepId: representativeId,
                  handlerName: representativeData?.displayName || currentUser.displayName || currentUser.email || 'CODI member',
                  handlerRole: representativeData?.role || 'handler',
                  handlerUserId: currentUser.uid,
                  assignedByUserId: currentUser.uid,
                  assignedByName: currentUser.displayName || currentUser.email || 'CODI member',
                  complaintType: report.category,
                  complainantUserId: report.userId,
                  complaintTitle: report.title,
                });

                toast({
                  title: 'Case Taken',
                  description: 'You are now assigned to this case. Status remains Pending until you post your first update.',
                });

                fetchReports();
              } catch (error) {
                console.error('Error taking case:', error);
                toast({
                  title: 'Error',
                  description: 'Failed to take case. Please try again.',
                  variant: 'destructive'
                });
              }
            }}
            className="text-green-600 hover:bg-green-50 border-green-300"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Take Case
          </span>
        </div>
      );
    }

    // VIEW BUTTON - Visible to all roles
    baseButtons.push(
      <Button 
        key="view"
        variant="outline" 
        size="sm"
        onClick={() => {
          markReportReviewed(report.id);
          setSelectedReport(report);
          setModalOpen(true);
        }}
        className="relative group"
      >
        <Eye className="h-4 w-4" />
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          View Report
        </span>
      </Button>
    );

    // CHAT BUTTON - Only visible to CODI assigned to this case AND case is not closed
    if (isCODI && report.assignedTo === representativeId && (report.status as string) !== 'closed') {
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
            Chat with Complainant
          </span>
        </Button>
      );
    }

    return baseButtons;
  };

  // Render the shared Dialog OUTSIDE the loop
  const renderReportDetailsDialog = () => {
    if (!selectedReport) return null;
    
    const report = selectedReport;
    
    return (
      <Dialog open={modalOpen} onOpenChange={(open) => {
        if (!open) {
          setSelectedReport(null);
          setModalOpen(false);
        }
      }}>
        <DialogContent
          className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl max-h-[90vh] sm:max-h-[85vh] p-4 sm:p-6"
          onPointerDownOutside={(event) => {
            if (fullscreenImage) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (fullscreenImage) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (fullscreenImage) event.preventDefault();
          }}
        >
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {isAdmin ? "Full Report Details" : "Case Details"}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  Case No:{' '}
                  <span className="text-base font-semibold text-gray-900">
                    {getDisplayCaseNumber({
                      caseId: safeGet(report, 'caseId', ''),
                      firestoreId: safeGet(report, 'id', ''),
                      filedAt: safeGet(report, 'reportedAt', ''),
                    })}
                  </span>
                </div>
                {getInternalCaseRef(safeGet(report, 'id', '')) && (
                  <div className="text-xs text-gray-400">
                    Internal ref:{' '}
                    <span className="font-mono">{getInternalCaseRef(safeGet(report, 'id', ''))}</span>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <Tabs value={modalTab} onValueChange={setModalTab} className="w-full">
              <TabsList className="mb-4 grid h-auto w-full grid-cols-2 sm:grid-cols-4 rounded-xl bg-emerald-50/60 p-1">
                <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1D9E75] data-[state=active]:shadow-sm">
                  Case Details
                </TabsTrigger>
                <TabsTrigger value="evidence" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1D9E75] data-[state=active]:shadow-sm">
                  Evidence & Files
                </TabsTrigger>
                <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1D9E75] data-[state=active]:shadow-sm">
                  Internal Notes
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1D9E75] data-[state=active]:shadow-sm">
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* DETAILS TAB */}
              <TabsContent value="details" className="overflow-y-auto max-h-[calc(90vh-220px)] sm:max-h-[calc(85vh-220px)] pr-2 sm:pr-3 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <CaseDetailStat label="Status">
                    <Badge className={`${getStatusColor(safeGet(selectedReport, 'status', 'pending'))} text-sm font-medium`}>
                      {getStatusLabel(safeGet(selectedReport, 'status', 'pending'))}
                    </Badge>
                  </CaseDetailStat>
                  <CaseDetailStat label="Category">
                    {getFormalComplaintCategoryLabel(String(safeGet(selectedReport, 'category', '')))}
                  </CaseDetailStat>
                  <CaseDetailStat label="Assigned CODI" className="col-span-2 md:col-span-1">
                    {safeGet(selectedReport, 'assignedToName', 'Unassigned')}
                  </CaseDetailStat>
                </div>

                <CaseDetailSection title={isAdmin ? 'Case Information' : 'Report Information'} icon={FileText}>
                  <CaseDetailGrid>
                    <CaseDetailField
                      label="Complaint Title"
                      value={safeGet(selectedReport, 'title', 'No title')}
                      fullWidth
                    />
                    <CaseDetailField
                      label={isOnlineReportLocation(selectedReport) ? 'Platform' : 'Location'}
                      value={safeGet(selectedReport, 'location', 'No location')}
                    />
                    {!isOnlineReportLocation(selectedReport) &&
                      safeGet(selectedReport, 'mapAddress') &&
                      safeGet(selectedReport, 'mapAddress') !== 'N/A' && (
                        <CaseDetailField
                          label="Map Address"
                          value={safeGet(selectedReport, 'mapAddress')}
                          fullWidth
                        />
                      )}
                    <CaseDetailField
                      label="Incident Date"
                      value={(() => {
                        const rawDate = safeGet(selectedReport, 'incidentDate');
                        const formattedDate = safeFormat(rawDate, 'MMM dd, yyyy');
                        if (formattedDate === 'N/A' && rawDate) {
                          try {
                            if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                              const date = new Date(rawDate + 'T00:00:00');
                              return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              });
                            }
                          } catch {
                            return formattedDate;
                          }
                        }
                        return formattedDate;
                      })()}
                    />
                    {formatReportIncidentTime(safeGet(selectedReport, 'incidentTime', '')) && (
                      <CaseDetailField
                        label="Incident Time"
                        value={formatReportIncidentTime(safeGet(selectedReport, 'incidentTime', ''))}
                      />
                    )}
                    {(safeGet(selectedReport, 'type', safeGet(selectedReport, 'category', '')) === 'sexual_harassment' ||
                      safeGet(selectedReport, 'category', '') === 'sexual_harassment') &&
                      formatReportHarassmentDegree(safeGet(selectedReport, 'harassmentDegree', '')) && (
                        <CaseDetailField
                          label="Degree of Harassment"
                          value={formatReportHarassmentDegree(safeGet(selectedReport, 'harassmentDegree', ''))}
                        />
                      )}
                    {isAdmin ? (
                      <>
                        <CaseDetailField
                          label="Complainant"
                          value={safeGet(selectedReport, 'userName', 'Unknown')}
                        />
                        <CaseDetailField
                          label="Email"
                          value={safeGet(selectedReport, 'userEmail', 'N/A')}
                        />
                        <CaseDetailField
                          label="Reported On"
                          value={safeFormat(safeGet(selectedReport, 'reportedAt'), 'MMM dd, h:mm a')}
                        />
                      </>
                    ) : (
                      <div className="sm:col-span-2">
                        <CaseDetailNotice>
                          Contact admin for complainant details
                        </CaseDetailNotice>
                      </div>
                    )}
                  </CaseDetailGrid>
                </CaseDetailSection>

                <CaseDetailSection title="Where It Happened" icon={MapPin} variant="muted">
                  <CaseDetailField
                    label="Location Details"
                    value={formatReportVicinity(safeGet(selectedReport, 'locationVicinity', ''))}
                  />
                </CaseDetailSection>

                {(() => {
                  const description = safeGet(selectedReport, 'description', '');
                  const statementOfFacts = safeGet(selectedReport, 'statementOfFacts', '');
                  const respondentAddress = safeGet(selectedReport, 'respondentAddress', '');
                  const respondentName = safeGet(selectedReport, 'respondentName', '');
                  const normalizedDescription =
                    description && description !== 'N/A' ? description : '';
                  const showRespondentAddress = shouldShowCaseTextField(
                    respondentAddress,
                    normalizedDescription,
                    statementOfFacts
                  );
                  const showRespondentSection =
                    (respondentName && respondentName !== 'N/A') || showRespondentAddress;
                  const showSeparateStatement =
                    !!statementOfFacts &&
                    statementOfFacts !== 'N/A' &&
                    !isDuplicateCaseText(statementOfFacts, normalizedDescription);

                  return (
                    <>
                      {showRespondentSection && (
                        <CaseDetailSection title="Respondent Information" variant="respondent">
                          <CaseDetailGrid>
                            {respondentName && respondentName !== 'N/A' && (
                              <CaseDetailField
                                label="Name"
                                value={formatRespondentName(respondentName)}
                              />
                            )}
                            {showRespondentAddress && (
                              <CaseDetailField
                                label={
                                  isUnknownRespondent(respondentName)
                                    ? 'Physical Description'
                                    : 'Address'
                                }
                                value={respondentAddress}
                                fullWidth
                              />
                            )}
                          </CaseDetailGrid>
                        </CaseDetailSection>
                      )}

                      <CaseDetailSection title="What Happened">
                        {normalizedDescription ? (
                          <CaseDetailTextBlock>{normalizedDescription}</CaseDetailTextBlock>
                        ) : (
                          <p className="text-sm text-gray-500">No description provided.</p>
                        )}
                        {showSeparateStatement && (
                          <div className="mt-4">
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                              Statement of Facts
                            </p>
                            <CaseDetailTextBlock>{statementOfFacts}</CaseDetailTextBlock>
                          </div>
                        )}
                      </CaseDetailSection>
                    </>
                  );
                })()}

                {(safeGet(selectedReport, 'witnesses') ||
                  shouldShowCaseTextField(
                    safeGet(selectedReport, 'additionalInfo'),
                    safeGet(selectedReport, 'description'),
                    safeGet(selectedReport, 'statementOfFacts')
                  )) && (
                  <CaseDetailSection title="Additional Information" variant="muted">
                    <CaseDetailGrid columns={1}>
                      {safeGet(selectedReport, 'witnesses') && (
                        <CaseDetailField
                          label="Witnesses"
                          value={safeGet(selectedReport, 'witnesses')}
                        />
                      )}
                      {shouldShowCaseTextField(
                        safeGet(selectedReport, 'additionalInfo'),
                        safeGet(selectedReport, 'description'),
                        safeGet(selectedReport, 'statementOfFacts')
                      ) && (
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            Notes
                          </p>
                          <CaseDetailTextBlock>{safeGet(selectedReport, 'additionalInfo')}</CaseDetailTextBlock>
                        </div>
                      )}
                    </CaseDetailGrid>
                  </CaseDetailSection>
                )}

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
                  <CaseDetailSection title="Incident Location Map" icon={MapPin}>
                    <div className="overflow-hidden rounded-xl border border-emerald-100 max-h-80">
                      <LocationMapPicker
                        onLocationSelect={() => {}}
                        initialLat={latNum}
                        initialLng={lngNum}
                        centerLat={latNum}
                        centerLng={lngNum}
                        selectedCity=""
                        selectedBarangay=""
                        readOnly={true}
                      />
                    </div>
                  </CaseDetailSection>
                );
              })()}

              {/* Handler Assignment Timeline */}
              {selectedReport.handlerHistory && selectedReport.handlerHistory.length > 0 && (
                <CaseDetailSection title="Assignment History" variant="muted">
                  <HandlerTimeline complaint={selectedReport} />
                </CaseDetailSection>
              )}

              {isCODI && selectedReport.assignedTo === representativeId && (selectedReport.status as string) !== 'closed' && (
                <CaseDetailSection title="CODI Decision & Status Management">
                  <p className="mb-4 text-xs text-gray-600">
                    You are assigned to this case. You can investigate, update status, and close this case.
                  </p>
                  <ReportStatusManager
                    reportId={selectedReport.id}
                    currentStatus={selectedReport.status as 'pending' | 'submitted' | 'inProgress' | 'resolved' | 'dismissed' | 'closed'}
                    collectionName="complaints"
                    onStatusUpdated={() => {
                      fetchReports();
                      fetchStats();
                      setSelectedReport(null);
                    }}
                    variant="full"
                  />
                </CaseDetailSection>
              )}
              </TabsContent>

              {/* EVIDENCE TAB */}
              <TabsContent value="evidence" className="overflow-y-auto max-h-[calc(90vh-220px)] sm:max-h-[calc(85vh-220px)] pr-2 sm:pr-3 space-y-4">
              {/* Attachments/Evidence */}
              <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                <h4 className="font-bold text-base mb-3 text-gray-900">Attachments & Evidence</h4>
                
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
                        const fileType = getFileType(url);
                        const fileName = getUserFriendlyFileName(url, index, fileType);
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
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    <Eye className="h-3 w-3" />
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
                                    // Other files: Open in new tab for preview
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 h-7 sm:h-8 text-xs flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
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
              </TabsContent>

              {/* INTERNAL NOTES TAB */}
              <TabsContent value="notes" className="overflow-y-auto max-h-[calc(90vh-220px)] sm:max-h-[calc(85vh-220px)] pr-2 sm:pr-3">
                <InternalNotesSection
                  caseId={selectedReport.id}
                  caseTitle={selectedReport.title || 'Case'}
                  assignedToId={selectedReport.assignedTo}
                  assignedToRole={selectedReport.assignedToRole as 'admin' | 'handler'}
                  highlightNoteId={highlightNoteId || undefined}
                  onNotePosted={() => {
                    fetchReports();
                    // Update selectedReport with fresh data
                    if (selectedReport) {
                      const freshReport = reports.find(r => r.id === selectedReport.id);
                      if (freshReport) {
                        setSelectedReport(freshReport);
                      }
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="activity" className="overflow-y-auto max-h-[calc(90vh-220px)] sm:max-h-[calc(85vh-220px)] pr-2 sm:pr-3">
                <CaseActivityTimeline report={selectedReport} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate handler stats from active (non-closed) cases assigned to this CODI member
  const getHandlerStats = () => {
    if (!reports) return null;
    const myActiveCases = reports.filter(
      (r) =>
        (r.status as string) !== 'closed' &&
        (!representativeId || r.assignedTo === representativeId)
    );
    return {
      total: myActiveCases.length,
      pending: myActiveCases.filter(
        (r) => r.status === 'pending' || (r.status as string) === 'submitted'
      ).length,
      inProgress: myActiveCases.filter((r) => r.status === 'inProgress').length,
      resolved: myActiveCases.filter((r) =>
        ['resolved', 'dismissed'].includes(r.status || '')
      ).length,
      escalated: myActiveCases.filter((r) => (r.escalationLevel || 0) > 0).length,
    };
  };

  const reportCardClass =
    'border-emerald-100/80 bg-white/95 shadow-sm ring-1 ring-emerald-950/[0.04] overflow-hidden';

  // Calculate tab counts (closed cases excluded - they go to separate Case Archive page)
  const tabCounts = {
    all: reports.filter(r => (r.status as string) !== 'closed').length, // Exclude closed from "All"
    active: reports.filter(r => r.status === 'pending' || (r.status as string) === 'submitted').length,
    unassigned: reports.filter(r => !r.assignedTo && (r.status === 'pending' || (r.status as string) === 'submitted')).length,
    investigating: reports.filter(r => r.status === 'inProgress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    needsAttention: reports.filter(r => needsAttention(r)).length,
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL
    const newUrl = tab === 'all' ? '/admin/reports' : `/admin/reports?status=${tab}`;
    window.history.pushState({}, '', newUrl);
  };

  const renderFullscreenImageViewer = () => {
    if (!fullscreenImage || typeof document === 'undefined') return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[99999] isolate bg-black"
        role="dialog"
        aria-modal="true"
        aria-label="Evidence image preview"
      >
        <div
          className="absolute inset-0"
          aria-hidden
          onPointerDown={closeFullscreenImage}
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 py-3">
            <p className="text-sm text-white/80">
              Evidence {fullscreenImage.index + 1} of {fullscreenImage.total}
            </p>
            <button
              type="button"
              autoFocus
              className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/25"
              aria-label="Close image preview"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeFullscreenImage();
              }}
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <img
              src={fullscreenImage.url}
              alt="Evidence preview"
              className="max-h-full max-w-full object-contain"
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="w-full space-y-8 pb-10">
      {renderFullscreenImageViewer()}

      {/* Handler Dashboard Stats - ONLY for handlers, NOT for admins */}
      {!isAdmin && isHandler && (
        <div className={`mb-2 grid grid-cols-1 gap-4 ${(getHandlerStats()?.escalated || 0) > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <Card className={reportCardClass}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/60 bg-emerald-50/30 pb-3">
              <CardTitle className="text-sm font-medium text-emerald-950">Total Cases</CardTitle>
              <FileText className="h-4 w-4 text-[#1D9E75]" aria-hidden />
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
              <Clock className="h-4 w-4 text-[#1D9E75]/75" aria-hidden />
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
              <CardTitle className="text-sm font-medium text-emerald-950">Ongoing Investigation</CardTitle>
              <AlertTriangle className="h-4 w-4 text-[#1D9E75]/70" aria-hidden />
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
              <CardTitle className="text-sm font-medium text-emerald-950">Decision Already Made</CardTitle>
              <CheckCircle className="h-4 w-4 text-[#1D9E75]" aria-hidden />
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

      {/* Header and Export Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {isHandler ? 'Case Management' : 'Reports'}
          </p>
          <h1 className="text-xl font-bold text-gray-900">
            {isHandler ? 'Case Queue' : 'Reports Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new URLSearchParams(location.search).get('assigned') === 'me'
              ? 'Cases currently assigned to you'
              : isHandler
              ? 'Shared queue — view all open cases and take unassigned ones to investigate'
              : 'View and manage all incident reports submitted by users'}
          </p>
        </div>
        {!isHandler && (
          <Button 
            onClick={handleExportConfirmation}
            size="sm"
            style={{ backgroundColor: '#1D9E75', color: 'white' }}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export PDF
          </Button>
        )}
      </div>

      {unseenQueueCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <div>
            <p className="font-semibold">
              {unseenQueueCount} case{unseenQueueCount > 1 ? 's' : ''} not yet reviewed
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Highlighted rows below match the red badge in the sidebar. Open a case to mark it as reviewed.
            </p>
          </div>
        </div>
      )}

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
                  <FileText className="h-7 w-7 text-[#1D9E75]" aria-hidden />
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
                  <p className="text-sm text-emerald-900/55">Ongoing Investigation</p>
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
                  <p className="text-sm text-emerald-900/55">Decision Already Made</p>
                </div>
                <div className="rounded-xl bg-emerald-100/60 p-2.5 ring-1 ring-emerald-200/50">
                  <CheckCircle className="h-7 w-7 text-[#1D9E75]" aria-hidden />
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
                ? 'border-[#1D9E75] text-[#1D9E75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            All
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'all' 
                ? 'bg-[#1D9E75]/10 text-[#1D9E75]' 
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
                ? 'border-[#1D9E75] text-[#1D9E75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Pending
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'active' 
                ? 'bg-[#1D9E75]/10 text-[#1D9E75]' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.active}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('unassigned')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'unassigned'
                ? 'border-[#1D9E75] text-[#1D9E75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Unassigned
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'unassigned'
                ? 'bg-[#1D9E75]/10 text-[#1D9E75]'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.unassigned}
            </span>
          </button>
          
          <button
            onClick={() => handleTabChange('investigating')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'investigating'
                ? 'border-[#1D9E75] text-[#1D9E75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Investigating
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'investigating' 
                ? 'bg-[#1D9E75]/10 text-[#1D9E75]' 
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
                ? 'border-[#1D9E75] text-[#1D9E75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Decision Made
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'resolved'
                ? 'bg-[#1D9E75]/10 text-[#1D9E75]'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.resolved}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('needs-attention')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'needs-attention'
                ? 'border-[#1D9E75] text-[#1D9E75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Needs Attention
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
              activeTab === 'needs-attention'
                ? 'bg-[#1D9E75]/10 text-[#1D9E75]'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tabCounts.needsAttention || 0}
            </span>
          </button>
        </nav>
      </div>

      {/* Filters */}
      <Card className={reportCardClass}>
        <CardHeader className="border-b border-gray-100 pb-4 pt-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Filter className="h-4 w-4 text-gray-500" aria-hidden />
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
                className="w-full border-emerald-100/90 bg-white focus-visible:border-[#1D9E75]/40 focus-visible:ring-[#1D9E75]/20"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-emerald-100/90 bg-white focus:ring-[#1D9E75]/20">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Pending</SelectItem>
                <SelectItem value="inProgress">Investigating</SelectItem>
                <SelectItem value="resolved">Decision Already Made</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="border-emerald-100/90 bg-white focus:ring-[#1D9E75]/20">
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
              <SelectTrigger className="border-emerald-100/90 bg-white focus:ring-[#1D9E75]/20">
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

      {/* Reports list — one card per case */}
      <Card className={reportCardClass}>
        <CardHeader className="border-b border-emerald-100/70 bg-gradient-to-r from-emerald-50/40 to-transparent pb-4 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold text-emerald-950">
              Reports <span className="font-normal text-emerald-800/60">({filteredReports.length})</span>
            </CardTitle>
            {filteredReports.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                <span className="mr-1">Sort:</span>
                {[
                  { field: 'date', label: 'Date' },
                  { field: 'title', label: 'Title' },
                  { field: 'status', label: 'Status' },
                  { field: 'complainant', label: 'Complainant' },
                  ...(!isHandler ? [{ field: 'handler', label: 'CODI' }] : []),
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleSort(field)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                      sortField === field
                        ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-medium'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {label}
                    {sortField === field ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100/70 ring-1 ring-emerald-200/50">
                <FileText className="h-7 w-7 text-[#1D9E75]/70" aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-emerald-950">No reports found</h3>
              <p className="text-sm text-emerald-900/55">
                {reports.length === 0
                  ? 'No reports have been submitted yet.'
                  : 'No reports match your current filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {filteredReports.map((report) => {
                const isUnseenQueue = isUnseenInQueue(report);
                const daysOpen = getDaysOpen(report);
                const status = safeGet(report, 'status', 'pending');
                const isMine = representativeId && report.assignedTo === representativeId;

                return (
                  <div
                    key={report.id}
                    className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
                      isUnseenQueue ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-start gap-2">
                          {isUnseenQueue && (
                            <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0" title="Not yet reviewed">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-gray-900 leading-snug">
                                {safeGet(report, 'title', 'No Title')}
                              </h3>
                              <Badge className={`${getStatusColor(status)} font-medium shrink-0`}>
                                {getStatusLabel(status)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              {getDisplayCaseNumber({
                                caseId: report.caseId,
                                firestoreId: report.id,
                                filedAt: report.reportedAt,
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            {safeGet(report, 'location', 'No location')}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {safeGet(report, 'userName', 'Unknown') === 'Anonymous' ? (
                              <>
                                <Lock className="h-3.5 w-3.5 text-gray-400" />
                                Anonymous
                              </>
                            ) : (
                              <>
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                {safeGet(report, 'userName', 'Unknown')}
                              </>
                            )}
                          </span>
                          {!isHandler && (
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-[#1D9E75]" />
                              {report.assignedToName || 'Unassigned'}
                              {report.assignedToRole && (
                                <CodiRoleBadge role={report.assignedToRole} />
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isUnseenQueue && (
                            <Badge className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5">
                              Not reviewed
                            </Badge>
                          )}
                          {isMine && (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5">
                              Assigned to you
                            </Badge>
                          )}
                          {!report.assignedTo && (status === 'pending' || status === 'submitted') && (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5">
                              Unassigned
                            </Badge>
                          )}
                          {(report.escalationLevel || 0) > 0 && (
                            <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs font-semibold px-2">
                              {report.hoursUnprocessed || 0}h escalated
                            </Badge>
                          )}
                          {safeGet(report, 'followUpRequested', false) && (
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold px-2 flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              Follow-Up
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Filed {safeFormat(safeGet(report, 'reportedAt'), 'MMM dd, yyyy HH:mm')}
                          </span>
                          <span>·</span>
                          <span className={differenceInDays(new Date(), safeToDate((report as any).lastUpdated) || safeToDate((report as any).updatedAt) || safeToDate(report.reportedAt) || new Date()) >= 3 ? 'text-amber-600 font-medium' : ''}>
                            Updated {getLastUpdated(report)}
                          </span>
                          <span>·</span>
                          <span className={daysOpen >= 10 ? 'text-red-600 font-medium' : daysOpen >= 5 ? 'text-amber-600 font-medium' : ''}>
                            {daysOpen}d open
                          </span>
                          <span>·</span>
                          <span>{getActivityCount(report)} activity</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-100 pt-3 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0">
                        {getActionButtons(report)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Details Dialog - Shared across all reports */}
      {renderReportDetailsDialog()}

      {/* NOTE: Removed AssignCODIMemberDialog - All CODI members now see all cases automatically */}

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
              <li>Status and Complainant information</li>
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
              className="bg-[#1D9E75] hover:bg-[#178F65]"
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
      {pdfViewerOpen && selectedPdfUrl && (
        <PDFViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
          pdfUrl={selectedPdfUrl}
          fileName="Evidence Document"
        />
      )}

      {/* Quick Summary Dialog */}
      <Dialog open={quickSummaryOpen} onOpenChange={setQuickSummaryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Case Summary</DialogTitle>
            <DialogDescription>
              Quick overview of {quickSummaryReport?.title || 'this case'}
            </DialogDescription>
          </DialogHeader>
          {quickSummaryReport && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3">
                <CaseDetailStat label="Status">
                  <Badge className={`${getStatusColor(safeGet(quickSummaryReport, 'status', 'pending'))} text-sm font-medium`}>
                    {getStatusLabel(safeGet(quickSummaryReport, 'status', 'pending'))}
                  </Badge>
                </CaseDetailStat>
                <CaseDetailStat label="Days Open">
                  <span className="text-lg font-bold text-gray-900">{getDaysOpen(quickSummaryReport)}d</span>
                </CaseDetailStat>
              </div>

              <CaseDetailGrid columns={1}>
                <CaseDetailStat label="Submitted">
                  {safeFormat(safeGet(quickSummaryReport, 'reportedAt'), 'MMM dd, yyyy')}
                </CaseDetailStat>
                <CaseDetailStat label="Assigned CODI">
                  {safeGet(quickSummaryReport, 'assignedToName') || 'Not assigned'}
                </CaseDetailStat>
                <CaseDetailStat label="Last Updated">
                  {getLastUpdated(quickSummaryReport)}
                </CaseDetailStat>
              </CaseDetailGrid>

              <div className="grid grid-cols-2 gap-3">
                <CaseDetailStat label="Updates">
                  <span className="text-lg font-bold text-gray-900">{getActivityCount(quickSummaryReport)}</span>
                  <p className="mt-1 text-[10px] font-normal text-gray-500">
                    Assignments, status changes, notes, escalations
                  </p>
                </CaseDetailStat>
                <CaseDetailStat label="Follow-Ups">
                  <span className="text-lg font-bold text-gray-900">
                    {safeGet(quickSummaryReport, 'followUpRequested', false) ? '1' : '0'}
                  </span>
                </CaseDetailStat>
              </div>

              <CaseDetailStat label="Escalated">
                {(quickSummaryReport.escalationLevel || 0) > 0 ? (
                  <span className="text-red-600">
                    Yes ({ESCALATION_LABELS[quickSummaryReport.escalationLevel as EscalationLevel] || 'Level ' + quickSummaryReport.escalationLevel})
                  </span>
                ) : (
                  <span className="text-gray-600">No</span>
                )}
              </CaseDetailStat>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (quickSummaryReport) {
                  markReportReviewed(quickSummaryReport.id);
                }
                setQuickSummaryOpen(false);
                setSelectedReport(quickSummaryReport);
                setModalOpen(true);
                setModalTab('details');
              }}
              className="bg-[#1D9E75] hover:bg-[#178F65]"
            >
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Viewer Modal */}
      {selectedVideoUrl && (
        <Dialog open={videoViewerOpen} onOpenChange={setVideoViewerOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-white rounded-xl shadow-2xl border-2 border-emerald-200" style={{ height: '90vh' }}>
            <div className="flex flex-col h-full w-full rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 p-5 border-b-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
                <DialogTitle className="text-lg font-bold text-emerald-900 tracking-wide">Video Evidence</DialogTitle>
              </div>
              
              {/* Video Container */}
              <div className="flex-1 overflow-hidden bg-gray-50 relative flex items-center justify-center group">
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
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-300 rounded-tl-lg opacity-30 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-300 rounded-tr-lg opacity-30 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-300 rounded-bl-lg opacity-30 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-300 rounded-br-lg opacity-30 pointer-events-none"></div>
              </div>
              
              {/* Footer */}
              <div className="flex gap-3 p-5 border-t-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 justify-end items-center">
                <div className="text-xs text-emerald-700 mr-auto font-medium">
                  Video Player • Press ESC to close
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
                >
                  <a href={selectedVideoUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    Open
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVideoViewerOpen(false)}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all"
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