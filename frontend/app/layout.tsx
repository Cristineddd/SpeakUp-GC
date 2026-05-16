import type { Metadata, Viewport } from 'next';
import '../src/index.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'SpeakUp GC',
  description: 'A safe, confidential platform for Gordon College students to file complaints, track case status, and communicate directly with the DEIU.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SpeakUp GC',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
