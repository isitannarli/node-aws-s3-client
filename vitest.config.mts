import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    reporters: ["verbose"],
    include: ["src/**/*.spec.ts"],
    coverage: {
      include: ["src/**/*.ts"],
    },
  },
});
