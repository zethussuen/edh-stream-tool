import { defineConfig, type Plugin } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import pkg from "./package.json" with { type: "json" };

function devRoutes(): Plugin {
  return {
    name: "dev-routes",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        // Redirect / to /caster so relative paths in index.html resolve correctly
        if (url === "/") {
          res.writeHead(302, { Location: "/caster" });
          res.end();
          return;
        }
        // Redirect /caster to /caster/ so relative paths resolve correctly
        const bare = url.match(/^\/(caster|control|overlay|spotlight|nameplates|annotations|decklist|focused-card|pod-summary|player-spotlight)$/);
        if (bare) {
          res.writeHead(302, { Location: `/${bare[1]}/` });
          res.end();
          return;
        }
        // Rewrite /caster/foo → /src/caster/foo (and same for other pages)
        const match = url.match(/^\/(caster|control|overlay|spotlight|nameplates|annotations|decklist|focused-card|pod-summary|player-spotlight)(\/.*)?$/);
        if (match) {
          const page = match[1];
          const rest = match[2] || "";
          if (!rest || !/\.\w+/.test(rest)) {
            req.url = `/src/${page}/index.html`;
          } else {
            req.url = `/src/${page}${rest}`;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [devRoutes(), react(), tailwindcss()],
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
        spotlight: resolve(__dirname, "src/spotlight/index.html"),
        nameplates: resolve(__dirname, "src/nameplates/index.html"),
        annotations: resolve(__dirname, "src/annotations/index.html"),
        decklist: resolve(__dirname, "src/decklist/index.html"),
        "focused-card": resolve(__dirname, "src/focused-card/index.html"),
        "pod-summary": resolve(__dirname, "src/pod-summary/index.html"),
        "player-spotlight": resolve(__dirname, "src/player-spotlight/index.html"),
      },
    },
  },
  server: {
    host: true,
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
