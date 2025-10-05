/**
 * Vitest configuration tailored for the wallet utilities package. The tests run
 * in a Node.js environment to exercise filesystem interactions while keeping
 * the output deterministic for CI and local development.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    reporters: ["default"],
  },
});
