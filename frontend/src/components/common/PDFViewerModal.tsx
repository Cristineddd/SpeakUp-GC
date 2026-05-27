/**
 * PDFViewerModal Component
 * Reusable modal for viewing PDF files
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { X, Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName?: string;
}

export function PDFViewerModal({ isOpen, onClose, pdfUrl, fileName = 'document.pdf' }: PDFViewerModalProps) {
  const [loadError, setLoadError] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 bg-white" style={{ height: '95vh' }}>
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-semibold truncate pr-4">{fileName}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            PDF document viewer for {fileName}
          </DialogDescription>

          {/* PDF Viewer or Error Message */}
          <div className="flex-1 overflow-hidden bg-gray-100 relative flex items-center justify-center">
            {loadError ? (
              <div className="flex flex-col items-center gap-4 p-8 text-center max-w-md">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Preview PDF</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This PDF cannot be displayed in the browser. Please download it or open in a new tab to view.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                  >
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={pdfUrl} download={fileName}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <object
                data={pdfUrl}
                type="application/pdf"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  border: 'none'
                }}
                onError={() => setLoadError(true)}
              >
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Preview Not Available</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Your browser doesn't support inline PDF viewing. Please download or open in a new tab.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                    >
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={pdfUrl} download={fileName}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </object>
            )}
          </div>

          {/* Footer Actions */}
          {!loadError && (
            <div className="flex gap-2 p-4 border-t bg-gray-50 justify-end">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={pdfUrl} download={fileName}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
