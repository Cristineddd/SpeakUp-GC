/**
 * CaseChat Page
 * Standalone chat page for case communication
 */

import { useParams, useNavigate } from '../../compat/router';
import { useState, useEffect } from 'react';
import { ChatInterface } from '../../components/chat/ChatInterface';
import { CODIMemberChatInterface } from '../../components/chat/HandlerChatInterface';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Loader2, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { useAuth } from '../../contexts/AuthContext';
import type { AdminReport } from '../../services/adminReportService';
import { getDisplayCaseNumber } from '../../utils/caseId';
import { safeToDate } from '../../utils/dateFormat';
import { markCaseSeen } from '../../utils/caseQueueBadge';

export default function CaseChat() {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const [complaintTitle, setComplaintTitle] = useState<string>('');
  const [complaint, setComplaint] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { role, isAdmin, loading: roleLoading } = useRepresentativeRole();
  
  // Check if user is a CODI member or admin
  const isHandler = role === 'handler' || role === 'codi' || isAdmin;

  console.log('🔍 CaseChat Debug:', {
    complaintId,
    currentUser: currentUser?.uid,
    role,
    isAdmin,
    isHandler,
    roleLoading,
    complaintLoaded: !!complaint,
    loading
  });

  useEffect(() => {
    const fetchComplaint = async () => {
      if (!complaintId) {
        setError('No complaint ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📋 Fetching complaint data for:', complaintId);
        
        // Try complaints collection first
        let complaintRef = doc(db, 'complaints', complaintId);
        let complaintSnap = await getDoc(complaintRef);

        // If not found, try reports collection
        if (!complaintSnap.exists()) {
          console.log('🔍 Complaint not found in "complaints", trying "reports" collection');
          complaintRef = doc(db, 'reports', complaintId);
          complaintSnap = await getDoc(complaintRef);
        }

        if (complaintSnap.exists()) {
          const data = complaintSnap.data();
          console.log('✅ Complaint found:', data);
          setComplaintTitle(data.title || 'Case Chat');

          const toIsoString = (value: unknown) => {
            const date = safeToDate(value);
            return date ? date.toISOString() : undefined;
          };
          
          // Always convert to AdminReport format
          const complaintData = {
            id: complaintSnap.id,
            caseId: data.caseId,
            title: data.title || '',
            description: data.description || '',
            location: data.location || data.incidentLocation || '',
            category: data.category || data.type || '',
            severity: data.severity || 'medium',
            status: data.status || 'pending',
            userName: data.userName || data.complainantName || 'Unknown',
            complainantName: data.complainantName || data.userName || 'Unknown',
            userEmail: data.userEmail || data.complainantEmail || '',
            userId: data.userId || data.complainantId || '',
            complainantId: data.complainantId || data.userId || '',
            incidentDate:
              toIsoString(data.incidentDate) ||
              toIsoString(data.filingDate) ||
              toIsoString(data.createdAt),
            reportedAt:
              toIsoString(data.reportedAt) ||
              toIsoString(data.filingDate) ||
              toIsoString(data.createdAt),
            lastUpdated:
              toIsoString(data.lastUpdated) ||
              toIsoString(data.updatedAt) ||
              toIsoString(data.createdAt),
            assignedTo: data.assignedTo || null,
            assignedToName: data.assignedToName || null,
            handlerHistory: data.handlerHistory || [],
            isAnonymous: data.isAnonymous || data.complainantName === 'Anonymous',
          } as AdminReport;
          
          console.log('👤 Complaint parsed:', complaintData);
          setComplaint(complaintData);
          setError(null);
        } else {
          console.log('❌ No complaint found with ID:', complaintId);
          setError('Complaint not found');
        }
      } catch (error) {
        console.error('❌ Error fetching complaint:', error);
        setError('Failed to load complaint data');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaint();
  }, [complaintId]);

  useEffect(() => {
    if (!complaintId || !currentUser?.uid || roleLoading || !isHandler) return;
    markCaseSeen(currentUser.uid, complaintId);
  }, [complaintId, currentUser?.uid, isHandler, roleLoading]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  // Show error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="shadow-2xl border-0 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Unable to Load Chat
            </h2>
            <p className="text-gray-600 mb-2">{error}</p>
            <p className="text-sm text-gray-500 mb-6">Complaint ID: {complaintId}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="px-6 py-2 rounded-lg"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wait for both role and complaint to load
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="shadow-2xl border-0 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <MessageCircle className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Conversation</h3>
            <p className="text-gray-600 mb-4">Preparing your chat interface...</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Complaint ID: {complaintId}</p>
              <p>User: {currentUser?.email || 'Not signed in'}</p>
              <p>Role: {roleLoading ? 'Checking...' : role || 'None'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!complaintId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="shadow-2xl border-0 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Invalid Complaint ID
            </h2>
            <p className="text-gray-600 mb-6">The chat room you're trying to access doesn't exist or has been removed.</p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show chat interface for all users
  // fixed inset-0: pins the shell to the layout viewport so header + bottom input stay stable across browser zoom (h-screen/100vh alone often drifts).
  return (
    <div className="fixed inset-0 z-10 flex min-h-0 flex-col overflow-hidden bg-slate-200/70">
      <div className="relative shrink-0 border-b border-slate-200/80 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1180px] items-center gap-2 px-3 py-2 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-9 w-9 shrink-0 rounded-full text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Case conversation</p>
            {complaint && (
              <p className="truncate text-xs text-gray-500">
                {getDisplayCaseNumber({
                  caseId: complaint.caseId,
                  firestoreId: complaint.id,
                  filedAt: complaint.reportedAt,
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {isHandler ? (
          <CODIMemberChatInterface
            complaintId={complaintId}
            complaint={complaint!}
            className="h-full rounded-none border-0 shadow-none"
          />
        ) : (
          <ChatInterface
            complaintId={complaintId}
            complaintTitle={complaintTitle}
            className="h-full rounded-none border-0 shadow-none"
          />
        )}
      </div>
    </div>
  );
}