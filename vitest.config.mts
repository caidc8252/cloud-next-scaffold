import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "server-only": new URL("./vitest.shims/server-only.ts", import.meta.url).pathname,
      "client-only": new URL("./vitest.shims/client-only.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true,
  },
});
