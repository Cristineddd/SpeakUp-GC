/**
 * EscalationControls Component
 * Manual escalation/de-escalation controls with dialog
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { EscalationService } from '../../services/escalationService';
import { useAuth } from '../../contexts/AuthContext';
import type { EscalationLevel, EscalationData } from '../../types/escalation';
import { 
  ESCALATION_LABELS, 
  ESCALATION_REASONS 
} from '../../types/escalation';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle 
} from 'lucide-react';

interface EscalationControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaint: {
    id: string;
    title: string;
    category: string;
    reportedAt: string | Date;
    escalationLevel?: EscalationLevel;
    escalationHistory?: any[];
  };
  onEscalated?: () => void;
}

export function EscalationControls({
  open,
  onOpenChange,
  complaint,
  onEscalated,
}: EscalationControlsProps) {
  const currentLevel = complaint.escalationLevel || 0;
  const [newLevel, setNewLevel] = useState<EscalationLevel>(currentLevel);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const isEscalating = newLevel > currentLevel;
  const isDeEscalating = newLevel < currentLevel;
  const noChange = newLevel === currentLevel;

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in',
        variant: 'destructive',
      });
      return;
    }

    if (!reason) {
      toast({
        title: 'Reason Required',
        description: 'Please select a reason for escalation',
        variant: 'destructive',
      });
      return;
    }

    if (noChange) {
      toast({
        title: 'No Change',
        description: 'Please select a different escalation level',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const reportedAt = complaint.reportedAt instanceof Date
        ? complaint.reportedAt
        : new Date(complaint.reportedAt);

      const currentEscalationData: Partial<EscalationData> = {
        escalationLevel: currentLevel,
        escalationHistory: complaint.escalationHistory || [],
      };

      if (isEscalating) {
        // Manual escalation
        await EscalationService.manualEscalate(
          complaint.id,
          newLevel,
          reason,
          notes,
          currentUser.uid,
          currentUser.email || 'Admin',
          reportedAt,
          complaint.category,
          currentEscalationData
        );

        toast({
          title: 'Case Escalated',
          description: `Escalated to ${ESCALATION_LABELS[newLevel]} level`,
        });
      } else {
        // De-escalation
        await EscalationService.deEscalate(
          complaint.id,
          newLevel,
          reason,
          notes,
          currentUser.uid,
          currentUser.email || 'Admin',
          currentEscalationData
        );

        toast({
          title: 'Case De-escalated',
          description: `De-escalated to ${ESCALATION_LABELS[newLevel]} level`,
        });
      }

      // Reset form
      setReason('');
      setNotes('');
      setNewLevel(currentLevel);

      // Callback
      if (onEscalated) {
        onEscalated();
      }

      onOpenChange(false);

    } catch (error) {
      console.error('Error escalating case:', error);
      toast({
        title: 'Escalation Failed',
        description: 'Failed to update escalation level. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Escalation Controls
          </DialogTitle>
          <DialogDescription>
            Manually adjust the escalation level for this case
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Case Info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="font-semibold text-sm">{complaint.title}</p>
            <p className="text-xs text-muted-foreground">
              Current Level: <span className="font-semibold">{ESCALATION_LABELS[currentLevel]}</span>
            </p>
          </div>

          {/* New Escalation Level */}
          <div className="space-y-2">
            <Label htmlFor="escalation-level">New Escalation Level</Label>
            <Select
              value={newLevel.toString()}
              onValueChange={(value) => setNewLevel(parseInt(value) as EscalationLevel)}
            >
              <SelectTrigger id="escalation-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span>{ESCALATION_LABELS[0]} - Normal</span>
                  </div>
                </SelectItem>
                <SelectItem value="1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <span>{ESCALATION_LABELS[1]} - Needs Attention</span>
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                    <span>{ESCALATION_LABELS[2]} - High Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <span>{ESCALATION_LABELS[3]} - Immediate Action</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Change indicator */}
            {!noChange && (
              <div className={`flex items-center gap-2 text-sm ${
                isEscalating ? 'text-orange-600' : 'text-green-600'
              }`}>
                {isEscalating ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>Escalating from {ESCALATION_LABELS[currentLevel]} to {ESCALATION_LABELS[newLevel]}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    <span>De-escalating from {ESCALATION_LABELS[currentLevel]} to {ESCALATION_LABELS[newLevel]}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {ESCALATION_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning for de-escalation */}
          {isDeEscalating && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ De-escalating this case will lower its priority. Make sure this is appropriate.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || noChange}
            variant={isEscalating ? 'destructive' : 'default'}
          >
            {loading ? 'Processing...' : isEscalating ? 'Escalate' : 'De-escalate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
