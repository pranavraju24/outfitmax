import { defineConfig } from "vitest/config";

// Integration tests: require a running LOCAL Supabase (`npx supabase start`).
// Runs with `npm run test:integration`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    // Real network calls to the local stack need more time than unit tests.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
