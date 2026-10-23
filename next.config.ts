import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so Turbopack doesn't walk up to a stray lockfile in a
  // parent folder (e.g. ~/package-lock.json) and mis-serve client assets.
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // Allow uploading several clothing photos in one submission. The default
      // is just 1MB, which one phone photo can exceed on its own.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
