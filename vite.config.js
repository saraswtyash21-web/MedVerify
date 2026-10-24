import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { searchIndianMedicines } from "./server/indiaMedicineSearch.js";

function indianMedicineDevApi() {
  return {
    name: "indian-medicine-search-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/india-medicine-search", async (request, response, next) => {
        if (request.method !== "GET") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET");
          response.end(JSON.stringify({ message: "Only GET requests are supported." }));
          return;
        }
        try {
          const url = new URL(request.url || "/", "http://localhost");
          const result = await searchIndianMedicines(url.searchParams.get("q"));
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "private, no-store");
          response.end(JSON.stringify(result));
        } catch (error) {
          response.statusCode = Number(error?.statusCode) || 502;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ medicines: [], message: error instanceof Error ? error.message : "Indian medicine search is unavailable." }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), indianMedicineDevApi()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
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
