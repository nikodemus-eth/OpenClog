import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "tests/redteam/**/*.test.ts"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "packages/core/src/**/*.ts",
        "apps/api/src/**/*.ts",
        "apps/web/src/state/**/*.ts"
      ],
      exclude: [
        "**/main.ts",
        "**/server.ts",
        "**/live-gateway.ts",
        "**/fixture-server.ts",
        "**/*.d.ts",
        "**/generated/**"
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  },
  resolve: {
    alias: {
      "@openclog/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname
    }
  }
});
