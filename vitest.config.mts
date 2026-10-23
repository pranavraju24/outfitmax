import { defineConfig, configDefaults } from "vitest/config";

// Unit tests: fast, no external services. Runs with `npm test`.
export default defineConfig({
  resolve: {
    // Resolve the "@/..." import alias from tsconfig natively (no extra plugin).
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Integration tests (tests/**) need a live local Supabase, so exclude them
    // from the default unit run; they have their own config + script.
    exclude: [...configDefaults.exclude, "tests/**"],
  },
});
