// Server component — generateStaticParams required for output: export
// Returns a placeholder so Next.js generates the shell; actual ID is read client-side via useParams()
export function generateStaticParams() {
  return [{ id: '_' }];
}
import CaseTrackingClient from './client';
export default function Page() { return <CaseTrackingClient />; }
