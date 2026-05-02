// next.config.ts
import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  reactCompiler: true,
  proxyClientMaxBodySize: 52428800, // 50MB in bytes
} as any;

export default nextConfig;