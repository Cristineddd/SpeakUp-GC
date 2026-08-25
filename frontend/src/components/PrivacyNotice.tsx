import { Lock, X } from 'lucide-react';

interface PrivacyNoticeProps {
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

/** Shared privacy strip — same color, icon, and copy across complainant pages. */
export function PrivacyNotice({ dismissible = false, onDismiss, className = '' }: PrivacyNoticeProps) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl relative ${className}`.trim()}
      style={{ background: 'var(--privacy-bg)', border: '1px solid var(--card-outline)' }}
    >
      <div className="rounded-lg p-2 shrink-0 bg-[#DCFCE7]">
        <Lock className="h-4 w-4 text-[#166534]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#14532D]">Your privacy is protected</p>
        <p className="text-xs mt-0.5 leading-relaxed text-[#166534]">
          All complaints are handled with strict confidentiality by the DEIU office.
          Your identity is <strong>never disclosed</strong> to respondents without your consent.
          You may also file anonymously.
        </p>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 hover:bg-green-200/50 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-[#166534]" />
        </button>
      )}
    </div>
  );
}
