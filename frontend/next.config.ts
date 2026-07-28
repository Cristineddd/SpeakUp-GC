import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  // Allow images from Firebase Storage
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
    ],
  },
  // Ensure the src directory is used
  typescript: {
    ignoreBuildErrors: false,
  },
  // Keep in sync with next.config.mjs (mjs is what Next loads when both exist)
  allowedDevOrigins: [
    '127.0.0.1',
    '192.168.0.114',
    '192.168.0.106',
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : []),
  ],
};

export default nextConfig;
