import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendUrl = "https://athena-ai-3.onrender.com";

export default defineConfig({
  root: ".",
  plugins: [react()],
  server: {
    port: 5173,
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

  

