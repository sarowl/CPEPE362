// next.config.ts
import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  reactCompiler: true,
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: "50mb",
  },
} as any;

export default nextConfig;