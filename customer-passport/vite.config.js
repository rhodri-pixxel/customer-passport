import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Force the browser ESM build so Vite bundles it instead of externalizing
      buffer: "buffer/index.js",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  server: {
    port: 5173,
    host: true,
  },
});
