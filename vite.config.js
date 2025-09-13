export default {
    root: '.',
    server: {
      port: 5173,
    },
  };
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Replace with your actual Render backend URL
const backendUrl = "https://athena-ai-3.onrender.com";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});

  
