import React, { useState, useEffect } from 'react';
import { AdminReportService } from "../../services/adminReportService";
import { useAuth } from "../../contexts/AuthContext";
import { useRepresentativeRole } from "../../hooks/useRepresentativeRole";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { 
  FileText, 
  Clock, 
  User,
  MapPin,
  Search,
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Archive
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { format } from "date-fns";

interface AdminReport {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  reportedAt?: any;
  status?: string;
  userId?: string;
  userName?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToRole?: string;
  closedAt?: any;
  closedBy?: string;
  closedByName?: string;
}

const CaseArchive = () => {
  const { currentUser } = useAuth();
  const { role } = useRepresentativeRole();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const isCODI = (role as string) === 'codi' || role === 'handler';

  // Fetch closed cases only
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = AdminReportService.subscribeToAllReports((fetchedReports) => {
      // Filter only closed cases
      const closedCases = fetchedReports.filter(r => (r.status as string) === 'closed');
      setReports(closedCases);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.userName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'title':
          aVal = a.title || '';
          bVal = b.title || '';
          break;
        case 'complainant':
          aVal = a.userName || '';
          bVal = b.userName || '';
          break;
        case 'handler':
          aVal = a.assignedToName || '';
          bVal = b.assignedToName || '';
          break;
        case 'date':
        default:
          aVal = a.closedAt?.toDate?.() || a.reportedAt?.toDate?.() || new Date(0);
          bVal = b.closedAt?.toDate?.() || b.reportedAt?.toDate?.() || new Date(0);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredReports(filtered);
  }, [reports, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const safeFormat = (date: any, formatStr: string) => {
    try {
      if (!date) return 'N/A';
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return format(dateObj, formatStr);
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-white to-emerald-50/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
              <Archive className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Case Archive</h1>
              <p className="text-sm text-gray-600 mt-1">
                View all closed and archived cases
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Archived</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{reports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {reports.filter(r => {
                  const closedDate = r.closedAt?.toDate?.() || new Date(0);
                  const now = new Date();
                  return closedDate.getMonth() === now.getMonth() && closedDate.getFullYear() === now.getFullYear();
                }).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">This Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {reports.filter(r => {
                  const closedDate = r.closedAt?.toDate?.() || new Date(0);
                  return closedDate.getFullYear() === new Date().getFullYear();
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Archive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              placeholder="Search by title, description, location, or complainant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Archived Cases ({filteredReports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No archived cases found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>
                      <button 
                        onClick={() => handleSort('title')} 
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        Report Title
                        {sortField === 'title' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        onClick={() => handleSort('complainant')} 
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        Complainant
                        {sortField === 'complainant' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        onClick={() => handleSort('handler')} 
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        CODI
                        {sortField === 'handler' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        onClick={() => handleSort('date')} 
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        Closed Date
                        {sortField === 'date' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report, index) => (
                    <TableRow key={report.id} className="hover:bg-gray-50">
                      <TableCell className="font-semibold text-gray-600">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{report.title || 'No Title'}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {report.location || 'No location'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.userName === 'Anonymous' ? (
                          <div className="flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-500 text-sm">Anonymous</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{report.userName || 'Unknown'}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.assignedToName ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">{report.assignedToName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {safeFormat(report.closedAt || report.reportedAt, 'MMM dd, yyyy')}
                          </div>
                          <div className="text-gray-500">{safeFormat(report.closedAt || report.reportedAt, 'HH:mm')}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CaseArchive;
