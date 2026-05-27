import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Send, Paperclip, X, Smile, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { useToast } from '../../hooks/use-toast';
import { MESSAGE_CONSTRAINTS, formatFileSize, getFileIcon } from '../../types/message';
import type { MessageAttachment } from '../../types/message';

// Quick response templates for handlers
const QUICK_RESPONSES = [
  {
    label: 'Initial Greeting',
    message: 'Hello, I am your assigned case handler. I have reviewed your complaint and will be assisting you throughout this process. Please feel free to share any additional information or evidence that may help with the investigation.',
  },
  {
    label: 'Request More Info',
    message: 'Thank you for your patience. To better assist you, could you please provide more details about the incident? Specifically, any additional context, dates, times, or witnesses would be helpful.',
  },
  {
    label: 'Acknowledge Receipt',
    message: 'I have received your message and the information you provided. I will review it carefully and get back to you shortly with next steps.',
  },
  {
    label: 'Schedule Meeting',
    message: 'I would like to schedule a meeting to discuss your case in more detail. Please let me know your available times, and we can arrange a confidential discussion.',
  },
  {
    label: 'Case Update',
    message: 'I wanted to provide you with an update on your case. We are currently in the investigation phase and gathering all necessary information. I will keep you informed of any developments.',
  },
];

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  onFileUpload?: (file: File) => Promise<MessageAttachment>;
  disabled?: boolean;
  placeholder?: string;
  allowAttachments?: boolean;
  maxAttachments?: number;
  showQuickResponses?: boolean; // New prop for handlers
}

export function ChatInput({
  onSendMessage,
  onTyping,
  onFileUpload,
  disabled = false,
  placeholder = 'Type a message...',
  allowAttachments = true,
  maxAttachments = MESSAGE_CONSTRAINTS.MAX_ATTACHMENTS,
  showQuickResponses = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Handle quick response selection
  const handleQuickResponse = (responseMessage: string) => {
    setMessage(responseMessage);
    // Focus textarea after selecting
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  // Handle text input change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Limit message length
    if (value.length <= MESSAGE_CONSTRAINTS.MAX_LENGTH) {
      setMessage(value);
      
      // Trigger typing indicator
      if (onTyping) {
        onTyping(true);
        
        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 3000);
      }
    }
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check attachment limit
    if (attachments.length + files.length > maxAttachments) {
      toast({
        title: 'Too Many Files',
        description: `You can only attach up to ${maxAttachments} files`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const newAttachments: MessageAttachment[] = [];

      for (const file of Array.from(files)) {
        // Check file size
        const maxSize = MESSAGE_CONSTRAINTS.MAX_FILE_SIZE_MB * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds ${MESSAGE_CONSTRAINTS.MAX_FILE_SIZE_MB}MB limit`,
            variant: 'destructive',
          });
          continue;
        }

        // Create local preview immediately (before uploading)
        const localPreviewUrl = URL.createObjectURL(file);
        
        const attachment: MessageAttachment = {
          id: `preview_${Date.now()}_${Math.random()}`,
          name: file.name,
          url: localPreviewUrl, // Use local preview immediately
          type: file.type,
          size: file.size,
          uploadedAt: new Date() as any,
        };

        newAttachments.push(attachment);

        // Upload file in background and update URL when done
        if (onFileUpload) {
          try {
            const uploadedAttachment = await onFileUpload(file);
            // Update the attachment with the real Cloudinary URL
            const index = newAttachments.findIndex(a => a.id === attachment.id);
            if (index !== -1) {
              newAttachments[index] = uploadedAttachment;
              // Force update state
              setAttachments([...newAttachments]);
            }
          } catch (uploadError) {
            console.error('Background upload failed:', uploadError);
            toast({
              title: 'Upload Failed',
              description: `Failed to upload ${file.name}`,
              variant: 'destructive',
            });
          }
        }
      }

      setAttachments([...attachments, ...newAttachments]);
      
      if (newAttachments.length > 0) {
        toast({
          title: 'Files Ready',
          description: `${newAttachments.length} file(s) selected and uploading...`,
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: 'Error',
        description: 'Failed to process files. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter((a) => a.id !== attachmentId));
  };

  // Send message
  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    // Validate
    if (!trimmedMessage && attachments.length === 0) {
      return;
    }

    if (trimmedMessage.length < MESSAGE_CONSTRAINTS.MIN_LENGTH && attachments.length === 0) {
      return;
    }

    setSending(true);

    try {
      await onSendMessage(trimmedMessage, attachments.length > 0 ? attachments : undefined);
      
      // Clear input
      setMessage('');
      setAttachments([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Send Failed',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key (send message)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !sending;

  return (
    <div className="border-t bg-white/95 backdrop-blur-sm">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="border-b bg-green-50/30 px-4 pt-3 pb-2">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-white border-2 border-green-100 rounded-xl px-3 py-2 max-w-xs shadow-sm"
              >
                {/* File icon or image preview */}
                {attachment.type.startsWith('image/') ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded">
                    <span className="text-lg">{getFileIcon(attachment.type)}</span>
                  </div>
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  type="button"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
        {/* Quick response dropdown for handlers */}
        {showQuickResponses && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                title="Quick Responses"
                className="h-10 w-10 hover:bg-green-50 transition-colors flex-shrink-0"
              >
                <MessageSquare className="h-5 w-5 text-gray-500 hover:text-[#1D9E75]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel>Quick Responses</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {QUICK_RESPONSES.map((response, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => handleQuickResponse(response.message)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">{response.label}</span>
                    <span className="text-xs text-gray-500 line-clamp-2">
                      {response.message}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* File attachment button */}
        {allowAttachments && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || attachments.length >= maxAttachments}
              title="Attach file"
              className="h-10 w-10 hover:bg-green-50 transition-colors flex-shrink-0"
            >
              <Paperclip className="h-5 w-5 text-gray-500 hover:text-[#1D9E75]" />
            </Button>
          </>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            className="
              w-full px-4 py-3 pr-12
              border-2 border-gray-200 rounded-2xl
              focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75]
              resize-none
              max-h-28
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
              bg-gray-50/50 hover:bg-white focus:bg-white
            "
            rows={1}
            style={{ minHeight: '40px' }}
          />
          
          {/* Character count */}
          {message.length > MESSAGE_CONSTRAINTS.MAX_LENGTH - 100 && (
            <div className={`
              absolute bottom-2 right-3 text-xs
              ${message.length >= MESSAGE_CONSTRAINTS.MAX_LENGTH ? 'text-red-600' : 'text-gray-500'}
            `}>
              {message.length}/{MESSAGE_CONSTRAINTS.MAX_LENGTH}
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={!canSend || disabled}
          size="icon"
          className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-[#1D9E75] to-emerald-600 hover:from-emerald-700 hover:to-[#1D9E75] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none rounded-xl"
        >
          {sending ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
        </div>
      </div>
    </div>
  );
}
