/** Stable Firestore doc id for an FCM device token. */
export function fcmTokenDocId(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return `t_${Math.abs(hash)}_${token.slice(-12).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
