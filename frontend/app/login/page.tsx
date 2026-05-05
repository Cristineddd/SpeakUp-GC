import { redirect } from 'next/navigation';

/**
 * /login is not a real page in this Next.js app — authentication is handled
 * via the WalkthroughModal on the landing page (?auth=login).
 * Redirect any direct visits here to the landing page with the login modal open.
 */
export default function LoginPage() {
  redirect('/?auth=login');
}
