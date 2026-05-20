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
import { AlertCircle, CheckCircle2, Clock, XCircle, Upload, X } from 'lucide-react';

interface ReportStatusManagerProps {
  reportId: string;
  currentStatus: ReportStatus;
  collectionName?: 'reports' | 'complaints';
  onStatusUpdated?: () => void;
  showLabel?: boolean;
  variant?: 'full' | 'compact' | 'buttons-only';
}

export function ReportStatusManager({
  reportId,
  currentStatus,
  collectionName = 'reports',
  onStatusUpdated,
  showLabel = true,
  variant = 'full'
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
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  const transitionButtons = getTransitionButtons();

  const handleStatusClick = (status: ReportStatus) => {
    setSelectedStatus(status);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpdate = async () => {
    if (!selectedStatus) return;

    const success = await updateStatus(
      selectedStatus, 
      notes || undefined,
      attachmentFile || undefined
    );
    
    if (success) {
      setShowConfirmDialog(false);
      setSelectedStatus(null);
      setNotes('');
      setAttachmentFile(null);
      setAttachmentPreview(null);
    }
  };

  const handleCancelUpdate = () => {
    setShowConfirmDialog(false);
    setSelectedStatus(null);
    setNotes('');
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setAttachmentPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
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

  // Buttons-only variant (for inline use)
  if (variant === 'buttons-only') {
    return (
      <>
        <div className="flex gap-2">
          {transitionButtons.length > 0 ? (
            transitionButtons.map((btn) => (
              <Button
                key={btn.status}
                onClick={() => handleStatusClick(btn.status)}
                disabled={isUpdating}
                variant="outline"
                size="sm"
              >
                {getStatusIcon(btn.status)}
                <span className="ml-2">{btn.label}</span>
              </Button>
            ))
          ) : (
            <Badge variant="secondary">
              Final Status - No Actions Available
            </Badge>
          )}
        </div>

        {/* Confirmation Dialog */}
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
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold">
                  {selectedStatus === 'resolved' 
                    ? 'Resolution Details & Investigation Summary *' 
                    : selectedStatus === 'inProgress'
                    ? 'Investigation Notes (Optional)'
                    : 'Notes (Optional)'}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={
                    selectedStatus === 'resolved'
                      ? 'Describe the investigation conducted and resolution actions taken...'
                      : selectedStatus === 'inProgress'
                      ? 'Describe the investigation steps being taken...'
                      : 'Add any notes about this status change...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={selectedStatus === 'resolved' ? 5 : 3}
                  className={selectedStatus === 'resolved' && !notes.trim() ? 'border-amber-400' : ''}
                />
                {selectedStatus === 'resolved' && (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Required: Please provide investigation summary and resolution details for transparency.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment">Attachment (Optional)</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="attachment"
                    type="file"
                    onChange={handleFileSelect}
                    disabled={isUpdating}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="attachment"
                    className="flex items-center gap-2 px-4 py-2 bg-accent/30 border border-dashed border-primary/30 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choose file</span>
                  </label>
                  {attachmentFile && (
                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      {attachmentFile.name}
                    </span>
                  )}
                </div>
                
                {attachmentPreview && (
                  <div className="relative mt-2">
                    <img 
                      src={attachmentPreview} 
                      alt="Preview" 
                      className="max-h-40 rounded border border-border"
                    />
                    <button
                      onClick={handleRemoveAttachment}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelUpdate} disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={handleConfirmUpdate} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Confirm Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Compact variant (status badge + dropdown-style buttons)
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
              {transitionButtons.map((btn) => (
                <Button
                  key={btn.status}
                  onClick={() => handleStatusClick(btn.status)}
                  disabled={isUpdating}
                  variant="ghost"
                  size="sm"
                >
                  → {btn.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Dialog (same as above) */}
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
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold">
                  {selectedStatus === 'resolved' 
                    ? 'Resolution Details & Investigation Summary *' 
                    : selectedStatus === 'inProgress'
                    ? 'Investigation Notes (Optional)'
                    : 'Notes (Optional)'}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={
                    selectedStatus === 'resolved'
                      ? 'Describe the investigation conducted and resolution actions taken...'
                      : selectedStatus === 'inProgress'
                      ? 'Describe the investigation steps being taken...'
                      : 'Add any notes about this status change...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={selectedStatus === 'resolved' ? 5 : 3}
                  className={selectedStatus === 'resolved' && !notes.trim() ? 'border-amber-400' : ''}
                />
                {selectedStatus === 'resolved' && (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Required: Please provide investigation summary and resolution details for transparency.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment-compact">Attachment (Optional)</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="attachment-compact"
                    type="file"
                    onChange={handleFileSelect}
                    disabled={isUpdating}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="attachment-compact"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    <Upload className="h-4 w-4 text-emerald-700" />
                    <span className="text-sm text-emerald-700">Choose file</span>
                  </label>
                  {attachmentFile && (
                    <span className="text-sm text-gray-600 flex-1 truncate">
                      {attachmentFile.name}
                    </span>
                  )}
                </div>
                
                {attachmentPreview && (
                  <div className="relative mt-2">
                    <img 
                      src={attachmentPreview} 
                      alt="Preview" 
                      className="max-h-40 rounded border border-emerald-200"
                    />
                    <button
                      onClick={handleRemoveAttachment}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelUpdate} disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={handleConfirmUpdate} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Confirm Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full variant (default - card-style with all details)
  return (
    <>
      <div className="border rounded-lg p-4 space-y-4">
        {showLabel && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Report Status</h3>
            {isFinalStatus() && (
              <Badge variant="secondary" className="text-xs">
                Final Status
              </Badge>
            )}
          </div>
        )}

        {/* Current Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Current:</span>
          <Badge className={getStatusColor(currentStatus)}>
            {getStatusIcon(currentStatus)}
            <span className="ml-1">{getStatusLabel(currentStatus)}</span>
          </Badge>
        </div>

        {/* Transition Buttons */}
        {transitionButtons.length > 0 && (
          <div className="space-y-3 mt-4">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Available Actions:</span>
            <div className="flex flex-wrap gap-3">
              {transitionButtons.map((btn) => (
                <Button
                  key={btn.status}
                  onClick={() => handleStatusClick(btn.status)}
                  disabled={isUpdating}
                  variant={btn.status === 'inProgress' ? 'default' : 'outline'}
                  size="lg"
                  className={`
                    font-semibold shadow-md transition-all
                    ${btn.status === 'inProgress' 
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-700' 
                      : btn.status === 'resolved'
                      ? 'border-2 border-blue-500 text-blue-700 hover:bg-blue-50'
                      : btn.status === 'dismissed'
                      ? 'border-2 border-red-500 text-red-700 hover:bg-red-50'
                      : 'border-2 border-gray-400 hover:bg-gray-50'
                    }
                  `}
                >
                  {getStatusIcon(btn.status)}
                  <span className="ml-2">Move to {btn.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {isFinalStatus() && (
          <p className="text-sm text-gray-500 italic">
            This report has reached its final status and cannot be changed further.
          </p>
        )}
      </div>

      {/* Confirmation Dialog */}
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
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-semibold">
                {selectedStatus === 'resolved' 
                  ? 'Resolution Details & Investigation Summary *' 
                  : selectedStatus === 'inProgress'
                  ? 'Investigation Notes (Optional)'
                  : 'Notes (Optional)'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  selectedStatus === 'resolved'
                    ? 'Describe the investigation conducted and resolution actions taken...'
                    : selectedStatus === 'inProgress'
                    ? 'Describe the investigation steps being taken...'
                    : 'Add any notes about this status change...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={selectedStatus === 'resolved' ? 5 : 3}
                className={selectedStatus === 'resolved' && !notes.trim() ? 'border-amber-400' : ''}
              />
              {selectedStatus === 'resolved' && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Required: Please provide investigation summary and resolution details for transparency.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment-full">Attachment (Optional)</Label>
              <div className="flex items-center gap-2">
                <input
                  id="attachment-full"
                  type="file"
                  onChange={handleFileSelect}
                  disabled={isUpdating}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="attachment-full"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <Upload className="h-4 w-4 text-emerald-700" />
                  <span className="text-sm text-emerald-700">Choose file</span>
                </label>
                {attachmentFile && (
                  <span className="text-sm text-gray-600 flex-1 truncate">
                    {attachmentFile.name}
                  </span>
                )}
              </div>
              
              {attachmentPreview && (
                <div className="relative mt-2">
                  <img 
                    src={attachmentPreview} 
                    alt="Preview" 
                    className="max-h-40 rounded border border-emerald-200"
                  />
                  <button
                    onClick={handleRemoveAttachment}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelUpdate} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpdate} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Confirm Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
