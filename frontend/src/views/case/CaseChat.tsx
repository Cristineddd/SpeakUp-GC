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
import { ArrowLeft, Loader2, MessageCircle, User, Shield, FileText, MapPin, Calendar, Clock, Mail, AlertCircle, RefreshCw } from 'lucide-react';
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
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Simple Back Button Only - No Redundant Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-lg flex-shrink-0">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-gray-100 transition-colors border border-gray-200 flex-shrink-0 h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-2xl font-bold text-gray-900 truncate leading-tight">
                  {complaintTitle || 'Case Chat'}
                </h1>
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                  {complaint && (
                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                      <Badge className="bg-green-100 text-green-800 border-green-200 font-medium px-1.5 py-0.5 sm:px-3 sm:py-1 text-xs whitespace-nowrap">
                        {complaint.category}
                      </Badge>
                      <Badge className={`font-medium px-1.5 py-0.5 sm:px-3 sm:py-1 text-xs whitespace-nowrap ${getStatusColor(complaint.status)}`}>
                        {formatStatus(complaint.status)}
                      </Badge>
                      {isHandler && (
                        <Badge className={`font-medium px-1.5 py-0.5 sm:px-3 sm:py-1 text-xs flex items-center gap-0.5 sm:gap-1 whitespace-nowrap ${getSeverityColor(complaint.severity)}`}>
                          <Shield className="h-3 w-3" />
                          <span className="hidden sm:inline">{complaint.severity}</span>
                          <span className="sm:hidden">{complaint.severity.charAt(0).toUpperCase()}</span>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
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