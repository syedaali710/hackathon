import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// The dashboard uses `@/…` imports (shadcn convention); alias them to ./src.
// `/api` is proxied to the local FastAPI backend so there's no CORS to manage.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
