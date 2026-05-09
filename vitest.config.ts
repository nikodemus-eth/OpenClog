import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

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
        "**/app.ts",
        "**/live-gateway.ts",
        "**/repository.ts",
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
      "@openclog/app": fileURLToPath(new URL("./packages/app/src/index.ts", import.meta.url)),
      "@openclog/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url))
    }
  }
});
