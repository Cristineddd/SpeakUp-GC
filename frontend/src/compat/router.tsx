/**
 * react-router-dom compatibility shim for Next.js
 * Re-exports equivalents using next/navigation and next/link
 */
'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

type NextLinkProps = ComponentProps<typeof NextLink>;
type LinkProps = Omit<NextLinkProps, 'href'> & { to?: string; href?: string };

/** Drop-in for React Router's <Link to="..."> — maps `to` prop to `href` */
export function Link({ to, href, children, ...rest }: LinkProps & { children?: React.ReactNode }) {
  return <NextLink href={(to ?? href ?? '/') as string} {...rest}>{children}</NextLink>;
}

export {
  useRouter as _useRouter,
  usePathname,
} from 'next/navigation';

export { useParams } from 'next/navigation';

import { useRouter, usePathname, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Drop-in for React Router's useSearchParams.
 * Returns [searchParams, setSearchParams] where searchParams has a .get() method.
 */
export function useSearchParams(): [URLSearchParams & { delete: (key: string) => void }, (params: URLSearchParams, options?: { replace?: boolean }) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const nextParams = useNextSearchParams();

  // Build a mutable URLSearchParams from the current search string
  const mutableParams = new URLSearchParams(nextParams ? nextParams.toString() : '');

  const setSearchParams = useCallback(
    (newParams: URLSearchParams, options?: { replace?: boolean }) => {
      const qs = newParams.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (options?.replace) {
        router.replace(url);
      } else {
        router.push(url);
      }
    },
    [router, pathname]
  );

  return [mutableParams as any, setSearchParams];
}

/** Drop-in replacement for useNavigate */
export function useNavigate() {
  const router = useRouter();
  return useCallback((to: string | number, options?: { replace?: boolean; state?: any }) => {
    if (typeof to === 'number') {
      if (to === -1) router.back();
      else if (to === 1) router.forward();
      return;
    }
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router]);
}

/** Drop-in replacement for useLocation */
export function useLocation() {
  const pathname = usePathname();
  // Use the stable Next.js hook directly — NOT the custom shim — so we don't
  // create a new URLSearchParams object on every render (which causes infinite loops).
  const nextParams = useNextSearchParams();
  const search = nextParams?.toString() ? `?${nextParams.toString()}` : '';
  return {
    pathname,
    search,
    hash: '',
    state: null,
    key: 'default',
  };
}

/** Drop-in replacement for Navigate component */
import { useEffect } from 'react';
export function Navigate({ to, replace, state }: { to: string; replace?: boolean; state?: any }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [to, replace, router]);
  return null;
}

// These are no-ops in Next.js App Router (routing is file-based)
export function Routes({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Route() {
  return null;
}

export function Outlet({ children }: { children?: React.ReactNode }) {
  return <>{children ?? null}</>;
}
