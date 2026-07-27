import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Check, 
  CheckCheck, 
  Download,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { Message } from '../../types/message';
import { formatFileSize, getFileIcon } from '../../types/message';
import { PDFViewerModal } from '../common/PDFViewerModal';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  isGroupChat?: boolean;
  groupPosition?: 'single' | 'first' | 'middle' | 'last';
}

export function MessageBubble({
  message,
  isOwn,
  showSenderName = true,
  isGroupChat = false,
  groupPosition = 'single',
}: MessageBubbleProps) {
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
  const [selectedPdfName, setSelectedPdfName] = useState('');
  
  const formatTime = (timestamp: any): string => {
    try {
      const date = timestamp?.toDate?.() || new Date(timestamp);
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };

  const getStatusIcon = () => {
    if (message.status === 'failed') {
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
    if (message.status === 'sending') {
      return <Check className="h-3 w-3 text-emerald-200 animate-pulse" />;
    }
    if (message.status === 'read') {
      return <CheckCheck className="h-3 w-3 text-emerald-100" />;
    }
    if (message.status === 'delivered' || message.status === 'sent') {
      return <CheckCheck className="h-3 w-3 text-emerald-100/90" />;
    }
    return null;
  };

  const getSenderColor = () => {
    if (message.senderRole === 'system') return 'text-gray-500';
    if (message.senderRole === 'admin') return 'text-purple-600';
    if (message.senderRole === 'handler') return 'text-blue-600';
    return 'text-gray-700';
  };

  // System message (centered)
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 text-gray-700 text-[11px] font-medium px-4 py-1.5 rounded-full max-w-md text-center border border-green-100 shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Determine spacing based on group position
  const getMarginBottom = () => {
    if (groupPosition === 'last' || groupPosition === 'single') return 'mb-3';
    return 'mb-[2px]'; // 2px gap within group for tighter feel
  };

  // Get border radius based on group position (for own messages on right)
  const getBorderRadius = () => {
    if (!isOwn) return 'rounded-[18px] rounded-bl-md'; // Received messages keep original style
    
    switch (groupPosition) {
      case 'first':
        return 'rounded-[18px] rounded-br-[4px]';
      case 'middle':
        return 'rounded-tl-[18px] rounded-bl-[4px] rounded-tr-[4px] rounded-br-[18px]';
      case 'last':
        return 'rounded-tl-[18px] rounded-bl-[4px] rounded-tr-[18px] rounded-br-[18px]';
      case 'single':
      default:
        return 'rounded-[18px] rounded-br-[4px]';
    }
  };

  // Only show timestamp on last or single message
  const showTimestamp = groupPosition === 'last' || groupPosition === 'single';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${getMarginBottom()} animate-fadeIn`}>
      <div className={`max-w-[88%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name only if needed */}
        {!isOwn && showSenderName && isGroupChat && (
          <div className="text-xs font-semibold mb-1 ml-3 text-gray-600 flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {message.senderName}
          </div>
        )}

        {/* Message bubble with modern design */}
        <div
          className={`
            px-3.5 py-2 transition-all duration-200
            ${getBorderRadius()}
            ${isOwn
              ? 'bg-gradient-to-br from-[#0d7a5c] to-[#1D9E75] text-white shadow-[0_2px_8px_rgba(13,122,92,0.28)]'
              : 'bg-white text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70'
            }
            ${message.status === 'failed' ? 'opacity-60 ring-2 ring-red-300' : ''}
          `}
        >
          {/* Text content */}
          {message.content && (
            <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${isOwn ? 'text-white' : 'text-slate-800'}`}>
              {message.content}
            </p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment) => {
                // Display images as full-size embedded images with preview button
                if (attachment.type.startsWith('image/')) {
                  return (
                    <div key={attachment.id} className="relative rounded-xl overflow-hidden max-w-xs group">
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-auto max-h-96 object-cover"
                      />
                      {/* Preview overlay on hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => {
                            setSelectedPdfUrl(attachment.url);
                            setSelectedPdfName(attachment.name);
                            setPdfViewerOpen(true);
                          }}
                          className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors"
                        >
                          <Eye className="h-5 w-5 text-gray-800" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // Display non-image files with download and preview buttons
                const isPDF = attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');
                const isDocument = attachment.type.includes('document') || 
                                   attachment.type.includes('word') || 
                                   attachment.type.includes('text') ||
                                   attachment.name.toLowerCase().endsWith('.doc') ||
                                   attachment.name.toLowerCase().endsWith('.docx') ||
                                   attachment.name.toLowerCase().endsWith('.txt');
                
                return (
                  <div
                    key={attachment.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]
                      ${isOwn ? 'bg-emerald-700/40 backdrop-blur-sm' : 'bg-gray-50 border border-gray-200'}
                    `}
                  >
                    {/* File icon */}
                    <div className={`
                      w-12 h-12 flex items-center justify-center rounded-lg shadow-sm
                      ${isOwn ? 'bg-emerald-800/50' : 'bg-blue-50'}
                    `}>
                      <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className={`
                        text-sm font-medium truncate
                        ${isOwn ? 'text-white' : 'text-gray-900'}
                      `}>
                        {attachment.name}
                      </p>
                      <p className={`
                        text-xs mt-0.5
                        ${isOwn ? 'text-emerald-100' : 'text-gray-500'}
                      `}>
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>

                    {/* Preview button for PDFs and documents */}
                    {(isPDF || isDocument) && (
                      <button
                        onClick={() => {
                          setSelectedPdfUrl(attachment.url);
                          setSelectedPdfName(attachment.name);
                          setPdfViewerOpen(true);
                        }}
                        className={`
                          p-2 rounded-lg transition-colors
                          ${isOwn ? 'hover:bg-emerald-800/50' : 'hover:bg-gray-200'}
                        `}
                        title="Preview file"
                      >
                        <Eye className={`
                          h-4 w-4
                          ${isOwn ? 'text-white' : 'text-gray-600'}
                        `} />
                      </button>
                    )}

                    {/* Download button */}
                    <a
                      href={attachment.url}
                      download={attachment.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        p-2 rounded-lg transition-colors
                        ${isOwn ? 'hover:bg-emerald-800/50' : 'hover:bg-gray-200'}
                      `}
                      title="Download file"
                    >
                      <Download className={`
                        h-4 w-4
                        ${isOwn ? 'text-white' : 'text-gray-600'}
                      `} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

        </div>
        
        {/* Timestamp below bubble - only for last or single message */}
        {showTimestamp && (
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-slate-400">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && getStatusIcon()}
          </div>
        )}

        {/* Failed message retry option */}
        {message.status === 'failed' && isOwn && (
          <div className="text-xs text-red-600 mt-1 ml-2 font-medium">
            Failed to send. <button className="underline hover:text-red-700">Retry</button>
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && (
        <PDFViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
          pdfUrl={selectedPdfUrl}
          fileName={selectedPdfName}
        />
      )}
    </div>
  );
}

/**
 * Typing Indicator Component
 */
interface TypingIndicatorProps {
  userNames: string[];
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null;

  const displayText =
    userNames.length === 1
      ? `${userNames[0]} is typing`
      : userNames.length === 2
      ? `${userNames[0]} and ${userNames[1]} are typing`
      : `${userNames[0]} and ${userNames.length - 1} others are typing`;

  return (
    <div className="flex justify-start mb-3 animate-fadeIn">
      <div className="max-w-[88%] items-start flex flex-col">
        <div className="px-[14px] py-[10px] rounded-[18px] rounded-bl-md bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[13px] text-gray-600 font-medium">{displayText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Date Separator Component
 */
interface DateSeparatorProps {
  date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  return (
    <div className="flex items-center justify-center my-2.5">
      <span className="rounded-full border border-slate-200/70 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur-sm">
        {formatDate(date)}
      </span>
    </div>
  );
}
