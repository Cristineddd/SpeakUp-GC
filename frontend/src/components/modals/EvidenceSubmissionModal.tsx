import React, { useState } from 'react';
import { X, Upload, File, AlertCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface EvidenceSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (evidence: EvidenceData) => void;
  maxFileSize?: number; // in MB
}

export interface EvidenceData {
  files: File[];
  externalLinks: string[];
  description: string;
}

const MAX_FILE_SIZE_MB = 50;

export const EvidenceSubmissionModal: React.FC<EvidenceSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  maxFileSize = MAX_FILE_SIZE_MB
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [externalLinks, setExternalLinks] = useState<string[]>(['']);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError('');

    // Check file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed ${maxFileSize}MB limit. Please use external links for large files.`);
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addLinkField = () => {
    setExternalLinks(prev => [...prev, '']);
  };

  const updateLink = (index: number, value: string) => {
    setExternalLinks(prev => prev.map((link, i) => i === index ? value : link));
  };

  const removeLink = (index: number) => {
    setExternalLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const validLinks = externalLinks.filter(link => link.trim() !== '');
    
    if (files.length === 0 && validLinks.length === 0) {
      setError('Please provide at least one file or external link as evidence.');
      return;
    }

    onSubmit({
      files,
      externalLinks: validLinks,
      description
    });

    // Reset form
    setFiles([]);
    setExternalLinks(['']);
    setDescription('');
    setError('');
    onClose();
  };

  const getTotalSize = () => {
    return files.reduce((total, file) => total + file.size, 0) / (1024 * 1024);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Submit Evidence</h2>
            <p className="text-sm text-gray-500 mt-1">Upload files or provide external links to evidence</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Why separate evidence submission?</p>
              <p>For files larger than {maxFileSize}MB, use external links (Google Drive, Dropbox, etc.) to avoid upload issues. This ensures your evidence is always accessible.</p>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-900">Upload Files (Max {maxFileSize}MB per file)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#1a7a45] transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="evidence-upload"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              />
              <label
                htmlFor="evidence-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">Click to upload files</p>
                <p className="text-xs text-gray-500">Images, videos, PDFs, documents</p>
              </label>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Uploaded Files ({files.length}) - {getTotalSize().toFixed(2)}MB
                </p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <File className="w-4 h-4 text-[#1a7a45]" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)}MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Links Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-900">External Links (For large files)</Label>
              <button
                onClick={addLinkField}
                className="text-xs font-medium text-[#1a7a45] hover:text-[#155f36] transition-colors"
              >
                + Add Link
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Important:</strong> Make sure your links are set to "Public" or "Anyone with the link can view" before submitting. 
                Private links cannot be accessed by investigators.
              </p>
            </div>

            {externalLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/... or https://dropbox.com/..."
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    className="pl-10"
                  />
                </div>
                {externalLinks.length > 1 && (
                  <button
                    onClick={() => removeLink(index)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-900">Evidence Description (Optional)</Label>
            <Textarea
              placeholder="Briefly describe the evidence you're submitting..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <div className="text-sm text-gray-600">
            {files.length > 0 && (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1a7a45]" />
                {files.length} file{files.length !== 1 ? 's' : ''} ready
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-6 bg-[#1a7a45] hover:bg-[#155f36] text-white"
            >
              Submit Evidence
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
