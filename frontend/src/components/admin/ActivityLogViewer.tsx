/**
 * Activity Log Viewer Component
 * Displays activity logs with filtering and search
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Filter,
  Download,
  Search,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { ActivityLogService } from '../../services/activityLogService';
import {
  ActivityLog,
  ActivityLogFilters,
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_CATEGORIES,
  getActivitySeverityColor,
  getActivityCategoryColor,
  formatDuration,
  ActivityAction,
  LogSeverity,
  ActivityCategory,
} from '../../types/activityLog';
import { format } from 'date-fns';
import { useToast } from '../../hooks/use-toast';

interface ActivityLogViewerProps {
  complaintId?: string;
  userId?: string;
  title?: string;
  showExport?: boolean;
  maxHeight?: string;
}

export const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({
  complaintId,
  userId,
  title = 'Activity Logs',
  showExport = true,
  maxHeight = '600px',
}) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [complaintId, userId]);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, severityFilter, categoryFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let fetchedLogs: ActivityLog[];

      if (complaintId) {
        fetchedLogs = await ActivityLogService.getComplaintLogs(complaintId);
      } else if (userId) {
        fetchedLogs = await ActivityLogService.getUserLogs(userId);
      } else {
        fetchedLogs = await ActivityLogService.getActivityLogs({ limit: 100 });
      }

      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.description.toLowerCase().includes(searchLower) ||
          log.userName.toLowerCase().includes(searchLower) ||
          log.complaintTitle?.toLowerCase().includes(searchLower) ||
          ACTIVITY_ACTION_LABELS[log.action].toLowerCase().includes(searchLower)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter((log) => log.severity === severityFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((log) => log.category === categoryFilter);
    }

    setFilteredLogs(filtered);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      const filters: ActivityLogFilters = {};
      
      if (complaintId) filters.complaintIds = [complaintId];
      if (userId) filters.userIds = [userId];
      if (severityFilter !== 'all') filters.severity = [severityFilter as LogSeverity];
      if (categoryFilter !== 'all') filters.category = [categoryFilter];
      if (searchTerm) filters.searchTerm = searchTerm;

      const result = await ActivityLogService.exportLogs({
        format,
        filters,
        includeDetails: true,
        includeChanges: true,
      });

      // Download file
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `Logs exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export logs',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>{title}</CardTitle>
            <Badge variant="outline">{filteredLogs.length} logs</Badge>
          </div>
          {showExport && (
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={exporting}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Activity Logs</DialogTitle>
                    <DialogDescription>
                      Choose a format to export the filtered logs
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleExport('csv')}
                      disabled={exporting}
                      className="flex-1"
                    >
                      Export as CSV
                    </Button>
                    <Button
                      onClick={() => handleExport('json')}
                      disabled={exporting}
                      className="flex-1"
                      variant="outline"
                    >
                      Export as JSON
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                Refresh
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <div className="border rounded-lg" style={{ maxHeight, overflowY: 'auto' }}>
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Time</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="text-sm text-gray-600">
                        {format(log.timestamp, 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getActivitySeverityColor(log.severity)}
                        >
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1">{log.severity}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getActivityCategoryColor(log.category as ActivityCategory)}
                        >
                          {log.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {ACTIVITY_ACTION_LABELS[log.action]}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm">{log.userName}</div>
                            {log.userRole && (
                              <div className="text-xs text-gray-500">{log.userRole}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm line-clamp-2">{log.description}</p>
                          {log.complaintTitle && (
                            <p className="text-xs text-gray-500 mt-1">
                              Case: {log.complaintTitle}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(log.id)}
                        >
                          {expandedLogId === log.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedLogId === log.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-gray-50">
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-700">Log ID</p>
                                <p className="text-gray-600">{log.id}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700">Timestamp</p>
                                <p className="text-gray-600">
                                  {format(log.timestamp, 'PPpp')}
                                </p>
                              </div>
                              {log.complaintId && (
                                <div>
                                  <p className="font-medium text-gray-700">Complaint ID</p>
                                  <p className="text-gray-600">{log.complaintId}</p>
                                </div>
                              )}
                              {log.duration && (
                                <div>
                                  <p className="font-medium text-gray-700">Duration</p>
                                  <p className="text-gray-600">
                                    {formatDuration(log.duration)}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-700">Success</p>
                                <Badge variant={log.success ? 'default' : 'destructive'}>
                                  {log.success ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Success
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Failed
                                    </>
                                  )}
                                </Badge>
                              </div>
                            </div>

                            {log.errorMessage && (
                              <div>
                                <p className="font-medium text-gray-700 mb-1">Error</p>
                                <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                                  {log.errorMessage}
                                </div>
                              </div>
                            )}

                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <p className="font-medium text-gray-700 mb-1">Details</p>
                                <div className="bg-white border rounded p-2 text-sm">
                                  <pre className="text-xs overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {log.changes && log.changes.length > 0 && (
                              <div>
                                <p className="font-medium text-gray-700 mb-1">Changes</p>
                                <div className="space-y-2">
                                  {log.changes.map((change, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white border rounded p-2 text-sm"
                                    >
                                      <p className="font-medium">{change.field}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-red-600 line-through">
                                          {JSON.stringify(change.oldValue)}
                                        </span>
                                        <span>→</span>
                                        <span className="text-green-600">
                                          {JSON.stringify(change.newValue)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
