/**
 * ReportStatusManager Component
 * 
 * Ready-to-use UI component for managing report status transitions
 * with strict step-by-step validation
 * 
 * Features:
 * - Shows current status badge
 * - Displays only valid next status buttons
 * - Confirmation dialog with notes
 * - Auto-disables during updates
 * - Server-side validation via Firebase Function
 */

import React, { useState } from 'react';
import { useReportStatus, ReportStatus } from '@/hooks/useReportStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Clock, XCircle, Upload } from 'lucide-react';
import { StatusNoteSuggestionsSelect } from '@/components/case/StatusNoteSuggestionsSelect';
import {
  getClosureActionSuggestions,
  getClosureDecisionSuggestions,
  getStatusNoteSuggestions,
} from '@/utils/statusNoteSuggestions';

interface ReportStatusManagerProps {
  reportId: string;
  currentStatus: ReportStatus;
  collectionName?: 'reports' | 'complaints';
  onStatusUpdated?: () => void;
  showLabel?: boolean;
  variant?: 'full' | 'compact' | 'buttons-only';
  caseTitle?: string; // For displaying in closure form
}

export function ReportStatusManager({
  reportId,
  currentStatus,
  collectionName = 'reports',
  onStatusUpdated,
  showLabel = true,
  variant = 'full',
  caseTitle
}: ReportStatusManagerProps) {
  const {
    isUpdating,
    updateStatus,
    getStatusLabel,
    getStatusColor,
    getTransitionButtons,
    isFinalStatus
  } = useReportStatus(reportId, currentStatus, collectionName, onStatusUpdated);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | null>(null);
  const [notes, setNotes] = useState('');
  
  // Closure form fields
  const [decisionSummary, setDecisionSummary] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [closureDocument, setClosureDocument] = useState<File | null>(null);
  const [finalNotes, setFinalNotes] = useState('');

  const transitionButtons = getTransitionButtons();
  const notesRequired =
    selectedStatus === 'resolved' || selectedStatus === 'inProgress';
  const notesMissing = notesRequired && !notes.trim();
  const statusNoteSuggestions = getStatusNoteSuggestions(selectedStatus);

  const handleStatusClick = (status: ReportStatus) => {
    setSelectedStatus(status);
    setShowConfirmDialog(true);
  };

  const resetDialogState = () => {
    setSelectedStatus(null);
    setNotes('');
    setDecisionSummary('');
    setActionTaken('');
    setClosureDocument(null);
    setFinalNotes('');
  };

  const handleConfirmUpdate = async () => {
    if (!selectedStatus) return;

    if (selectedStatus === 'closed') {
      if (!decisionSummary.trim() || !actionTaken.trim()) return;
    }

    if (selectedStatus === 'inProgress' && !notes.trim()) return;
    if (selectedStatus === 'resolved' && !notes.trim()) return;

    const success = await updateStatus(
      selectedStatus,
      selectedStatus === 'closed'
        ? [
            `Decision: ${decisionSummary.trim()}`,
            `Actions: ${actionTaken.trim()}`,
            finalNotes.trim() ? `Notes: ${finalNotes.trim()}` : '',
          ]
            .filter(Boolean)
            .join('\n\n')
        : notes || undefined,
      undefined,
      selectedStatus === 'closed'
        ? {
            decisionSummary: decisionSummary.trim(),
            actionTaken: actionTaken.trim(),
            closureDocument,
            finalNotes: finalNotes.trim() || undefined,
          }
        : undefined
    );
    
    if (success) {
      setShowConfirmDialog(false);
      resetDialogState();
    }
  };

  const handleCancelUpdate = () => {
    setShowConfirmDialog(false);
    resetDialogState();
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'inProgress':
        return <AlertCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getNotesLabel = () => {
    if (selectedStatus === 'resolved') {
      return 'Resolution Details & Investigation Summary *';
    }
    if (selectedStatus === 'inProgress') {
      return 'Investigation Notes *';
    }
    return 'Notes (Optional)';
  };

  const getNotesPlaceholder = () => {
    if (selectedStatus === 'resolved') {
      return 'Describe the investigation conducted and resolution actions taken...';
    }
    if (selectedStatus === 'inProgress') {
      return 'Describe the investigation steps being taken and why this case is moving to ongoing investigation...';
    }
    return 'Add any notes about this status change...';
  };

  const getActionLabel = (status: ReportStatus) => {
    switch (status) {
      case 'inProgress':
        return 'Start Investigation';
      case 'resolved':
        return 'Mark as Resolved';
      case 'dismissed':
        return 'Dismiss Case';
      case 'closed':
        return 'Close Case';
      default:
        return `Move to ${getStatusLabel(status)}`;
    }
  };

  const getActionButtonClass = (status: ReportStatus) => {
    const base =
      'h-8 gap-1.5 rounded-full px-3.5 text-xs font-medium shadow-none transition-colors sm:text-sm [&_svg]:h-3.5 [&_svg]:w-3.5';

    switch (status) {
      case 'inProgress':
        return `${base} border border-[#1D9E75] bg-white text-[#178F65] hover:bg-emerald-50 hover:text-[#146b50] [&_svg]:text-[#1D9E75]`;
      case 'resolved':
        return `${base} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`;
      case 'dismissed':
        return `${base} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
      case 'closed':
        return `${base} border border-gray-300 bg-gray-900 text-white hover:bg-gray-800 [&_svg]:text-white`;
      default:
        return `${base} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`;
    }
  };

  const renderTransitionButtons = (options?: {
    size?: 'sm' | 'default';
    variant?: 'outline' | 'ghost' | 'default';
    showFullLabel?: boolean;
  }) => {
    const size = options?.size ?? 'sm';
    const buttonVariant = options?.variant;
    const showFullLabel = options?.showFullLabel ?? true;

    if (transitionButtons.length === 0) {
      return (
        <Badge variant="secondary">
          Final Status - No Actions Available
        </Badge>
      );
    }

    return transitionButtons.map((btn) => (
      <Button
        key={btn.status}
        onClick={() => handleStatusClick(btn.status)}
        disabled={isUpdating}
        variant={buttonVariant ?? 'ghost'}
        size={size}
        className={
          showFullLabel
            ? getActionButtonClass(btn.status)
            : 'h-8 gap-1 px-2.5 text-xs shadow-none'
        }
      >
        {getStatusIcon(btn.status)}
        <span>{showFullLabel ? getActionLabel(btn.status) : `→ ${btn.label}`}</span>
      </Button>
    ));
  };

  const renderConfirmDialog = () => (
    <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Status Update</DialogTitle>
          <DialogDescription>
            Change report status from <strong>{getStatusLabel(currentStatus)}</strong> to{' '}
            <strong>{selectedStatus && getStatusLabel(selectedStatus)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {selectedStatus === 'closed' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="decision-summary" className="font-semibold">
                  Decision Summary * <span className="text-red-500">(Required)</span>
                </Label>
                <StatusNoteSuggestionsSelect
                  id="decision-summary-suggestions"
                  suggestions={getClosureDecisionSuggestions()}
                  value={decisionSummary}
                  onSelect={setDecisionSummary}
                  label="Quick suggestions for decision summary (optional)"
                />
                <Textarea
                  id="decision-summary"
                  placeholder="Summarize the final decision made on this case..."
                  value={decisionSummary}
                  onChange={(e) => setDecisionSummary(e.target.value)}
                  rows={3}
                  className={!decisionSummary.trim() ? 'border-red-400' : ''}
                />
                {!decisionSummary.trim() && (
                  <p className="text-xs text-red-600 font-medium">
                    Required: Please provide a summary of the decision.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="action-taken" className="font-semibold">
                  Action Taken * <span className="text-red-500">(Required)</span>
                </Label>
                <StatusNoteSuggestionsSelect
                  id="action-taken-suggestions"
                  suggestions={getClosureActionSuggestions()}
                  value={actionTaken}
                  onSelect={setActionTaken}
                  label="Quick suggestions for action taken (optional)"
                />
                <Textarea
                  id="action-taken"
                  placeholder="Describe the actions taken as a result of this decision..."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  rows={3}
                  className={!actionTaken.trim() ? 'border-red-400' : ''}
                />
                {!actionTaken.trim() && (
                  <p className="text-xs text-red-600 font-medium">
                    Required: Please describe the actions taken.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="final-notes">Final Notes (Optional)</Label>
                <Textarea
                  id="final-notes"
                  placeholder="Any additional notes about the case closure..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="closure-document">Closure Document (Optional)</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="closure-document"
                    type="file"
                    onChange={(e) => setClosureDocument(e.target.files?.[0] || null)}
                    disabled={isUpdating}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="closure-document"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    <Upload className="h-4 w-4 text-emerald-700" />
                    <span className="text-sm text-emerald-700">Choose closure document</span>
                  </label>
                  {closureDocument && (
                    <span className="text-sm text-gray-600 flex-1 truncate">
                      {closureDocument.name}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-semibold">
                {getNotesLabel()}
              </Label>
              {statusNoteSuggestions.length > 0 && (
                <StatusNoteSuggestionsSelect
                  id="status-notes-suggestions"
                  suggestions={statusNoteSuggestions}
                  value={notes}
                  onSelect={setNotes}
                />
              )}
              <Textarea
                id="notes"
                placeholder={getNotesPlaceholder()}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={selectedStatus === 'resolved' ? 5 : 4}
                className={notesMissing ? 'border-amber-400' : ''}
              />
              {selectedStatus === 'inProgress' && (
                <p className="text-xs text-amber-600 font-medium">
                  Required: Document why this case is moving to ongoing investigation.
                </p>
              )}
              {selectedStatus === 'resolved' && (
                <p className="text-xs text-amber-600 font-medium">
                  Required: Please provide investigation summary and resolution details for transparency.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelUpdate} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpdate}
            disabled={
              isUpdating ||
              notesMissing ||
              (selectedStatus === 'closed' && (!decisionSummary.trim() || !actionTaken.trim()))
            }
          >
            {isUpdating ? 'Updating...' : 'Confirm Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (variant === 'buttons-only') {
    return (
      <>
        <div className="flex gap-2">{renderTransitionButtons({ size: 'sm', showFullLabel: false })}</div>
        {renderConfirmDialog()}
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(currentStatus)}>
            {getStatusIcon(currentStatus)}
            <span className="ml-1">{getStatusLabel(currentStatus)}</span>
          </Badge>

          {transitionButtons.length > 0 && (
            <div className="flex gap-2">
              {renderTransitionButtons({ size: 'sm', variant: 'ghost', showFullLabel: false })}
            </div>
          )}
        </div>
        {renderConfirmDialog()}
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/20 p-4 space-y-3">
        {showLabel && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Report Status</h3>
            {isFinalStatus() && (
              <Badge variant="secondary" className="text-xs">
                Final Status
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Current</span>
          <Badge className={getStatusColor(currentStatus)}>
            {getStatusIcon(currentStatus)}
            <span className="ml-1">{getStatusLabel(currentStatus)}</span>
          </Badge>
        </div>

        {transitionButtons.length > 0 && (
          <div className="space-y-2 border-t border-emerald-100/80 pt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Available actions
            </span>
            <div className="flex flex-wrap gap-2">
              {renderTransitionButtons()}
            </div>
          </div>
        )}

        {isFinalStatus() && (
          <p className="text-xs text-gray-500 italic">
            This report has reached its final status and cannot be changed further.
          </p>
        )}
      </div>
      {renderConfirmDialog()}
    </>
  );
}
