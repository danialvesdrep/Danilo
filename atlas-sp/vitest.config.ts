import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` é um marcador do bundler do Next; nos testes é inerte.
      "server-only": path.resolve(__dirname, "./scripts/support/empty-module.cjs"),
    },
  },
});
