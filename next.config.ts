import type { NextConfig } from "next";

// Vercel builds and bundles Next.js its own way, and the "standalone" output +
// a custom file-tracing root conflict with Vercel's post-build step. So we only
// enable those for Docker / self-hosting (i.e. when NOT running on Vercel).
const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  // Self-contained ".next/standalone" build for a small Docker image.
  ...(isVercel
    ? {}
    : {
        output: "standalone",
        // Pin the file tracer so it doesn't walk up to a stray lockfile in a
        // parent folder (e.g. ~/package-lock.json).
        outputFileTracingRoot: process.cwd(),
      }),
  // Pin the Turbopack (dev) root for the same reason. Harmless on Vercel.
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
