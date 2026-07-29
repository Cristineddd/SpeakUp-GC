import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Archive,
  Search,
  FileText,
  User,
  Calendar,
  Download,
  Eye,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import { useLocation } from '../../compat/router';
import { getFormalComplaintCategoryLabel, FORMAL_COMPLAINT_CATEGORIES, normalizeFormalComplaintCategory } from '../../constants/formalComplaintCategories';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import {
  CaseDetailField,
  CaseDetailGrid,
  CaseDetailSection,
  CaseDetailStat,
  CaseDetailTextBlock,
} from '../../components/case/CaseDetailLayout';
import { getDisplayCaseNumber } from '../../utils/caseId';

interface ClosedCase {
  id: string;
  caseId?: string;
  title: string;
  type: string;
  description?: string;
  complainant: string;
  isAnonymous: boolean;
  dateFiled: Date;
  dateResolved: Date;
  decisionSummary: string;
  actionTaken?: string;
  finalNotes?: string;
  closedByName?: string;
  assignedRepresentative: string;
  closureDocument?: string;
  closureDocumentName?: string;
  complianceReport?: string;
  status: string;
}

const ClosedCasesPage = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { role, representativeData } = useRepresentativeRole();
  const isCODI = !isAdmin && ((role as string) === 'codi' || role === 'handler');
  const representativeId = representativeData?.id ?? null;
  const [closedCases, setClosedCases] = useState<ClosedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCase, setSelectedCase] = useState<ClosedCase | null>(null);

  useEffect(() => {
    // Query for officially closed cases only
    // Note: Removed orderBy to avoid Firestore index requirement - we'll sort in memory
    const casesQuery = query(
      collection(db, 'complaints'),
      where('status', '==', 'closed')
    );

    const unsubscribe = onSnapshot(casesQuery, (snapshot) => {
      const cases: ClosedCase[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        if (isCODI && representativeId && data.assignedTo !== representativeId) {
          return;
        }

        cases.push({
          id: doc.id,
          caseId: data.caseId,
          title: data.title || data.description?.substring(0, 50) || 'Untitled Case',
          type: normalizeFormalComplaintCategory(data.type || data.category || 'other'),
          description: data.description || data.statementOfFacts || '',
          complainant: data.isAnonymous ? 'Anonymous' : (data.complainantName || 'Unknown'),
          isAnonymous: data.isAnonymous || false,
          dateFiled: data.createdAt?.toDate() || new Date(),
          dateResolved: data.dateResolved?.toDate() || data.updatedAt?.toDate() || new Date(),
          decisionSummary: data.decisionSummary || data.resolution || 'No summary available',
          actionTaken: data.actionTaken || '',
          finalNotes: data.finalNotes || '',
          closedByName: data.closedByName || data.updatedByName || '',
          assignedRepresentative: data.assignedToName || data.assignedHandlerName || data.assignedRepresentative || 'Unassigned',
          closureDocument: data.closureDocument,
          closureDocumentName: data.closureDocumentName,
          complianceReport: data.complianceReport,
          status: data.status || 'closed',
        });
      });
      
      // Sort by dateResolved in memory (newest first)
      cases.sort((a, b) => b.dateResolved.getTime() - a.dateResolved.getTime());
      
      setClosedCases(cases);
      setLoading(false);
      
      console.log('📦 [ClosedCases] Loaded cases:', cases.length, cases);
    });

    return () => unsubscribe();
  }, [isCODI, representativeId]);

  const filteredCases = closedCases.filter((case_) => {
    const matchesSearch = 
      case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.complainant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter =
      filterType === 'all' || normalizeFormalComplaintCategory(case_.type) === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const openCaseDetail = useCallback((case_: ClosedCase) => {
    setSelectedCase(case_);
    window.history.replaceState({}, '', `/admin/closed-cases?caseId=${case_.id}`);
  }, []);

  const closeCaseDetail = useCallback(() => {
    setSelectedCase(null);
    window.history.replaceState({}, '', '/admin/closed-cases');
  }, []);

  useEffect(() => {
    const caseId = new URLSearchParams(location.search).get('caseId');
    if (!caseId || closedCases.length === 0) return;

    const match = closedCases.find((case_) => case_.id === caseId);
    if (match) {
      setSelectedCase(match);
    }
  }, [location.search, closedCases]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-gray-200 border-t-green-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading closed cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Archive</p>
          <h1 className="text-xl font-bold text-gray-900">{isCODI ? 'My Closed Cases' : 'Case Archive'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isCODI
              ? 'Cases you closed or were assigned to when closed'
              : 'All resolved and closed cases with final decisions'}
          </p>
        </div>
        <Badge variant="outline" className="px-4 py-2">
          <Archive className="h-4 w-4 mr-2" />
          {closedCases.length} Closed Cases
        </Badge>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by case title, complainant, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Categories</option>
              {FORMAL_COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-gray-600" />
            Closed Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No closed cases found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm ? 'Try adjusting your search criteria' : 'Resolved cases will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Title & Type</TableHead>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Date Filed</TableHead>
                    <TableHead>Date Resolved</TableHead>
                    <TableHead>Decision Summary</TableHead>
                    <TableHead>Assigned Rep</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((case_) => (
                    <TableRow
                      key={case_.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openCaseDetail(case_)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{case_.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{getFormalComplaintCategoryLabel(case_.type)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {case_.isAnonymous && (
                            <User className="h-4 w-4 text-gray-400" />
                          )}
                          <span className={case_.isAnonymous ? 'text-gray-500 italic' : 'text-gray-900'}>
                            {case_.complainant}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {format(case_.dateFiled, 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {format(case_.dateResolved, 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700 max-w-xs truncate">
                          {case_.decisionSummary}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700">{case_.assignedRepresentative}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {case_.closureDocument && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Closure Document"
                              asChild
                            >
                              <a href={case_.closureDocument} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {case_.complianceReport && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Compliance Report"
                              asChild
                            >
                              <a href={case_.complianceReport} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                          Closed
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCaseDetail(case_);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedCase)}
        onOpenChange={(open) => {
          if (!open) closeCaseDetail();
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,90vh)] w-[calc(100vw-2rem)] max-w-3xl flex-col overflow-hidden p-0 sm:w-full">
          {selectedCase && (
            <>
              <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-5">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Closed Case Details
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      Case No:{' '}
                      <span className="font-semibold text-gray-900">
                        {getDisplayCaseNumber({
                          caseId: selectedCase.caseId,
                          firestoreId: selectedCase.id,
                          filedAt: selectedCase.dateFiled.toISOString(),
                        })}
                      </span>
                    </div>
                    <p className="text-gray-600">{selectedCase.title}</p>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <CaseDetailStat label="Status">
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">Closed</Badge>
                  </CaseDetailStat>
                  <CaseDetailStat label="Category">
                    {getFormalComplaintCategoryLabel(selectedCase.type)}
                  </CaseDetailStat>
                  <CaseDetailStat label="Assigned CODI">
                    {selectedCase.assignedRepresentative}
                  </CaseDetailStat>
                </div>

                <CaseDetailSection title="Case Information" icon={FileText}>
                  <CaseDetailGrid>
                    <CaseDetailField
                      label="Complainant"
                      value={selectedCase.complainant}
                    />
                    <CaseDetailField
                      label="Date Filed"
                      value={format(selectedCase.dateFiled, 'MMM dd, yyyy')}
                    />
                    <CaseDetailField
                      label="Date Closed"
                      value={format(selectedCase.dateResolved, 'MMM dd, yyyy')}
                    />
                    {selectedCase.closedByName && (
                      <CaseDetailField
                        label="Closed By"
                        value={selectedCase.closedByName}
                      />
                    )}
                  </CaseDetailGrid>
                  {selectedCase.description && (
                    <div className="mt-4">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Description
                      </p>
                      <CaseDetailTextBlock>{selectedCase.description}</CaseDetailTextBlock>
                    </div>
                  )}
                </CaseDetailSection>

                <CaseDetailSection title="Final Decision" icon={Archive} variant="muted">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Decision Summary
                      </p>
                      <CaseDetailTextBlock>{selectedCase.decisionSummary}</CaseDetailTextBlock>
                    </div>
                    {selectedCase.actionTaken && (
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Action Taken
                        </p>
                        <CaseDetailTextBlock>{selectedCase.actionTaken}</CaseDetailTextBlock>
                      </div>
                    )}
                    {selectedCase.finalNotes && (
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Final Notes
                        </p>
                        <CaseDetailTextBlock>{selectedCase.finalNotes}</CaseDetailTextBlock>
                      </div>
                    )}
                  </div>
                </CaseDetailSection>

                {(selectedCase.closureDocument || selectedCase.complianceReport) && (
                  <CaseDetailSection title="Documents" icon={Download}>
                    <div className="flex flex-wrap gap-3">
                      {selectedCase.closureDocument && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={selectedCase.closureDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {selectedCase.closureDocumentName || 'Closure Document'}
                          </a>
                        </Button>
                      )}
                      {selectedCase.complianceReport && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={selectedCase.complianceReport}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Compliance Report
                          </a>
                        </Button>
                      )}
                    </div>
                  </CaseDetailSection>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Closed</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{closedCases.length}</p>
              </div>
              <Archive className="h-12 w-12 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {closedCases.filter(c => {
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return c.dateResolved >= monthAgo;
                  }).length}
                </p>
              </div>
              <Calendar className="h-12 w-12 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Resolution Time</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {closedCases.length > 0
                    ? Math.round(
                        closedCases.reduce((acc, c) => {
                          const days = Math.floor(
                            (c.dateResolved.getTime() - c.dateFiled.getTime()) / (1000 * 60 * 60 * 24)
                          );
                          return acc + days;
                        }, 0) / closedCases.length
                      )
                    : 0}{' '}
                  days
                </p>
              </div>
              <FileText className="h-12 w-12 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClosedCasesPage;
