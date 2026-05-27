import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText,
  TrendingUp,
  Download,
  Eye,
  MoreVertical,
  Trash2,
  Archive,
  X,
  Paperclip,
  File,
  Image as ImageIcon
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminReportService } from '../../services/adminReportService';
import { useToast } from '../../hooks/use-toast';
import { PDFViewerModal } from '../../components/common/PDFViewerModal';

// Helper function to safely convert various date formats
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  
  // If it's a Firebase Timestamp
  if (dateValue && typeof dateValue.toDate === 'function') {
    try {
      return dateValue.toDate();
    } catch (error) {
      console.warn('Error converting Firebase Timestamp:', error);
      return new Date();
    }
  }
  
  // If it's a string or number, try to parse it
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  // Fallback to current date
  return new Date();
};

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  
  // State for real-time data
  const [reportStats, setReportStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    inProgressReports: 0,
    dismissedReports: 0,
    thisMonth: 0,
    lastMonth: 0,
    growthRate: 0
  });

  const [recentReports, setRecentReports] = useState([]);
  const [reportsByType, setReportsByType] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);

  // View report details function
  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setIsDetailDialogOpen(true);
  };

  // Delete report function
  const handleDeleteReport = async (reportId: string, reportTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete the report "${reportTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(`🗑️ Deleting report: ${reportId}`);
      await AdminReportService.deleteReportFromBothCollections(reportId);
      
      toast({
        title: "Report Deleted",
        description: `Successfully deleted report "${reportTitle}"`,
      });

      console.log(`✅ Successfully deleted report: ${reportId}`);
    } catch (error) {
      console.error('❌ Error deleting report:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the report. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Archive report function
  const handleArchiveReport = async (reportId: string, reportTitle: string) => {
    if (!window.confirm(`Are you sure you want to archive the report "${reportTitle}"? Archived reports can be restored later.`)) {
      return;
    }

    try {
      console.log(`📦 Archiving report: ${reportId}`);
      await AdminReportService.archiveReportFromBothCollections(reportId);
      
      toast({
        title: "Report Archived",
        description: `Successfully archived report "${reportTitle}"`,
      });

      console.log(`✅ Successfully archived report: ${reportId}`);
    } catch (error) {
      console.error('❌ Error archiving report:', error);
      toast({
        title: "Archive Failed",
        description: "Failed to archive the report. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Resolve report function
  const handleResolveReport = async (reportId: string, reportTitle: string) => {
    if (!window.confirm(`Are you sure you want to mark the report "${reportTitle}" as resolved? This will allow you to delete or archive it later.`)) {
      return;
    }

    try {
      console.log(`✅ Resolving report: ${reportId}`);
      await AdminReportService.updateReportStatusFromBothCollections(reportId, 'resolved');
      
      toast({
        title: "Report Resolved",
        description: `Successfully resolved report "${reportTitle}"`,
      });

      console.log(`✅ Successfully resolved report: ${reportId}`);
    } catch (error) {
      console.error('❌ Error resolving report:', error);
      toast({
        title: "Resolve Failed",
        description: "Failed to resolve the report. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Fetch real-time data from Firebase
  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setLoading(true);
        
        // Fetch all complaints/reports from multiple possible collections
        let complaints = [];
        const collectionsToTry = ['complaints', 'reports'];
        
        for (const collectionName of collectionsToTry) {
          try {
            const complaintsQuery = query(
              collection(db, collectionName),
              orderBy(collectionName === 'reports' ? 'reportedAt' : 'createdAt', 'desc')
            );
            
            const complaintsSnapshot = await getDocs(complaintsQuery);
            console.log(`📋 Admin Reports: Found ${complaintsSnapshot.size} items in '${collectionName}' collection`);
            
            if (complaintsSnapshot.size > 0) {
              complaints = complaintsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  title: data.title || data.description || 'Untitled Report',
                  type: data.type || data.category || 'general',
                  status: data.status || 'submitted',
                  complainantName: data.complainantName || data.userName || 'Unknown',
                  respondentName: data.respondentName || 'Unknown',
                  severity: data.severity || 'medium',
                  createdAt: collectionName === 'reports' 
                    ? safeToDate(data.reportedAt)
                    : safeToDate(data.createdAt),
                  updatedAt: collectionName === 'reports'
                    ? safeToDate(data.lastUpdated)
                    : safeToDate(data.updatedAt),
                  // Include all other data fields
                  ...data
                };
              });
              break; // Use the first collection with data
            }
          } catch (error) {
            console.error(`Error fetching from ${collectionName}:`, error);
            // Continue to next collection
          }
        }
        
        // Calculate statistics
        const totalReports = complaints.length;
        const pendingReports = complaints.filter(r => 
          ['submitted', 'under_review', 'requirements_pending'].includes(r.status)
        ).length;
        const resolvedReports = complaints.filter(r => 
          ['resolved', 'dismissed'].includes(r.status)
        ).length;
        const inProgressReports = complaints.filter(r => 
          ['investigating', 'awaiting_response'].includes(r.status)
        ).length;
        
        // Calculate monthly trends
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        const thisMonth = complaints.filter(r => r.createdAt >= thisMonthStart).length;
        const lastMonth = complaints.filter(r => 
          r.createdAt >= lastMonthStart && r.createdAt < thisMonthStart
        ).length;
        
        const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
        
        setReportStats({
          totalReports,
          pendingReports,
          resolvedReports,
          inProgressReports,
          dismissedReports: 0, // Add this for old data fetch
          thisMonth,
          lastMonth,
          growthRate
        });
        
        // Process recent reports for display
        const processedReports = complaints.map(complaint => {
          console.log('📋 Processing complaint:', complaint.id, {
            evidenceURLs: complaint.evidenceURLs,
            evidenceFileNames: complaint.evidenceFileNames,
            evidenceCount: complaint.evidenceCount,
            hasAffidavit: complaint.hasAffidavit,
            affidavitURL: complaint.affidavitURL,
            affidavitFileName: complaint.affidavitFileName
          });
          
          return {
            id: complaint.id,
            title: complaint.title,
            type: complaint.type,
            status: complaint.status,
            complainant: complaint.complainantName || 'Unknown',
            filedDate: complaint.createdAt,
            priority: complaint.severity || 'medium',
            respondent: complaint.respondentName,
            // Include all fields for detail view
            description: complaint.description,
            statementOfFacts: complaint.statementOfFacts,
            incidentDate: complaint.incidentDate,
            incidentTime: complaint.incidentTime,
            incidentLocation: complaint.incidentLocation,
            witnesses: complaint.witnesses,
            additionalInfo: complaint.additionalInfo,
            // Evidence fields - URLs and file names
            evidenceURLs: complaint.evidenceURLs || [],
            evidenceFileNames: complaint.evidenceFileNames || [],
            affidavitURL: complaint.affidavitURL || null,
            affidavitFileName: complaint.affidavitFileName || null,
            evidenceCount: complaint.evidenceCount || 0,
            hasAffidavit: complaint.hasAffidavit || !!complaint.affidavitURL,
            // Contact info
            complainantContact: complaint.complainantContact,
            complainantAddress: complaint.complainantAddress,
            respondentAddress: complaint.respondentAddress,
            respondentPosition: complaint.respondentPosition,
            respondentDepartment: complaint.respondentDepartment,
            isAnonymous: complaint.isAnonymous || false
          };
        });
        
        setRecentReports(processedReports);
        
        // Calculate reports by type
        const typeStats = complaints.reduce((acc: any, complaint) => {
          const type = complaint.type || 'other';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        setReportsByType(Object.entries(typeStats).map(([type, count]) => ({
          type: type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          count
        })));
        
      } catch (error) {
        console.error('Error fetching reports data:', error);
        // Set empty state on error
        setReportStats({
          totalReports: 0,
          pendingReports: 0,
          resolvedReports: 0,
          inProgressReports: 0,
          dismissedReports: 0, // Add this for error state
          thisMonth: 0,
          lastMonth: 0,
          growthRate: 0
        });
        setRecentReports([]);
        setReportsByType([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [selectedPeriod]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Under Investigation': return 'bg-blue-100 text-blue-800';
      case 'Pending Review': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive reporting and analytics for the complaint management system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              +{reportStats.thisMonth} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.resolvedReports}</div>
            <p className="text-xs text-muted-foreground">
              {((reportStats.resolvedReports / reportStats.totalReports) * 100).toFixed(1)}% resolution rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.dismissedReports}</div>
            <p className="text-xs text-muted-foreground">
              Can be archived or deleted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {reportStats.growthRate > 0 ? '+' : ''}{reportStats.growthRate}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">All Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Reports by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Reports by Type</CardTitle>
                <CardDescription>
                  Distribution of complaints by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportsByType.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span className="text-sm font-medium">{item.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                        <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  Latest complaints filed in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentReports.slice(0, 4).map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{report.id}</p>
                        <p className="text-xs text-muted-foreground">{report.title}</p>
                      </div>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Reports</CardTitle>
              <CardDescription>
                Complete list of all complaints in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of all reports in the system.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Report ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReports.map((report, index) => {
                    const isEscalated = (report.escalationLevel || 0) > 0;
                    return (
                      <TableRow 
                        key={report.id}
                        className={isEscalated ? 'bg-red-100 hover:bg-red-200/80 border-red-200' : ''}
                      >
                        <TableCell className="font-semibold text-gray-600">{index + 1}</TableCell>
                        <TableCell className="font-medium">{report.id}</TableCell>
                        <TableCell>{report.title}</TableCell>
                        <TableCell>{report.type}</TableCell>
                        <TableCell>{report.complainant}</TableCell>
                        <TableCell>{report.dateReported}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(report.priority)}>
                            {report.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.assignedTo}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {/* Always show View button */}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewReport(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Show Delete and Archive buttons for resolved or dismissed reports */}
                            {(report.status === 'resolved' || report.status === 'dismissed') && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleArchiveReport(report.id, report.title)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Archive Report"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteReport(report.id, report.title)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Report"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {/* Show Resolve button for non-resolved/non-archived/non-dismissed reports */}
                            {report.status !== 'resolved' && report.status !== 'archived' && report.status !== 'dismissed' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleResolveReport(report.id, report.title)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Mark as Resolved"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resolution Rate</CardTitle>
                <CardDescription>
                  Percentage of resolved complaints over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">62.8%</div>
                <p className="text-sm text-muted-foreground">
                  +5.2% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Resolution Time</CardTitle>
                <CardDescription>
                  Average time to resolve complaints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">18.5 days</div>
                <p className="text-sm text-muted-foreground">
                  -2.3 days from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Common Issues</CardTitle>
                <CardDescription>
                  Top reported complaint types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Sexual Harassment</span>
                    <span className="text-sm font-medium">28.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Academic Misconduct</span>
                    <span className="text-sm font-medium">24.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Discrimination</span>
                    <span className="text-sm font-medium">18.6%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Investigations</CardTitle>
                <CardDescription>
                  Cases currently under review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reportStats.inProgressReports}</div>
                <p className="text-sm text-muted-foreground">
                  Across all teams
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>
                Reports filed and resolved by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyTrends.map((month) => (
                  <div key={month.month} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">{month.month}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm">Filed: {month.reports}</span>
                      <span className="text-sm">Resolved: {month.resolved}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((month.resolved / month.reports) * 100).toFixed(1)}% resolved)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Key performance indicators for the complaint system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">89%</div>
                  <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">15.2</div>
                  <p className="text-sm text-muted-foreground">Avg. Days to Resolve</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">94%</div>
                  <p className="text-sm text-muted-foreground">Follow-up Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Report Details</span>
              {selectedReport?.isAnonymous && (
                <Badge className="bg-blue-100 text-blue-800">Anonymous</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Case ID: {(selectedReport as any)?.caseId || selectedReport?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <Badge className={getStatusColor(selectedReport.status)}>
                    {selectedReport.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Priority</Label>
                  <Badge className={getPriorityColor(selectedReport.priority)}>
                    {selectedReport.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Type</Label>
                  <p className="text-sm">{selectedReport.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Date Filed</Label>
                  <p className="text-sm">
                    {selectedReport.filedDate && safeToDate(selectedReport.filedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Complainant Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Complainant Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Name</Label>
                    <p className="text-sm">{selectedReport.complainant}</p>
                  </div>
                  {!selectedReport.isAnonymous && selectedReport.complainantContact && (
                    <div>
                      <Label className="text-sm font-semibold">Contact</Label>
                      <p className="text-sm">{selectedReport.complainantContact}</p>
                    </div>
                  )}
                  {!selectedReport.isAnonymous && selectedReport.complainantAddress && (
                    <div className="col-span-2">
                      <Label className="text-sm font-semibold">Address</Label>
                      <p className="text-sm">{selectedReport.complainantAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Respondent Info */}
              {selectedReport.respondent && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Respondent Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Name</Label>
                      <p className="text-sm">{selectedReport.respondent}</p>
                    </div>
                    {selectedReport.respondentPosition && (
                      <div>
                        <Label className="text-sm font-semibold">Position</Label>
                        <p className="text-sm">{selectedReport.respondentPosition}</p>
                      </div>
                    )}
                    {selectedReport.respondentDepartment && (
                      <div>
                        <Label className="text-sm font-semibold">Department</Label>
                        <p className="text-sm">{selectedReport.respondentDepartment}</p>
                      </div>
                    )}
                    {selectedReport.respondentAddress && (
                      <div className="col-span-2">
                        <Label className="text-sm font-semibold">Address</Label>
                        <p className="text-sm">{selectedReport.respondentAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Incident Details */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Incident Details</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Title</Label>
                    <p className="text-sm">{selectedReport.title}</p>
                  </div>
                  {selectedReport.incidentDate && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Incident Date</Label>
                        <p className="text-sm">{selectedReport.incidentDate}</p>
                      </div>
                      {selectedReport.incidentTime && (
                        <div>
                          <Label className="text-sm font-semibold">Time</Label>
                          <p className="text-sm">{selectedReport.incidentTime}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedReport.incidentLocation && (
                    <div>
                      <Label className="text-sm font-semibold">Location</Label>
                      <p className="text-sm">{selectedReport.incidentLocation}</p>
                    </div>
                  )}
                  {selectedReport.description && (
                    <div>
                      <Label className="text-sm font-semibold">Description</Label>
                      <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                        {selectedReport.description}
                      </p>
                    </div>
                  )}
                  {selectedReport.statementOfFacts && (
                    <div>
                      <Label className="text-sm font-semibold">Statement of Facts</Label>
                      <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                        {selectedReport.statementOfFacts}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Evidence and Attachments */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Evidence & Attachments
                  <Badge variant="outline" className="ml-2">
                    {selectedReport.evidenceCount || 0} file(s)
                  </Badge>
                </h3>

                {(selectedReport.evidenceCount > 0 || selectedReport.hasAffidavit || 
                  (selectedReport.evidenceFileNames && selectedReport.evidenceFileNames.length > 0) ||
                  (selectedReport.evidenceURLs && selectedReport.evidenceURLs.length > 0)) ? (
                  <div className="space-y-3">
                    {/* Affidavit */}
                    {selectedReport.hasAffidavit && (selectedReport.affidavitFileName || selectedReport.affidavitURL) && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <File className="h-5 w-5 text-blue-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold">Sworn Affidavit</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedReport.affidavitFileName || 'affidavit.pdf'}
                            </p>
                          </div>
                          <Badge className="bg-blue-600">PDF</Badge>
                          {selectedReport.affidavitURL && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPdfUrl(selectedReport.affidavitURL);
                                  setPdfViewerOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a href={selectedReport.affidavitURL} target="_blank" rel="noopener noreferrer" download>
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Evidence Files */}
                    {selectedReport.evidenceFileNames && selectedReport.evidenceFileNames.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          Supporting Evidence ({selectedReport.evidenceFileNames.length} file{selectedReport.evidenceFileNames.length > 1 ? 's' : ''})
                        </Label>
                        <div className="space-y-2">
                          {selectedReport.evidenceFileNames.map((fileName: string, index: number) => {
                            const fileExt = fileName.split('.').pop()?.toLowerCase();
                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '');
                            const isPDF = fileExt === 'pdf';
                            const fileURL = selectedReport.evidenceURLs?.[index];
                            
                            return (
                              <div key={index} className="bg-muted p-3 rounded-lg border">
                                <div className="flex items-center gap-2">
                                  {isImage ? (
                                    <ImageIcon className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <File className="h-5 w-5 text-gray-600" />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{fileName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {isImage ? 'Image' : isPDF ? 'PDF Document' : 'Document'}
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    {fileExt?.toUpperCase()}
                                  </Badge>
                                  {fileURL && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      asChild
                                    >
                                      <a href={fileURL} target="_blank" rel="noopener noreferrer" download={fileName}>
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
                    No evidence files attached to this report.
                  </div>
                )}
              </div>

              {/* Additional Information */}
              {(selectedReport.witnesses || selectedReport.additionalInfo) && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Additional Information</h3>
                  <div className="space-y-3">
                    {selectedReport.witnesses && (
                      <div>
                        <Label className="text-sm font-semibold">Witnesses</Label>
                        <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                          {selectedReport.witnesses}
                        </p>
                      </div>
                    )}
                    {selectedReport.additionalInfo && (
                      <div>
                        <Label className="text-sm font-semibold">Additional Notes</Label>
                        <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                          {selectedReport.additionalInfo}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
    </div>
  );
};

export default Reports;
