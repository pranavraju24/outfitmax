import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained ".next/standalone" build (minimal server + only the
  // node_modules actually used) for a small Docker image.
  output: "standalone",
  // Pin the project root so Turbopack (dev) and the file tracer (build) don't
  // walk up to a stray lockfile in a parent folder (e.g. ~/package-lock.json).
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      // Allow uploading several clothing photos in one submission. The default
      // is just 1MB, which one phone photo can exceed on its own.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
