import { defineConfig, type Plugin } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

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
        const bare = url.match(/^\/(caster|control|overlay)$/);
        if (bare) {
          res.writeHead(302, { Location: `/${bare[1]}/` });
          res.end();
          return;
        }
        // Rewrite /caster/foo → /src/caster/foo (and same for control, overlay)
        const match = url.match(/^\/(caster|control|overlay)(\/.*)?$/);
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
