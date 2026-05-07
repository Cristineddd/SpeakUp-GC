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
  // Allow cross-origin access for local network development
  allowedDevOrigins: ['192.168.0.106'],
};

export default nextConfig;
