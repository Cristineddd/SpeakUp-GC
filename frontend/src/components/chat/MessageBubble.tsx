import { format } from 'date-fns';
import { 
  Check, 
  CheckCheck, 
  Download,
  FileText,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { Message } from '../../types/message';
import { formatFileSize, getFileIcon } from '../../types/message';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  isGroupChat?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  showSenderName = true,
  isGroupChat = false,
}: MessageBubbleProps) {
  
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
      return <Check className="h-3 w-3 text-gray-400 animate-pulse" />;
    }
    if (message.status === 'read') {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    if (message.status === 'delivered' || message.status === 'sent') {
      return <CheckCheck className="h-3 w-3 text-gray-400" />;
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
      <div className="flex justify-center my-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-700 text-xs font-medium px-5 py-2 rounded-full max-w-md text-center border border-blue-100 shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
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
            px-4 py-3 rounded-2xl shadow-md transition-all duration-300 hover:shadow-lg
            ${isOwn
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
              : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
            }
            ${message.status === 'failed' ? 'opacity-60 border-2 border-red-300' : ''}
          `}
        >
          {/* Text content */}
          {message.content && (
            <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${isOwn ? 'text-white' : 'text-gray-800'}`}>
              {message.content}
            </p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment) => {
                // Display images as full-size embedded images
                if (attachment.type.startsWith('image/')) {
                  return (
                    <div key={attachment.id} className="relative rounded-xl overflow-hidden max-w-xs">
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    </div>
                  );
                }

                // Display non-image files with download button
                return (
                  <div
                    key={attachment.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]
                      ${isOwn ? 'bg-blue-600/40 backdrop-blur-sm' : 'bg-gray-50 border border-gray-200'}
                    `}
                  >
                    {/* File icon */}
                    <div className={`
                      w-12 h-12 flex items-center justify-center rounded-lg shadow-sm
                      ${isOwn ? 'bg-blue-700/50' : 'bg-blue-50'}
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
                        ${isOwn ? 'text-blue-100' : 'text-gray-500'}
                      `}>
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>

                    {/* Download button */}
                    <a
                      href={attachment.url}
                      download={attachment.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        p-2 rounded-lg transition-colors
                        ${isOwn ? 'hover:bg-blue-700/50' : 'hover:bg-gray-200'}
                      `}
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

          {/* Timestamp with status icon */}
          <div className={`
            flex items-center gap-1.5 mt-2
            ${isOwn ? 'justify-end' : 'justify-start'}
          `}>
            <span className={`
              text-xs font-medium
              ${isOwn ? 'text-blue-100' : 'text-gray-500'}
            `}>
              {formatTime(message.createdAt)}
            </span>
            {isOwn && getStatusIcon()}
          </div>
        </div>

        {/* Failed message retry option */}
        {message.status === 'failed' && isOwn && (
          <div className="text-xs text-red-600 mt-1 ml-2 font-medium">
            Failed to send. <button className="underline hover:text-red-700">Retry</button>
          </div>
        )}
      </div>
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
    <div className="flex justify-start mb-4 animate-fadeIn">
      <div className="max-w-[70%] items-start flex flex-col">
        <div className="px-5 py-3 rounded-2xl rounded-bl-md bg-white border border-gray-100 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-600 font-medium">{displayText}</span>
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
    <div className="flex items-center justify-center my-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-500 rounded-full shadow-sm border border-gray-200">
            {formatDate(date)}
          </span>
        </div>
      </div>
    </div>
  );
}
