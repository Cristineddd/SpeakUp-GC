/**
 * CaseChat Page
 * Standalone chat page for case communication
 */

import { useParams, useNavigate } from '../../compat/router';
import { useState, useEffect } from 'react';
import { ChatInterface } from '../../components/chat/ChatInterface';
import { HandlerChatInterface } from '../../components/chat/HandlerChatInterface';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Loader2, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { useAuth } from '../../contexts/AuthContext';
import type { AdminReport } from '../../services/adminReportService';

export default function CaseChat() {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const [complaintTitle, setComplaintTitle] = useState<string>('');
  const [complaint, setComplaint] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { role, isAdmin, loading: roleLoading } = useRepresentativeRole();
  
  // Check if user is a handler
  const isHandler = role === 'handler' || isAdmin;

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
          
          // Always convert to AdminReport format
          const complaintData = {
            id: complaintSnap.id,
            title: data.title || '',
            description: data.description || '',
            location: data.location || data.incidentLocation || '',
            category: data.category || data.type || '',
            severity: data.severity || 'medium',
            status: data.status || 'pending',
            userName: data.userName || data.complainantName || 'Unknown',
            userEmail: data.userEmail || data.complainantEmail || '',
            userId: data.userId || data.complainantId || '',
            incidentDate: data.incidentDate || data.createdAt,
            reportedAt: data.reportedAt || data.createdAt,
            lastUpdated: data.lastUpdated || data.updatedAt,
            assignedTo: data.assignedTo || null,
            assignedToName: data.assignedToName || 'Franz Panot', // Default handler name
            handlerHistory: data.handlerHistory || [],
            isAnonymous: data.isAnonymous || false,
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

  // Get status color for badges
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'inprogress': 
      case 'in_progress': 
      case 'in progress': 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'dismissed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get severity color for badges
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) || 'Unknown';
  };

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
    <div className="fixed inset-0 z-10 flex flex-col min-h-0 overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Animated dots pattern background */}
      <div
        className="absolute inset-0 opacity-30 animate-pulse pointer-events-none"
        style={{ 
          backgroundImage: "radial-gradient(circle, #1D9E75 1px, transparent 1px)", 
          backgroundSize: "32px 32px",
          animationDuration: "4s"
        }}
      />
      {/* Green glow effects */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#1D9E75]/8 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: "6s" }} />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/6 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "8s", animationDelay: "1s" }} />
      {/* Case chat header — top-aligned so icon/title/meta read as one block (avoids “floating” icon vs two lines) */}
      <div className="relative z-50 flex-shrink-0 border-b border-gray-200/70 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-6xl px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="mt-px h-9 w-9 shrink-0 rounded-full text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div
              className="mt-px flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D9E75] to-emerald-600 shadow-sm ring-1 ring-black/5"
              aria-hidden
            >
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1 pt-px">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="max-w-full text-[15px] font-semibold leading-snug tracking-tight text-gray-900 sm:text-base">
                  <span className="line-clamp-2 sm:line-clamp-1 sm:truncate">
                    {complaintTitle || 'Case Chat'}
                  </span>
                </h1>
                {complaint && (
                  <Badge
                    className={`shrink-0 text-[10px] font-semibold ${getStatusColor(complaint.status)}`}
                  >
                    {formatStatus(complaint.status)}
                  </Badge>
                )}
              </div>
              {complaint && (
                <p className="mt-0.5 text-[11px] leading-tight text-gray-500 sm:text-xs">
                  <span className="break-words">{complaint.category}</span>
                  {isHandler && complaint.severity && (
                    <>
                      <span className="mx-1.5 text-gray-300" aria-hidden>
                        ·
                      </span>
                      <span
                        className={
                          complaint.severity === 'critical'
                            ? 'font-medium text-red-600'
                            : complaint.severity === 'high'
                              ? 'font-medium text-orange-600'
                              : 'font-medium text-gray-600'
                        }
                      >
                        {complaint.severity}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        {isHandler ? (
          <HandlerChatInterface
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