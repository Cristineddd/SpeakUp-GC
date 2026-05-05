// Server component — generateStaticParams required for output: export
export function generateStaticParams() {
  return [{ complaintId: '_' }];
}
import CaseChatClient from './client';
export default function Page() { return <CaseChatClient />; }
