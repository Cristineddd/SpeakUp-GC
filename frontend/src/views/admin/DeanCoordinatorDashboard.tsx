/**
 * Dean/Coordinator Dashboard
 * View-only dashboard for Dean and Coordinator roles
 * Shows analytics, reports overview, and activity logs
 * Enhanced with vibrant green theme
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  BarChart3,
  Eye,
  Shield,
  AlertCircle,
  UserCheck,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AdminReportService, AdminReport, ReportStats } from "../../services/adminReportService";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";


const DeanCoordinatorDashboard = () => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedReports, fetchedStats] = await Promise.all([
        AdminReportService.getAllReports(),
        AdminReportService.getReportStats()
      ]);
      setReports(fetchedReports);
      setStats(fetchedStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inProgress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'inProgress': return <AlertTriangle className="h-3 w-3" />;
      case 'resolved': return <CheckCircle className="h-3 w-3" />;
      case 'dismissed': return <AlertCircle className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const categoryBreakdown = reports.reduce((acc, report) => {
    const cat = report.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Reports Overview</h1>
        <p className="text-gray-600">View and manage all incident reports</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-1 bg-white p-1 rounded-lg border">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Reports</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pendingReports}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.inProgressReports}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Escalated</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.escalatedReports}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Resolved</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.resolvedReports}</p>
                      {stats.totalReports > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          {Math.round((stats.resolvedReports / stats.totalReports) * 100)}% Success
                        </p>
                      )}
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="bg-green-50 border-b">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <BarChart3 className="h-5 w-5" />
                Reports by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="text-center p-4 border rounded-lg bg-white">
                    <p className="text-2xl font-bold text-green-600">{count}</p>
                    <p className="text-sm text-gray-600 capitalize mt-1">{category}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader className="bg-green-50 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <FileText className="h-5 w-5" />
                  Recent Reports
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={assignmentFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setAssignmentFilter('all')}
                    className="h-8 bg-green-600 hover:bg-green-700 text-white"
                  >
                    All ({reports.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={assignmentFilter === 'assigned' ? 'default' : 'outline'}
                    onClick={() => setAssignmentFilter('assigned')}
                    className="h-8 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Assigned ({reports.filter(r => r.assignedToName).length})
                  </Button>
                  <Button
                    size="sm"
                    variant={assignmentFilter === 'unassigned' ? 'default' : 'outline'}
                    onClick={() => setAssignmentFilter('unassigned')}
                    className="h-8 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Unassigned ({reports.filter(r => !r.assignedToName).length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {reports
                  .filter(report => {
                    if (assignmentFilter === 'assigned') return report.assignedToName;
                    if (assignmentFilter === 'unassigned') return !report.assignedToName;
                    return true;
                  })
                  .map((report) => (
                  <div key={report.id} className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{report.title || 'No Title'}</h3>
                          <Badge className={`${getSeverityColor(report.severity)} flex items-center gap-1`}>
                            <Shield className="h-3 w-3" />
                            {report.severity}
                          </Badge>
                          <Badge className={`${getStatusColor(report.status)} flex items-center gap-1`}>
                            {getStatusIcon(report.status)}
                            {report.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span><strong>Category:</strong> {report.category || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span><strong>Complainant:</strong> {report.userName || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span><strong>Date:</strong> {report.reportedAt ? format(new Date(report.reportedAt), 'MMM dd, yyyy') : 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span><strong>Handler:</strong> {report.assignedToName || 'Unassigned'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* View Details Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                            className="ml-4 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                          <DialogHeader className="pb-4 border-b">
                            <DialogTitle className="flex items-center gap-2">
                              <Eye className="h-5 w-5 text-green-600" />
                              Report Details
                            </DialogTitle>
                            <DialogDescription>
                              ID: {report.id}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedReport && (
                            <div className="overflow-y-auto max-h-[calc(90vh-150px)] space-y-4 pr-2">{/* Added max-h calculation and padding */}
                              {/* Quick Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-blue-50 rounded-lg border">
                                  <p className="text-sm font-medium text-blue-700">Status</p>
                                  <Badge className={`${getStatusColor(selectedReport.status)} mt-1`}>
                                    {selectedReport.status}
                                  </Badge>
                                </div>
                                <div className="p-3 bg-yellow-50 rounded-lg border">
                                  <p className="text-sm font-medium text-yellow-700">Severity</p>
                                  <Badge className={`${getSeverityColor(selectedReport.severity)} mt-1`}>
                                    {selectedReport.severity}
                                  </Badge>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border">
                                  <p className="text-sm font-medium text-purple-700">Category</p>
                                  <p className="text-sm font-semibold mt-1">{selectedReport.category || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg border">
                                  <p className="text-sm font-medium text-green-700">Handler</p>
                                  <p className="text-sm font-semibold mt-1">{selectedReport.assignedToName || 'Unassigned'}</p>
                                </div>
                              </div>

                              {/* Main Content */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Left Column */}
                                <div className="space-y-4">
                                  <div className="p-4 border rounded-lg">
                                    <h4 className="font-semibold mb-2">Case Information</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>Title:</strong> {selectedReport.title || 'No title'}</div>
                                      <div><strong>Location:</strong> {selectedReport.location || 'N/A'}</div>
                                      <div><strong>Incident Date:</strong> {selectedReport.incidentDate ? format(new Date(selectedReport.incidentDate), 'MMM dd, yyyy') : 'N/A'}</div>
                                      <div><strong>Complainant:</strong> {selectedReport.userName || 'Unknown'}</div>
                                      <div><strong>Email:</strong> {selectedReport.userEmail || 'N/A'}</div>
                                      <div><strong>Reported On:</strong> {selectedReport.reportedAt ? format(new Date(selectedReport.reportedAt), 'MMM dd, h:mm a') : 'N/A'}</div>
                                    </div>
                                  </div>

                                  {/* Respondent Information */}
                                  {(selectedReport.respondentName || selectedReport.respondentAddress) && (
                                    <div className="p-4 border rounded-lg bg-orange-50">
                                      <h4 className="font-semibold mb-2 text-orange-700">Respondent Information</h4>
                                      <div className="space-y-2 text-sm">
                                        {selectedReport.respondentName && (
                                          <div><strong>Name:</strong> {selectedReport.respondentName}</div>
                                        )}
                                        {selectedReport.respondentAddress && (
                                          <div>
                                            <strong>
                                              {selectedReport.respondentName === 'Unknown/Not Disclosed' 
                                                ? 'Physical Description:' 
                                                : 'Address:'}
                                            </strong> {selectedReport.respondentAddress}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                  <div className="p-4 border rounded-lg">
                                    <h4 className="font-semibold mb-2">Description</h4>
                                    <div className="text-sm bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                                      {selectedReport.description || 'No description provided'}
                                    </div>
                                  </div>

                                  {(selectedReport.witnesses || selectedReport.additionalInfo) && (
                                    <div className="p-4 border rounded-lg">
                                      <h4 className="font-semibold mb-2">Additional Information</h4>
                                      <div className="space-y-2 text-sm">
                                        {selectedReport.witnesses && (
                                          <div><strong>Witnesses:</strong> {selectedReport.witnesses}</div>
                                        )}
                                        {selectedReport.additionalInfo && (
                                          <div className="bg-gray-50 p-3 rounded border max-h-24 overflow-y-auto">
                                            {selectedReport.additionalInfo}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {selectedReport.adminNotes && (
                                    <div className="p-4 border rounded-lg bg-blue-50">
                                      <h4 className="font-semibold mb-2 text-blue-700">Admin Notes</h4>
                                      <div className="text-sm bg-white p-3 rounded border max-h-24 overflow-y-auto">
                                        {selectedReport.adminNotes}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Evidence */}
                              {(selectedReport.evidenceURLs && selectedReport.evidenceURLs.length > 0) && (
                                <div className="p-4 border rounded-lg bg-red-50">
                                  <h4 className="font-semibold mb-3 text-red-700">
                                    Evidence & Attachments ({selectedReport.evidenceURLs.length})
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {selectedReport.evidenceURLs.map((url, index) => (
                                      <div 
                                        key={index} 
                                        className="relative cursor-pointer group"
                                        onClick={() => {
                                          setSelectedImageUrl(url);
                                          setImageIndex(index);
                                        }}
                                      >
                                        <img 
                                          src={url} 
                                          alt={`Evidence ${index + 1}`}
                                          className="w-full h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded transition-all flex items-center justify-center">
                                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                          {index + 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Fullscreen Image Modal */}
                              {selectedImageUrl && (
                                <Dialog open={!!selectedImageUrl} onOpenChange={(open) => !open && setSelectedImageUrl(null)}>
                                  <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black border-0 rounded-lg">
                                    <div className="relative w-full h-[80vh] flex items-center justify-center">
                                      {/* Close Button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedImageUrl(null);
                                        }}
                                        className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors"
                                      >
                                        <X className="h-6 w-6 text-black" />
                                      </button>

                                      {/* Image */}
                                      <img 
                                        src={selectedImageUrl} 
                                        alt={`Full view - Evidence ${imageIndex + 1}`}
                                        className="max-w-full max-h-full object-contain"
                                      />

                                      {/* Navigation */}
                                      {selectedReport?.evidenceURLs && selectedReport.evidenceURLs.length > 1 && (
                                        <>
                                          {/* Previous Button */}
                                          <button
                                            onClick={() => {
                                              const newIndex = imageIndex === 0 ? selectedReport.evidenceURLs!.length - 1 : imageIndex - 1;
                                              setImageIndex(newIndex);
                                              setSelectedImageUrl(selectedReport.evidenceURLs![newIndex]);
                                            }}
                                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors"
                                          >
                                            <ChevronLeft className="h-6 w-6 text-black" />
                                          </button>

                                          {/* Next Button */}
                                          <button
                                            onClick={() => {
                                              const newIndex = imageIndex === selectedReport.evidenceURLs!.length - 1 ? 0 : imageIndex + 1;
                                              setImageIndex(newIndex);
                                              setSelectedImageUrl(selectedReport.evidenceURLs![newIndex]);
                                            }}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors"
                                          >
                                            <ChevronRight className="h-6 w-6 text-black" />
                                          </button>

                                          {/* Image Counter */}
                                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm">
                                            {imageIndex + 1} / {selectedReport.evidenceURLs.length}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
};

export default DeanCoordinatorDashboard;