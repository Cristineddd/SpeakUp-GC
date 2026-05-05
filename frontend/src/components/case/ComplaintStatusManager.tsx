import React, { useState } from 'react';
import { useComplaintStatus, ComplaintStatus } from '../../hooks/useComplaintStatus';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertTriangle, CheckCircle, Clock, FileText, XCircle } from 'lucide-react';

interface ComplaintStatusManagerProps {
  complaintId: string;
  currentStatus: ComplaintStatus;
  onStatusUpdated?: () => void;
}

export const ComplaintStatusManager: React.FC<ComplaintStatusManagerProps> = ({
  complaintId,
  currentStatus,
  onStatusUpdated
}) => {
  const {
    isUpdating,
    updateStatus,
    isFinalStatus,
    getTransitionButtons,
    STATUS_LABELS,
    STATUS_COLORS
  } = useComplaintStatus();

  const [showDialog, setShowDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [assignedHandler, setAssignedHandler] = useState('');
  const [assignedHandlerName, setAssignedHandlerName] = useState('');

  // Mock handlers list - replace with actual data from your system
  const availableHandlers = [
    { id: 'handler1', name: 'John Doe' },
    { id: 'handler2', name: 'Jane Smith' },
    { id: 'handler3', name: 'Mike Johnson' }
  ];

  const handleStatusClick = (status: ComplaintStatus) => {
    setSelectedStatus(status);
    setNotes('');
    setAssignedHandler('');
    setAssignedHandlerName('');
    setShowDialog(true);
  };

  const handleConfirmTransition = async () => {
    if (!selectedStatus) return;

    const result = await updateStatus({
      complaintId,
      newStatus: selectedStatus,
      notes: notes || undefined,
      assignedTo: selectedStatus === 'assigned' ? assignedHandler : undefined,
      assignedToName: selectedStatus === 'assigned' ? assignedHandlerName : undefined
    });

    if (result?.success) {
      setShowDialog(false);
      setSelectedStatus(null);
      setNotes('');
      setAssignedHandler('');
      setAssignedHandlerName('');
      
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    }
  };

  const getStatusIcon = (status: ComplaintStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'assigned':
        return <FileText className="h-4 w-4" />;
      case 'ongoing':
        return <AlertTriangle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const transitionButtons = getTransitionButtons(currentStatus);
  const isStatusFinal = isFinalStatus(currentStatus);

  return (
    <div className="space-y-4">
      {/* Current Status Display */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Current Status:</span>
        <Badge className={STATUS_COLORS[currentStatus]}>
          <span className="flex items-center gap-2">
            {getStatusIcon(currentStatus)}
            {STATUS_LABELS[currentStatus]}
          </span>
        </Badge>
      </div>

      {/* Status Transition Buttons */}
      {isStatusFinal ? (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            This complaint is in a final state. No further status changes are allowed.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Available Actions:</p>
          <div className="flex flex-wrap gap-2">
            {transitionButtons.length === 0 ? (
              <p className="text-sm text-gray-500">No actions available</p>
            ) : (
              transitionButtons.map((button) => (
                <Button
                  key={button.status}
                  onClick={() => handleStatusClick(button.status)}
                  disabled={isUpdating}
                  variant={button.isDestructive ? 'destructive' : 'default'}
                  className="flex items-center gap-2"
                >
                  {getStatusIcon(button.status)}
                  {button.label}
                </Button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Status Transition Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Status Change
            </DialogTitle>
            <DialogDescription>
              Change complaint status from <strong>{STATUS_LABELS[currentStatus]}</strong> to{' '}
              <strong>{selectedStatus ? STATUS_LABELS[selectedStatus] : ''}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Assignment Selection (only for 'assigned' status) */}
            {selectedStatus === 'assigned' && (
              <div className="space-y-2">
                <Label htmlFor="handler">Assign To Handler *</Label>
                <Select
                  value={assignedHandler}
                  onValueChange={(value) => {
                    setAssignedHandler(value);
                    const handler = availableHandlers.find(h => h.id === value);
                    setAssignedHandlerName(handler?.name || '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a handler" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHandlers.map((handler) => (
                      <SelectItem key={handler.id} value={handler.id}>
                        {handler.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes {selectedStatus === 'dismissed' && '(Required for dismissal)'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  selectedStatus === 'dismissed'
                    ? 'Please provide a reason for dismissing this complaint...'
                    : 'Add optional notes about this status change...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTransition}
              disabled={
                isUpdating ||
                (selectedStatus === 'assigned' && !assignedHandler) ||
                (selectedStatus === 'dismissed' && !notes)
              }
            >
              {isUpdating ? 'Updating...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
