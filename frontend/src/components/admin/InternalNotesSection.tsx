/**
 * Internal Notes Section
 * Private notes/comments for Admin and CODI members only
 * NOT visible to complainants
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { CaseNoteService } from '../../services/caseNoteService';
import { CaseActivityService } from '../../services/caseActivityService';
import { toActivityActorRole } from '../../types/caseActivity';
import type { CaseNote } from '../../types/caseNote';
import { Lock, Send, MessageSquare, User, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InternalNotesSectionProps {
  caseId: string;
  caseTitle: string;
  assignedToId?: string;
  assignedToRole?: 'admin' | 'handler';
  highlightNoteId?: string;
  onNotePosted?: () => void;
}

export function InternalNotesSection({
  caseId,
  caseTitle,
  assignedToId,
  assignedToRole,
  highlightNoteId,
  onNotePosted
}: InternalNotesSectionProps) {
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const { currentUser } = useAuth();
  const { role, representativeData, loading: roleLoading } = useRepresentativeRole();
  const { toast } = useToast();

  const handleAutoRegister = async () => {
    if (!currentUser) return;

    try {
      setRegistering(true);
      
      const RepServiceModule = await import('../../services/representativeService');
      const RepService = RepServiceModule.default;
      
      await RepService.autoRegisterAsAdmin(
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || undefined
      );

      toast({
        title: 'Registration Successful',
        description: 'You have been registered as an admin. Please refresh the page.',
      });

      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error auto-registering:', error);
      toast({
        title: 'Registration Failed',
        description: 'Could not register you as admin. Please contact system administrator.',
        variant: 'destructive'
      });
    } finally {
      setRegistering(false);
    }
  };

  // Load notes on mount and subscribe to real-time updates
  useEffect(() => {
    if (!caseId) return;

    setLoading(true);
    const unsubscribe = CaseNoteService.subscribeToNotes(caseId, (updatedNotes) => {
      setNotes(updatedNotes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [caseId]);

  // Auto-scroll to and highlight specific note from notification
  useEffect(() => {
    if (highlightNoteId && notes.length > 0) {
      const noteElement = document.getElementById(`note-${highlightNoteId}`);
      if (noteElement) {
        console.log('📍 Scrolling to note:', highlightNoteId);
        
        // Wait for dialog to fully render
        setTimeout(() => {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add highlight effect with inline styles
          noteElement.style.transition = 'all 0.3s ease-in-out';
          noteElement.style.backgroundColor = 'rgba(26, 122, 69, 0.15)';
          noteElement.style.boxShadow = '0 0 20px 8px rgba(26, 122, 69, 0.3)';
          noteElement.style.border = '2px solid #1D9E75';
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            noteElement.style.backgroundColor = '';
            noteElement.style.boxShadow = '';
            noteElement.style.border = '';
          }, 3000);
        }, 500);
      }
    }
  }, [highlightNoteId, notes]);

  const handleSubmitNote = async () => {
    if (!newNote.trim()) {
      toast({
        title: 'Empty Note',
        description: 'Please enter a note before submitting',
        variant: 'destructive'
      });
      return;
    }

    console.log('🔍 InternalNotes Debug:', {
      currentUser: currentUser?.email,
      role: role,
      representativeData: representativeData
    });

    if (!currentUser) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to post notes',
        variant: 'destructive'
      });
      return;
    }

    if (!role) {
      toast({
        title: 'Permission Denied',
        description: 'Only Admin and CODI members can post internal notes. You need to be registered in the representatives collection. Current user: ' + (currentUser.email || 'Unknown'),
        variant: 'destructive',
        duration: 10000
      });
      console.error('❌ User not in representatives collection. Add this user to Firestore > representatives collection with role: "admin" or "handler"');
      return;
    }

    try {
      setSubmitting(true);

      const noteMessage = newNote.trim();
      const noteData = {
        caseId,
        userId: currentUser.uid,
        userName: representativeData?.displayName || currentUser.displayName || currentUser.email || 'Unknown',
        userRole: role as 'admin' | 'handler',
        userEmail: currentUser.email || '',
        message: noteMessage
      };

      const noteId = await CaseNoteService.createNote(noteData);

      // Mirror the note into the Activity timeline (internal-only)
      try {
        await CaseActivityService.logInternalNote(
          caseId,
          noteMessage,
          currentUser.uid,
          noteData.userName,
          toActivityActorRole(role),
          noteId
        );
      } catch (activityError) {
        console.warn('⚠️ Note saved but activity log failed:', activityError);
      }

      if (role === 'admin' && assignedToId && assignedToRole) {
        // Admin posting -> notify assigned CODI member
        try {
          const RepServiceModule = await import('../../services/representativeService');
          const RepService = RepServiceModule.default;
          const handler = await RepService.getById(assignedToId);
          
          if (!handler || !handler.userId) {
            console.error('❌ CODI member not found or missing userId:', assignedToId);
            throw new Error('CODI member userId not found');
          }
          
          const { NotificationService } = await import('../../services/notificationService');
          
          await NotificationService.createNotification(
            handler.userId,
            'new_comment',
            'New Internal Note from Admin',
            `${noteData.userName} posted a note on case "${caseTitle}": ${noteMessage.substring(0, 100)}${noteMessage.length > 100 ? '...' : ''}`,
            {
              priority: 'normal',
              actionUrl: `/admin/reports?reportId=${caseId}&noteId=${noteId}`,
              data: {
                caseId,
                caseTitle,
                noteId,
                noteAuthor: noteData.userName,
                notePreview: noteMessage.substring(0, 200),
                isInternalNote: true
              }
            }
          );
        } catch (notifError) {
          console.error('❌ Failed to notify CODI member:', notifError);
        }
      } else if (role === 'handler' || role === 'codi') {
        // CODI member posting -> notify ALL admins
        try {
          const RepServiceModule = await import('../../services/representativeService');
          const RepService = RepServiceModule.default;
          const admins = await RepService.getAllAdmins();
          const { NotificationService } = await import('../../services/notificationService');
          
          for (const admin of admins) {
            if (admin.userId) {
              await NotificationService.createNotification(
                admin.userId,
                'new_comment',
                'New Internal Note from CODI Member',
                `${noteData.userName} posted a note on case "${caseTitle}": ${noteMessage.substring(0, 100)}${noteMessage.length > 100 ? '...' : ''}`,
                {
                  priority: 'normal',
                  actionUrl: `/admin/reports?reportId=${caseId}&noteId=${noteId}`,
                  data: {
                    caseId,
                    caseTitle,
                    noteId,
                    noteAuthor: noteData.userName,
                    notePreview: noteMessage.substring(0, 200),
                    isInternalNote: true
                  }
                }
              );
            }
          }
        } catch (notifError) {
          console.error('Failed to notify admins:', notifError);
        }
      }

      setNewNote('');
      toast({
        title: 'Note Posted',
        description: 'Your internal note has been added to the case and Activity feed'
      });
      
      // Refresh reports to update notesCount
      if (onNotePosted) {
        onNotePosted();
      }
    } catch (error) {
      console.error('Error posting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to post note. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (noteRole: 'admin' | 'handler') => {
    return noteRole === 'admin' 
      ? 'bg-purple-100 text-purple-800 border-purple-300'
      : 'bg-orange-100 text-orange-800 border-orange-300';
  };

  const getNoteCardColor = (noteRole: 'admin' | 'handler') => {
    return noteRole === 'admin'
      ? 'border-l-4 border-l-purple-500 bg-purple-50/30'
      : 'border-l-4 border-l-orange-500 bg-orange-50/30';
  };

  if (loading) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D9E75]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="border-2 border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-800 rounded-lg">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-900">Internal Notes</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Private communication between Admin and CODI member • Not visible to complainant
            </p>
          </div>
          <Badge variant="outline" className="bg-gray-100 border-gray-300">
            <MessageSquare className="h-3 w-3 mr-1" />
            {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Notes List */}
        {notes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No Internal Notes Yet</h3>
            <p className="text-sm text-gray-500">
              Start the conversation by adding the first note below
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {notes.map((note) => (
              <div
                key={note.id}
                id={`note-${note.id}`}
                className={`p-4 rounded-lg border ${getNoteCardColor(note.userRole)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                    note.userRole === 'admin' ? 'bg-purple-600' : 'bg-orange-600'
                  }`}>
                    {getInitials(note.userName)}
                  </div>

                  {/* Note Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{note.userName}</span>
                      <Badge className={`text-xs ${getRoleBadgeColor(note.userRole)}`}>
                        {note.userRole === 'admin' ? 'Admin' : 'CODI member'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {note.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Note Form */}
        <div className="border-t-2 border-gray-200 pt-6">
          {/* Show register button if user is not registered - only after loading completes */}
          {!roleLoading && !role && currentUser && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <div className="flex items-start gap-3">
                <UserPlus className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-1">Admin Registration Required</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    You're logged in as <strong>{currentUser.email}</strong> but not registered in the system as an admin or handler.
                  </p>
                  <Button
                    onClick={handleAutoRegister}
                    disabled={registering}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {registering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Register as Admin
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {role && (
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Posting as: {representativeData?.displayName || currentUser?.displayName || 'You'}
                </span>
                <Badge className={`text-xs ${getRoleBadgeColor(role as 'admin' | 'handler')}`}>
                  {role === 'admin' ? 'Admin' : 'CODI member'}
                </Badge>
              </div>
            )}

            <Textarea
              placeholder="Type your internal note here... (visible only to Admin and CODI members)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
              className="resize-none border-2 border-gray-300 focus:border-[#1D9E75] focus:ring-[#1D9E75]"
              disabled={submitting}
            />

            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                <Lock className="h-3 w-3 inline mr-1" />
                This note will only be visible to Admin and CODI members
              </p>
              <Button
                onClick={handleSubmitNote}
                disabled={submitting || !newNote.trim()}
                className="bg-[#1D9E75] hover:bg-[#178F65] text-white"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post Note
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
