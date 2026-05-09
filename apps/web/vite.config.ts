import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787"
    }
  },
  resolve: {
    alias: {
      "@openclog/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url))
    }
  }
});
