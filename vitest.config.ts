import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.local" });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      "server-only": path.resolve(import.meta.dirname, "lib/empty-mock.ts"),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    exclude: ["lib/ai/models.test.ts", "node_modules"],
  },
});
