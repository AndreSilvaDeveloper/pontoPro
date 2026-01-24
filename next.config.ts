import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async redirects() {
    return [
      { source: "/landing", destination: "/", permanent: true },
      { source: "/landing/signup", destination: "/signup", permanent: true },
    ];
  },
};

export default nextConfig;
