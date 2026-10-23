import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow uploading several clothing photos in one submission. The default
      // is just 1MB, which one phone photo can exceed on its own.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
