// Sets the site's real public URL in src/content/site.js.
// Canonical, Open Graph, JSON-LD, robots.txt and sitemap.xml are all generated from it at build time.
// (Modification dates are not set here: they come from git history at build time — scripts/content-dates.mjs.)
// Usage: npm run set-domain -- https://real-domain.tld
// Run it only once the real public URL is known.
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(resolve(fileURLToPath(new URL("..", import.meta.url))), "src", "content", "site.js");

const fail = (msg) => { console.error(msg); process.exit(1); };

let next;
try { next = new URL(process.argv[2]); } catch { fail("Usage: npm run set-domain -- https://your-real-domain.tld"); }
if (next.protocol !== "https:") fail("The URL must start with https://");
if (next.pathname !== "/" || next.search || next.hash) fail("Use the site root only (no path), e.g. https://name.netlify.app");
if (/(^|\.)example(\.com|\.org|\.net)?$/i.test(next.hostname)) fail("That is a placeholder domain, not a real one.");

let src = await readFile(file, "utf8");
const urlRe = /siteUrl:\s*"[^"]*"/;
if (!urlRe.test(src)) fail("Could not find siteUrl in src/content/site.js");
const before = src.match(urlRe)[0];
src = src.replace(urlRe, `siteUrl: "${next.origin}"`);
await writeFile(file, src);

console.log(`src/content/site.js: ${before} → siteUrl: "${next.origin}"`);
console.log("\nNow run: npm run check:publish");
