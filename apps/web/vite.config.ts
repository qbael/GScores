import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  clearScreen: false,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": loadEnv(mode, import.meta.dirname, "").API_PROXY_TARGET ?? "http://127.0.0.1:3000",
    },
  },
}));
