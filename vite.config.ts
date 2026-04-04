import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
      "@ui": resolve(__dirname, "src/components/ui"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        caster: resolve(__dirname, "src/caster/index.html"),
        control: resolve(__dirname, "src/control/index.html"),
        overlay: resolve(__dirname, "src/overlay/index.html"),
      },
    },
  },
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
      "/api": {
        target: "http://localhost:3000",
      },
    },
  },
});
