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
    // Browser tab uses the round mark; PWA install icons stay square via manifest.json
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/favicon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  other: {
    'X-UA-Compatible': 'IE=edge',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1D9E75',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {/* Mute debug console noise on deployed builds before app bundles load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var h = location.hostname;
    var isDev = h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
    if (!isDev) {
      var n = function(){};
      console.log = n;
      console.debug = n;
      console.info = n;
      console.warn = n;
    }
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
