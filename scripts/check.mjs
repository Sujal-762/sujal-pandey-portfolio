// Publication-safety and SEO checker. Tests the BUILT site in dist/ — exactly what gets deployed —
// plus the content files it is generated from.
//   npm run check           → builds, then reports problems + unresolved items (fails on problems)
//   npm run check:publish   → same, but ALSO fails while any unresolved item remains
import { readFile, readdir, access } from "node:fs/promises";
import { join, resolve, relative, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const strict = process.argv.includes("--strict");
const errors = [];
const pending = [];

const exists = (p) => access(p).then(() => true, () => false);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const onOrigin = (url, origin) => { try { return new URL(url).origin === origin; } catch { return false; } };
const load = (p) => import(pathToFileURL(join(root, p)).href);
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const notFuture = (s) => Date.parse(s) <= Date.now() + 86400000;
const nonEmptyStrings = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => typeof x === "string" && x.trim());

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

if (!(await exists(join(dist, "index.html")))) {
  console.log("\n✗ dist/index.html not found — run `npm run build` (npm run check does this for you).\n");
  process.exit(1);
}

const { site, profile, contacts, interests } = await load("src/content/site.js");
const { categories, projects } = await load("src/content/projects.js");
const { allCaseStudies, caseStudies } = await load("src/content/caseStudies.js");
const { backgroundReading } = await load("src/content/sources.js");
const { hotspots } = await load("src/content/journey.js");
const { archiveEntries } = await load("src/content/archive.js");
const { DISCIPLINES } = await load("src/content/taxonomy.js");
const { publicRoutes } = await load("src/lib/routes.js");
const distFiles = await walk(dist);
const rel = (f) => relative(root, f).replaceAll("\\", "/");

const PLACEHOLDER = /\[VERIFY|\bTODO\b|\bTBD\b|lorem ipsum|UNCONFIRMED|YOUR-DOMAIN/i;
const UNPUBLISHED = /\bRAPID\b|Evidencia/i;

// =====================================================================
// 1. Content validation (src/content)
// =====================================================================
const catIds = new Set(categories.map((c) => c.id));
const discIds = new Set(DISCIPLINES.map((d) => d.id));

function validateEntry(p, kind) {
  const where = `src/content/${kind === "demo" ? "demos" : "projects"}.js [${p.slug ?? "?"}]`;
  for (const k of ["slug", "category", "title", "summary", "overview", "objective", "status"]) {
    if (typeof p[k] !== "string" || !p[k].trim()) errors.push(`${where}: missing "${k}"`);
  }
  if (!Array.isArray(p.methods) || p.methods.length === 0) errors.push(`${where}: "methods" must list at least one item`);
  if (p.category && !catIds.has(p.category)) errors.push(`${where}: unknown category "${p.category}"`);
  if (PLACEHOLDER.test(JSON.stringify(p))) errors.push(`${where}: contains placeholder text`);
  if (UNPUBLISHED.test(JSON.stringify(p))) errors.push(`${where}: mentions an unpublished draft project (RAPID/Evidencia)`);
  for (const g of p.gallery ?? []) {
    if (g.src && !(typeof g.alt === "string" && g.alt.trim().length > 5)) errors.push(`${where}: gallery image ${g.src} needs descriptive alt text`);
    if (!g.src && !g.visual) errors.push(`${where}: gallery item needs "src" or "visual"`);
  }
  for (const l of p.links ?? []) if (!/^https:\/\//.test(l.url)) errors.push(`${where}: link must be https: ${l.url}`);
  if (kind === "demo") {
    if (p.demo !== true) errors.push(`${where}: interface demo entries must have demo: true`);
    if (!/fictional/i.test(p.overview)) errors.push(`${where}: demo overview must state that the entry is fictional`);
    if ((p.findings ?? []).length) errors.push(`${where}: demo entries must not contain findings`);
  } else if (p.demo) {
    errors.push(`${where}: demonstration entries must not be published as projects`);
  }
}
projects.forEach((p) => validateEntry(p, "project"));

// Public case studies: strict schema + ethics fields. Only status "published" is built.
for (const c of allCaseStudies) {
  const where = `src/content/caseStudies.js [${c.slug ?? "?"}]`;
  // This file is bundled into the public JavaScript, so drafts here would leak even if filtered out.
  if (c.status !== "published") {
    errors.push(`${where}: only status "published" belongs in this file — keep drafts in drafts/case-studies.md`);
    continue;
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug ?? "")) errors.push(`${where}: slug must be kebab-case`);
  for (const k of ["title", "jurisdiction", "period", "summary"]) {
    if (typeof c[k] !== "string" || !c[k].trim()) errors.push(`${where}: missing "${k}"`);
  }
  if (c.summary && c.summary.length > 160) errors.push(`${where}: summary is used as the meta description — keep it ≤ 160 characters`);
  for (const k of ["background", "questions", "evidenceTypes", "observations", "interpretations", "conclusions", "limitations", "lessons"]) {
    if (!nonEmptyStrings(c[k])) errors.push(`${where}: "${k}" must be a non-empty list of strings`);
  }
  if (!Array.isArray(c.disciplines) || !c.disciplines.length || c.disciplines.some((d) => !discIds.has(d))) {
    errors.push(`${where}: "disciplines" must use ids from src/content/taxonomy.js`);
  }
  const refs = c.references ?? [];
  if (refs.length < 2) errors.push(`${where}: at least two references are required`);
  refs.forEach((r, i) => {
    if (!r.title || !r.publisher || !r.year) errors.push(`${where}: reference ${i + 1} needs title, publisher and year`);
    if (!/^https:\/\//.test(r.url ?? "")) errors.push(`${where}: reference ${i + 1} needs an https URL`);
    if (!isDate(r.accessed) || !notFuture(r.accessed)) errors.push(`${where}: reference ${i + 1} needs a valid "accessed" date`);
  });
  if (!Array.isArray(c.methods) || !c.methods.length) errors.push(`${where}: "methods" is required`);
  for (const m of c.methods ?? []) {
    if (!m.text || !Array.isArray(m.refs) || !m.refs.length) errors.push(`${where}: every method needs text and at least one reference number`);
    else if (m.refs.some((n) => !Number.isInteger(n) || n < 1 || n > refs.length)) errors.push(`${where}: method "${m.text.slice(0, 40)}…" cites a reference that doesn't exist`);
  }
  for (const a of c.assets ?? []) {
    const aw = `${where}: asset ${a.file ?? "?"}`;
    if (!a.file?.startsWith("/cases/")) errors.push(`${aw} must live under public/cases/`);
    else if (!(await exists(join(root, "public", a.file)))) errors.push(`${aw} is missing from public/`);
    if (!(typeof a.alt === "string" && a.alt.trim().length >= 10)) errors.push(`${aw} needs descriptive alt text`);
    if (!a.credit || !a.caption) errors.push(`${aw} needs a caption and credit`);
    if (!a.licence || /unknown|unclear|tbd|\?/i.test(a.licence)) errors.push(`${aw} needs a verified licence`);
    if (!/^https:\/\//.test(a.sourceUrl ?? "")) errors.push(`${aw} needs an https source URL`);
  }
  const s = c.sensitivity ?? {};
  if (s.activeCase !== false) errors.push(`${where}: sensitivity.activeCase must be false (no active cases)`);
  if (s.graphicImagery !== false) errors.push(`${where}: sensitivity.graphicImagery must be false`);
  if (s.victimDetailsMinimised !== true) errors.push(`${where}: sensitivity.victimDetailsMinimised must be true`);
  const v = c.verification ?? {};
  if (!v.verifiedBy) errors.push(`${where}: verification.verifiedBy is required`);
  if (!isDate(v.dateVerified) || !notFuture(v.dateVerified)) errors.push(`${where}: verification.dateVerified must be a valid past date`);
  if (PLACEHOLDER.test(JSON.stringify(c))) errors.push(`${where}: contains placeholder text`);
  if (UNPUBLISHED.test(JSON.stringify(c))) errors.push(`${where}: mentions an unpublished draft project`);
}
const slugs = [...projects, ...caseStudies].map((p) => p.slug);
const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupSlugs.length) errors.push(`duplicate slugs: ${[...new Set(dupSlugs)].join(", ")}`);
for (const r of backgroundReading) if (!/^https:\/\//.test(r.url)) errors.push(`src/content/sources.js: reading "${r.id}" needs an https URL`);
for (const h of hotspots) {
  if (!h.title || !h.body) errors.push(`src/content/journey.js: hotspot "${h.id}" needs a title and body`);
  if (PLACEHOLDER.test(JSON.stringify(h)) || UNPUBLISHED.test(JSON.stringify(h))) errors.push(`src/content/journey.js: hotspot "${h.id}" contains placeholder or draft text`);
}

// =====================================================================
// 2. Built HTML: every page
// =====================================================================
const routes = publicRoutes();
const expectedPages = new Map(routes.map((r) => [r.path === "/" ? "dist/index.html" : `dist${r.path}index.html`, r]));
for (const page of expectedPages.keys()) if (!distFiles.map(rel).includes(page)) errors.push(`${page} was not pre-rendered`);
const draftTitles = allCaseStudies.filter((c) => c.status !== "published").map((c) => c.title).filter(Boolean);

let homeCanonical = null;

for (const file of distFiles.filter((f) => f.endsWith(".html"))) {
  const name = rel(file);
  const html = await readFile(file, "utf8");
  const live = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
  const body = live.slice(live.indexOf("<body"));
  const text = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&quot;/g, '"').replace(/\s+/g, " ");
  const route = expectedPages.get(name);

  const h1s = live.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) errors.push(`${name}: expected exactly one <h1>, found ${h1s.length}`);
  if (!/<title>[^<]{10,}<\/title>/.test(live)) errors.push(`${name}: missing or very short <title>`);
  if (!/<html[^>]+lang=/.test(live)) errors.push(`${name}: <html> has no lang attribute`);
  if (live.includes("<!--seo-head-->") || html.includes("<!--app-html-->")) errors.push(`${name}: un-filled template marker`);

  const indexable = !/name="robots"[^>]*noindex/.test(live);
  if (indexable && !route) errors.push(`${name}: indexable page that is not a public route`);
  const canonical = (live.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  let origin = null;
  if (indexable) {
    const title = (live.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    if (title.length > 65) errors.push(`${name}: <title> is ${title.length} chars (aim ≤ 65)`);
    const desc = (live.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    if (!desc) errors.push(`${name}: missing meta description`);
    else if (desc.length > 160) errors.push(`${name}: meta description is ${desc.length} chars (aim ≤ 160)`);
    if (!canonical) errors.push(`${name}: missing canonical link`);
    for (const p of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
      if (!live.includes(`property="${p}"`)) errors.push(`${name}: missing ${p}`);
    }
    if (!/<div id="root">\s*<[a-z]/i.test(live)) errors.push(`${name}: app is not pre-rendered (empty #root)`);
  }
  if (canonical) {
    try { origin = new URL(canonical).origin; } catch { errors.push(`${name}: canonical is not an absolute URL`); }
    if (route && origin && new URL(canonical).pathname !== route.path) errors.push(`${name}: canonical path should be ${route.path}`);
    if (name === "dist/index.html") homeCanonical = canonical;
  }
  if (origin) {
    const og = (p) => (live.match(new RegExp(`property="${p}" content="([^"]+)"`)) || [])[1];
    if (og("og:url") !== canonical) errors.push(`${name}: og:url differs from canonical`);
    const img = og("og:image");
    if (img && !onOrigin(img, origin)) errors.push(`${name}: og:image is not on the canonical origin`);
    else if (img && !(await exists(join(dist, new URL(img).pathname)))) errors.push(`${name}: og:image file is not in dist/`);
  }

  const hrefs = [...live.matchAll(/\shref="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

  // ---- Home page content ----
  if (route?.page === "home") {
    const norm = text.toLowerCase().replace(/-/g, " ");
    const mustSay = [
      profile.name, profile.programme, profile.institution, profile.expectedGraduation, profile.yearOfStudy,
      "third year", "aspiring crime scene investigator", "not a practising or certified crime scene investigator",
      ...interests.map((i) => i.title), contacts.email, "Skip intro",
      // Honesty labels for the cinematic scenes must be in the crawlable text, not only in the canvas.
      "no real case or evidence depicted", "illustrative props", "Fictional / illustrative data", "no real device was examined",
    ];
    for (const s of mustSay) if (!norm.includes(s.toLowerCase().replace(/-/g, " "))) errors.push(`${name}: crawlable text is missing "${s}"`);
    for (const id of ["top", "evidence", "transform", "archive", "contact"]) {
      if (!new RegExp(`<section[^>]+id="${id}"`).test(live)) errors.push(`${name}: section #${id} missing from pre-rendered HTML`);
    }
    // The archive is visible on the home page: every entry (and its detail text) must be in the crawlable HTML.
    const archive = (live.match(/<section[^>]+id="archive"[\s\S]*?<\/section>/) || [""])[0];
    const archiveText = archive.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, "\"").replace(/\s+/g, " ");
    for (const e of archiveEntries) {
      if (!archiveText.includes(e.title)) errors.push(`${name}: archive entry "${e.title}" is not in the pre-rendered archive`);
      if (!archive.includes(`id="entry-${e.id}"`)) errors.push(`${name}: archive entry ${e.id} has no detail panel`);
    }
    // Demonstrations carry the machine-readable illustrative marker; the fictional timeline is labelled.
    const demos = archiveEntries.filter((e) => e.demo).length;
    if ((archive.match(/data-illustrative/g) || []).length < demos) errors.push(`${name}: an archive demonstration is missing its illustrative-data label`);
    if (!/Fictional timeline/.test(archive)) errors.push(`${name}: the device timeline is not labelled as fictional`);
    // Sealed slots must not carry names or details of unpublished work.
    for (const e of archiveEntries.filter((x) => x.sealed)) if (e.href || e.url) errors.push(`archive.js: sealed entry ${e.id} must not link anywhere`);
    // 3D must stay a client-side enhancement: no canvas in the pre-rendered HTML.
    if (/<canvas/.test(live)) errors.push(`${name}: a canvas is in the pre-rendered HTML`);
    for (const need of [`mailto:${contacts.email}`, contacts.linkedin.url, contacts.github.url]) {
      if (!hrefs.includes(need)) errors.push(`${name}: missing crawlable link ${need}`);
    }
    for (const c of caseStudies) if (!hrefs.includes(`/cases/${c.slug}/`)) errors.push(`${name}: archive does not link to /cases/${c.slug}/`);
  }

  // ---- Archive index page ----
  if (route?.page === "archive") {
    if (caseStudies.length === 0 && !text.includes("Dossiers in preparation")) errors.push(`${name}: empty archive must say "Dossiers in preparation"`);
    for (const c of caseStudies) if (!hrefs.includes(`/cases/${c.slug}/`)) errors.push(`${name}: archive index does not link to /cases/${c.slug}/`);
    for (const r of backgroundReading) if (!hrefs.includes(r.url)) errors.push(`${name}: background reading link ${r.url} missing`);
  }

  // ---- Case-study pages ----
  if (route?.page === "case") {
    const c = route.caseStudy;
    if (!text.includes(c.title)) errors.push(`${name}: title missing from page text`);
    for (const h of ["Case background", "Investigation questions", "Forensic disciplines", "Evidence types",
      "Methods described in public sources", "Observations, interpretations and conclusions",
      "Lessons for forensic practice", "References", "Visual assets and licensing"]) {
      if (!text.includes(h)) errors.push(`${name}: dossier section "${h}" missing`);
    }
    for (const r of c.references) if (!hrefs.includes(r.url)) errors.push(`${name}: reference link ${r.url} missing`);
  }

  for (const t of draftTitles) if (text.includes(t)) errors.push(`${name}: unpublished case-study draft "${t}" appears`);

  // Visible placeholder / draft markup is never allowed in a public page.
  for (const m of live.matchAll(/\[VERIFY\b|\sdata-draft\b|\sdata-verify\b|UNCONFIRMED/g)) {
    errors.push(`${name}:${lineOf(html, m.index)} placeholder/draft text in public HTML: ${m[0].trim()}`);
  }
  for (const m of live.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]+"/.test(m[0])) errors.push(`${name}:${lineOf(html, m.index)} <img> without descriptive alt`);
  }

  // JSON-LD
  const blocks = [...live.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (indexable && blocks.length === 0) errors.push(`${name}: no JSON-LD structured data`);
  for (const m of blocks) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { errors.push(`${name}: invalid JSON-LD (${e.message})`); continue; }
    const nodes = data["@graph"] || [data];
    const types = nodes.map((n) => n["@type"]);
    const need = route?.page === "case" ? ["Article", "Person"] : route?.page === "archive" ? ["CollectionPage", "Person"] : ["ProfilePage", "Person"];
    for (const t of need) if (!types.includes(t)) errors.push(`${name}: JSON-LD has no ${t}`);
    for (const node of nodes) {
      for (const key of ["@id", "url"]) {
        if (origin && typeof node[key] === "string" && !onOrigin(node[key], origin)) {
          errors.push(`${name}: JSON-LD ${node["@type"]} ${key} is not on the canonical origin`);
        }
      }
      if (node["@type"] !== "Person") continue;
      if (node.name !== profile.name) errors.push(`${name}: JSON-LD Person name is not "${profile.name}"`);
      if (node.jobTitle || node.hasCredential || node.award || node.hasOccupation || node.worksFor) {
        errors.push(`${name}: JSON-LD Person claims a job, credential, employer or award`);
      }
      for (const url of [].concat(node.sameAs || [])) {
        if (!/^https:\/\/[^\s/]+\.[^\s/]+\//.test(url)) errors.push(`${name}: JSON-LD sameAs is not a valid https URL: ${url}`);
        else if (types.includes("ProfilePage") && !hrefs.includes(url)) errors.push(`${name}: JSON-LD sameAs ${url} is not linked on the page`);
      }
      if (types.includes("ProfilePage") && node.email && !hrefs.includes(node.email.startsWith("mailto:") ? node.email : `mailto:${node.email}`)) {
        errors.push(`${name}: JSON-LD email does not match a mailto link on the page`);
      }
    }
  }

  // Ids, ARIA references, links
  const ids = [...live.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`${name}: duplicate id(s): ${[...new Set(dupes)].join(", ")}`);
  for (const m of live.matchAll(/\s(?:aria-labelledby|aria-describedby|aria-controls)="([^"]+)"/g)) {
    for (const id of m[1].split(/\s+/)) {
      // aria-controls of the mobile menu points at an element that only exists while open.
      if (id === "mobile-menu") continue;
      if (!ids.includes(id)) errors.push(`${name}:${lineOf(html, m.index)} ARIA reference to missing id "${id}"`);
    }
  }
  for (const m of live.matchAll(/<a\b[^>]*>/g)) {
    const tag = m[0];
    const where = `${name}:${lineOf(html, m.index)}`;
    const href = ((tag.match(/\shref="([^"]*)"/) || [])[1] || "").replace(/&amp;/g, "&");
    if (!href || href === "#") { errors.push(`${where} empty link`); continue; }
    if (/\starget="_blank"/.test(tag) && !/\srel="[^"]*\bnoopener\b/.test(tag)) errors.push(`${where} target="_blank" without rel="noopener": ${href}`);
    if (href.startsWith("http:")) errors.push(`${where} insecure http:// link: ${href}`);
    if (href.startsWith("https:")) { try { new URL(href); } catch { errors.push(`${where} malformed URL: ${href}`); } }
    if (href.startsWith("mailto:") && !/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(href)) errors.push(`${where} malformed mailto: ${href}`);
    if (/(^|\/)drafts\//.test(href)) errors.push(`${where} links to internal drafts`);
    if (href.startsWith("#") && !ids.includes(href.slice(1))) errors.push(`${where} anchor ${href} has no matching id`);
    if (href.startsWith("/#")) {
      const home = await readFile(join(dist, "index.html"), "utf8");
      if (!home.includes(`id="${href.slice(2)}"`)) errors.push(`${where} link ${href} points at a missing home-page section`);
    }
  }
  for (const m of live.matchAll(/\s(?:href|src)="(\/[^"#?]*)/g)) {
    const path = decodeURIComponent(m[1]);
    const target = path.endsWith("/") ? join(dist, path, "index.html") : join(dist, path);
    if (!(await exists(target))) errors.push(`${name}:${lineOf(html, m.index)} broken local reference → ${m[1]}`);
  }
}

// =====================================================================
// 3. Publication safety across every deployed file
// =====================================================================
for (const file of distFiles) {
  const name = rel(file);
  if (/(^|\/)(drafts|legacy|src|scripts|node_modules)\//.test(relative(dist, file).replaceAll("\\", "/"))) {
    errors.push(`${name}: internal folder copied into the deploy output`);
  }
  if (![".html", ".js", ".css", ".txt", ".xml", ".json", ".svg", ""].includes(extname(file))) continue;
  const content = await readFile(file, "utf8");
  if (UNPUBLISHED.test(content)) errors.push(`${name}: contains the name of an unpublished draft project (RAPID/Evidencia)`);
  if (/\[VERIFY/.test(content)) errors.push(`${name}: contains [VERIFY placeholder text`);
  if (/portrait-placeholder/.test(content)) errors.push(`${name}: references the placeholder portrait`);
  for (const t of draftTitles) if (content.includes(t)) errors.push(`${name}: contains unpublished case-study draft "${t}"`);
  for (const m of content.matchAll(/YOUR-DOMAIN\.example/g)) pending.push(`${name}:${lineOf(content, m.index)}  placeholder domain (UNRESOLVED)`);
}

// =====================================================================
// 4. robots.txt + sitemap.xml consistent with the canonical URL and routes
// =====================================================================
if (homeCanonical) {
  const origin = new URL(homeCanonical).origin;
  if (!(await exists(join(dist, "robots.txt")))) errors.push("dist/robots.txt is missing");
  else {
    const robots = await readFile(join(dist, "robots.txt"), "utf8");
    const line = (robots.match(/^Sitemap:\s*(\S+)/m) || [])[1];
    if (!line || !onOrigin(line, origin) || new URL(line).pathname !== "/sitemap.xml") errors.push(`dist/robots.txt: Sitemap line should be ${origin}/sitemap.xml`);
    if (/^Disallow:\s*\/\s*$/m.test(robots)) errors.push("dist/robots.txt blocks the whole site");
  }
  if (!(await exists(join(dist, "sitemap.xml")))) errors.push("dist/sitemap.xml is missing");
  else {
    const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const expected = routes.map((r) => `${site.siteUrl}${r.path}`);
    for (const e of expected) if (!locs.includes(e)) errors.push(`dist/sitemap.xml does not list ${e}`);
    for (const loc of locs) {
      if (!onOrigin(loc, origin)) errors.push(`dist/sitemap.xml: ${loc} is not on the canonical origin`);
      if (!expected.includes(loc)) errors.push(`dist/sitemap.xml lists ${loc}, which is not a public route`);
    }
    for (const m of sitemap.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) {
      if (!isDate(m[1])) errors.push(`dist/sitemap.xml: invalid <lastmod> ${m[1]}`);
      else if (!notFuture(m[1])) errors.push(`dist/sitemap.xml: <lastmod> ${m[1]} is in the future`);
    }
  }
} else {
  errors.push("dist/index.html: no canonical URL found");
}
for (const f of ["og-image.png", "favicon.svg", "404.html"]) if (!(await exists(join(dist, f)))) errors.push(`dist/${f} is missing`);

// =====================================================================
// Report
// =====================================================================
if (errors.length) {
  console.log(`\n✗ ${errors.length} problem(s):`);
  errors.forEach((e) => console.log("  - " + e));
} else {
  console.log(`\n✓ dist/ passed: structure, SEO, structured data, links, accessibility basics and publication safety.`);
  console.log(`  (${routes.length} page(s); ${caseStudies.length} published case stud${caseStudies.length === 1 ? "y" : "ies"}; ${projects.length} published project(s); ${hotspots.length} evidence hotspots)`);
}
if (pending.length) {
  console.log(`\n! ${pending.length} unresolved item(s) block publishing:`);
  pending.forEach((p) => console.log("  - " + p));
} else {
  console.log("\n✓ No unresolved placeholders.");
}
console.log("");
process.exit(errors.length || (strict && pending.length) ? 1 : 0);
