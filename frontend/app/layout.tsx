import type { Metadata } from 'next';
import '../src/index.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'SpeakUp GC',
  description: 'A safe, confidential platform for Gordon College students to file complaints, track case status, and communicate directly with the DEIU.',
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
