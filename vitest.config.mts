import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolve the "@/..." import alias from tsconfig natively (no extra plugin).
    tsconfigPaths: true,
  },
  test: {
    // Our AI layer is server-side code, so a Node environment is all we need.
    environment: "node",
  },
});
