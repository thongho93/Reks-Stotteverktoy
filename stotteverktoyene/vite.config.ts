import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // Honor the port assigned by the harness (PORT env) when present; fall back to Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
});
