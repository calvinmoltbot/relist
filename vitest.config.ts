import { defineConfig } from "vitest/config";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load .env.local into process.env BEFORE vitest forks workers, so the
// workers inherit DATABASE_URL. src/lib/db.ts reads it at import time via
// `neon(process.env.DATABASE_URL!)`, so setupFiles runs too late.
loadEnvConfig(process.cwd());

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
