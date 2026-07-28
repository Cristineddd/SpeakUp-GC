import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, ExternalLink, Image as ImageIcon, X } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  fileName = 'image',
}: ImagePreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[95vh] max-w-5xl flex-col overflow-hidden p-0 bg-white"
        style={{ height: '95vh' }}
      >
        <div className="flex h-full min-h-0 w-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b bg-white p-4">
            <div className="flex min-w-0 items-center gap-2">
              <ImageIcon className="h-5 w-5 shrink-0 text-emerald-600" />
              <DialogTitle className="truncate pr-4 text-lg font-semibold">{fileName}</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">Image preview for {fileName}</DialogDescription>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gray-950/95 p-4">
            <img
              src={imageUrl}
              alt={fileName}
              className="h-auto w-auto max-h-full max-w-full object-contain"
            />
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t bg-gray-50 p-4">
            <Button variant="outline" size="sm" asChild>
              <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={imageUrl} download={fileName}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
