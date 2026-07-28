import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  // Allow LAN / phone / other-browser access during `next dev`.
  // Update if your Network URL IP changes (shown in the next dev terminal).
  allowedDevOrigins: [
    '127.0.0.1',
    '192.168.0.114',
    '192.168.0.106',
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : []),
  ],
  // Reduce Firebase Google popup COOP noise in browsers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Keep FCM background handler available; next-pwa SW coexists with firebase-messaging-sw.js
  workboxOptions: {
    disableDevLogs: true,
  },
})(nextConfig);