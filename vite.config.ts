import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

function analyticsPlugin(endpoint: string | undefined, websiteId: string | undefined) {
  return {
    name: "nsos-optional-analytics",
    transformIndexHtml(html: string) {
      if (!endpoint || !websiteId || !/^[A-Za-z0-9_-]{1,128}$/.test(websiteId)) return html;

      let analyticsUrl: URL;
      try {
        analyticsUrl = new URL(endpoint);
      } catch {
        return html;
      }

      if (analyticsUrl.protocol !== "https:" || analyticsUrl.username || analyticsUrl.password || analyticsUrl.search || analyticsUrl.hash) {
        return html;
      }

      const scriptUrl = `${analyticsUrl.origin}${analyticsUrl.pathname.replace(/\/+$/, "")}/umami`;
      const script = `<script defer src="${scriptUrl}" data-website-id="${websiteId}"></script>`;
      return html.replace("</body>", `    ${script}\n  </body>`);
    },
  };
}

const envDir = path.resolve(import.meta.dirname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "VITE_");

  return {
    plugins: [
      react(),
      tailwindcss(),
      jsxLocPlugin(),
      analyticsPlugin(env.VITE_ANALYTICS_ENDPOINT, env.VITE_ANALYTICS_WEBSITE_ID),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir,
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      allowedHosts: ["localhost", "127.0.0.1"],
      fs: { strict: true, deny: ["**/.*"] },
    },
  };
});
