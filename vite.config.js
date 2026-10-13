import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { headTags } from "./scripts/seo.mjs";

// Dev server: inject the home page's SEO tags so `npm run dev` looks like production.
// Production: the <!--seo-head--> marker is left in place and scripts/prerender.mjs fills it per route
// (and writes robots.txt + sitemap.xml from the real route list).
function seo() {
  let command = "build";
  return {
    name: "portfolio-seo",
    configResolved(config) {
      command = config.command;
    },
    transformIndexHtml(html) {
      return command === "serve" ? html.replace("<!--seo-head-->", headTags({ page: "home", path: "/" })) : html;
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), seo()],
  // The 3D stage chunk (three.js + React Three Fiber) is ~250 kB gzipped by design; it is lazy-loaded after
  // the page is readable, so the default 500 kB warning is raised.
  build: { target: "es2020", copyPublicDir: !isSsrBuild, chunkSizeWarningLimit: 1100 },
}));
