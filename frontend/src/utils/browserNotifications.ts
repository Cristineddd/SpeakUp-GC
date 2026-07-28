const PERMISSION_PROMPT_KEY = 'speakup-notification-prompt-dismissed';

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function wasNotificationPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PERMISSION_PROMPT_KEY) === 'true';
}

export function dismissNotificationPrompt(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERMISSION_PROMPT_KEY, 'true');
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showBrowserNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    onClick?: () => void;
  }
): void {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
    });

    notification.onclick = () => {
      window.focus();
      options?.onClick?.();
      notification.close();
    };
  } catch (error) {
    console.warn('[browserNotifications] Could not show notification:', error);
  }
}

export function truncateNotificationMessage(message: string, maxLength = 140): string {
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength - 3).trim()}...`;
}
