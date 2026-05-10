import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/harness/harness.mjs"],
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 }
    }
  }
});
