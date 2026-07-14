import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Integration tests share one DB connection; run serially to avoid races.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd()),
    },
  },
});
