// Renders every public route to static HTML (home + each published case study), so search engines,
// link previews and visitors without JavaScript get the full content. Also writes robots.txt and
// sitemap.xml from the same route list. Runs after `vite build` and `vite build --ssr`.
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { headTags, robotsTxt, sitemapXml } from "./seo.mjs";
import { publicRoutes } from "../src/lib/routes.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const ssrDir = join(root, ".ssr");

const { render } = await import(pathToFileURL(join(ssrDir, "entry-server.js")).href);
const template = await readFile(join(dist, "index.html"), "utf8");
for (const marker of ["<!--seo-head-->", "<!--app-html-->"]) {
  if (!template.includes(marker)) throw new Error(`dist/index.html is missing the ${marker} marker`);
}

const routes = publicRoutes();
for (const route of routes) {
  const html = template.replace("<!--seo-head-->", headTags(route)).replace("<!--app-html-->", render(route.path));
  const dir = join(dist, ...route.path.split("/").filter(Boolean));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), html);
  console.log(`Pre-rendered ${route.path}`);
}

await writeFile(join(dist, "robots.txt"), robotsTxt());
await writeFile(join(dist, "sitemap.xml"), sitemapXml(routes));
await rm(ssrDir, { recursive: true, force: true });
console.log(`Wrote robots.txt and sitemap.xml (${routes.length} URL${routes.length === 1 ? "" : "s"})`);
