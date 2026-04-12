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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("react-dom") ||
            id.includes("react-router-dom") ||
            id.includes("/react/")
          ) {
            return "vendor-react";
          }

          if (id.includes("@mui") || id.includes("@emotion")) {
            return "vendor-mui";
          }

          if (id.includes("firebase") || id.includes("@supabase")) {
            return "vendor-backend";
          }
        },
      },
    },
  },
});
