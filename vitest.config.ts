import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "renderer",
          environment: "jsdom",
          include: ["src/renderer/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/renderer/src/test/setup.ts"],
        },
      },
    ],
    coverage: {
      include: ["src/main/**/*.ts", "src/renderer/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "src/renderer/src/main.tsx",
        "src/renderer/src/test/**",
      ],
      reporter: ["text", "html"],
    },
  },
});
