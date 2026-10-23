import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { searchEkaMedications } from "./server/ekaMedications.js";

function ekaDevApi() {
  return {
    name: "eka-medications-dev-api",
    configureServer(server) {
      const env = { ...process.env, ...loadEnv(server.config.mode, process.cwd(), "") };
      server.middlewares.use("/api/eka-medications", async (request, response, next) => {
        if (request.method !== "GET") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET");
          response.end(JSON.stringify({ message: "Only GET requests are supported." }));
          return;
        }
        try {
          const url = new URL(request.url || "/", "http://localhost");
          const result = await searchEkaMedications(url.searchParams.get("q"), env);
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "private, no-store");
          response.end(JSON.stringify(result));
        } catch (error) {
          response.statusCode = Number(error?.statusCode) || 503;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ found: false, medicines: [], message: error instanceof Error ? error.message : "Eka medication search is unavailable." }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ekaDevApi()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
    // Mirror the same-origin Vercel function used in production so local
    // browser testing does not call DailyMed directly and hit CORS restrictions.
    proxy: {
      "/api/dailymed-search": {
        target: "https://dailymed.nlm.nih.gov",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const [pathname, queryString = ""] = path.split("?");
          const params = new URLSearchParams(queryString);
          const setId = params.get("setid");
          if (pathname !== "/api/dailymed-search") return path;
          if (setId && /^[0-9a-f-]{36}$/i.test(setId)) {
            return `/dailymed/services/v2/spls/${setId}.xml`;
          }
          const query = params.get("q")?.trim() || "";
          return `/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(query)}&pagesize=10`;
        },
      },
    },
  },
});
