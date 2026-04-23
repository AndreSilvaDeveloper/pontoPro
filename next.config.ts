import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'ontimeia.com',
      },
      {
        protocol: 'https',
        hostname: 'workid.com.br',
      },
      {
        protocol: 'https',
        hostname: 'www.workid.com.br',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { source: "/landing", destination: "/", permanent: true },
      { source: "/landing/signup", destination: "/signup", permanent: true },
    ];
  },
};

export default nextConfig;
