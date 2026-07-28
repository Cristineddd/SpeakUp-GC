import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alias: string;
  reportCount: number;
  onConfirmDelete: () => void | Promise<void>;
}

export function DeleteUserModal({
  open,
  onOpenChange,
  alias,
  reportCount,
  onConfirmDelete
}: DeleteUserModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset input when modal opens/closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const isMatch = inputValue === alias;
  const showHint = inputValue.length > 0;

  const handleDelete = async () => {
    if (!isMatch) return;
    
    try {
      setIsDeleting(true);
      await onConfirmDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setInputValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Trash icon in red square */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Delete user
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning banner */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-800">
              Deleting <span className="font-semibold break-all">{alias}</span> will permanently remove their account and all{' '}
              <span className="font-semibold">{reportCount}</span> associated report{reportCount !== 1 ? 's' : ''}. 
              This cannot be recovered.
            </AlertDescription>
          </Alert>

          {/* Confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-alias" className="text-sm font-medium text-gray-700">
              Type <span className="font-mono font-semibold text-gray-900 break-all">{alias}</span> to confirm
            </Label>
            <Input
              id="confirm-alias"
              type="text"
              placeholder="Type alias here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={`font-mono ${
                showHint
                  ? isMatch
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : 'border-red-300 focus-visible:ring-red-500'
                  : ''
              }`}
              autoComplete="off"
              autoFocus
            />
            
            {/* Inline hint */}
            {showHint && (
              <div className="flex items-center gap-1.5 text-sm">
                {isMatch ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">✓ Alias confirmed</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Alias does not match</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
            className="border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            className={`${
              isMatch
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-200 text-red-400 cursor-not-allowed hover:bg-red-200'
            }`}
          >
            {isDeleting ? 'Deleting...' : 'Delete user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
