// Renders every public route to static HTML (home + each published case study), so search engines,
// link previews and visitors without JavaScript get the full content. Also writes robots.txt and
// sitemap.xml from the same route list. Runs after `vite build` and `vite build --ssr`.
import { readFile, readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { headTags, robotsTxt, sitemapXml } from "./seo.mjs";
import { contentDateReport } from "./content-dates.mjs";
import { site } from "../src/content/site.js";
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

// Person.image: the portrait as actually deployed (Vite's content-hashed file — its URL changes only if the
// photograph itself changes). Used only if exactly one such file exists AND the home page displays it.
const assets = await readdir(join(dist, "assets"));
const portraits = assets.filter((f) => /^sujal-pandey-portrait-[\w-]+\.(jpe?g|png|webp)$/.test(f));
const homeHtml = render("/");
let personImage;
if (portraits.length === 1 && homeHtml.includes(`src="/assets/${portraits[0]}"`)) {
  personImage = `${site.siteUrl}/assets/${portraits[0]}`;
} else {
  console.warn(`Person.image omitted: expected one displayed portrait in dist/assets, found ${portraits.length}`);
}

for (const route of routes) {
  const html = template
    .replace("<!--seo-head-->", headTags(route, { personImage }))
    .replace("<!--app-html-->", route.path === "/" ? homeHtml : render(route.path));
  const dir = join(dist, ...route.path.split("/").filter(Boolean));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), html);
  console.log(`Pre-rendered ${route.path}`);
}

await writeFile(join(dist, "robots.txt"), robotsTxt());
await writeFile(join(dist, "sitemap.xml"), sitemapXml(routes));
await rm(ssrDir, { recursive: true, force: true });
console.log(`Wrote robots.txt and sitemap.xml (${routes.length} URL${routes.length === 1 ? "" : "s"})`);
console.log(`Person.image: ${personImage ?? "omitted"}`);
console.log(`Content dates (from git):\n  ${contentDateReport().join("\n  ")}`);
