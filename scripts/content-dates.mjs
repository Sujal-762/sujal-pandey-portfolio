// Genuine content-modification times for structured data (ProfilePage dateModified) and sitemap <lastmod>.
//
// Source of truth: git history — the author time of the most recent commit that touched the files making up
// that content, as an ISO 8601 date-time with its timezone offset (e.g. 2026-10-15T03:00:57+05:30).
// Never the build clock. When a trustworthy value cannot be determined, the result is null and the caller
// OMITS the optional property instead of emitting an inaccurate one:
//   - git is unavailable (e.g. building from a downloaded archive)
//   - the clone is shallow (truncated history would attribute every file to the newest commit)
//   - the content files have uncommitted or untracked changes (the last commit time would not describe them)
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Which files make up each piece of content. Keep these in step with what the page actually renders.
export const CONTENT_PATHS = {
  // ProfilePage dateModified: Google asks for changes to the profile information itself.
  profile: ["src/content/site.js", "src/content/record.js", "src/content/journey.js", "src/assets/portrait"],
  // Home page (sitemap): all of its text, images and content-bearing components.
  home: [
    "src/content", "src/assets", "src/pages/Home.jsx", "src/components",
    "src/journey/Chapters.jsx", "src/journey/Dossier.jsx", "src/journey/WallUI.jsx",
  ],
  // /archive/ (sitemap)
  archive: [
    "src/content/site.js", "src/content/caseStudies.js", "src/content/projects.js", "src/content/sources.js",
    "src/content/taxonomy.js", "src/pages/ArchivePage.jsx", "src/components",
  ],
};

export const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const cache = new Map();
const notes = new Map();

// Cloudflare Pages builds from a shallow clone, so production builds had no history and omitted every date
// (observed on the live site after d63801b). There — and only there (CF_PAGES=1) — deepen the clone once from the
// public origin. If that fails, the rules above still apply: the dates are omitted, never guessed.
let deepened = false;
function ensureHistory() {
  if (deepened) return;
  deepened = true;
  if (process.env.CF_PAGES !== "1" || git(["rev-parse", "--is-shallow-repository"]) !== "true") return;
  try {
    execFileSync("git", ["fetch", "--unshallow", "--quiet", "origin"], { cwd: root, stdio: "ignore", timeout: 60000 });
  } catch {
    /* network or permission failure: stay shallow → dates omitted */
  }
}

/** Last genuine modification time of the given paths, or null (see the rules at the top of this file). */
export function contentDate(key) {
  if (cache.has(key)) return cache.get(key);
  const paths = CONTENT_PATHS[key];
  let value = null;
  ensureHistory();
  const shallow = git(["rev-parse", "--is-shallow-repository"]);
  if (shallow === null) notes.set(key, "git history unavailable");
  else if (shallow !== "false") notes.set(key, "shallow clone (incomplete history)");
  else {
    const dirty = git(["status", "--porcelain", "--", ...paths]);
    if (dirty === null) notes.set(key, "git status failed");
    else if (dirty !== "") notes.set(key, "uncommitted changes in its content files");
    else {
      const d = git(["log", "-1", "--format=%aI", "--", ...paths]);
      if (d && ISO_DATETIME.test(d) && !Number.isNaN(Date.parse(d))) value = d;
      else notes.set(key, "no commit found for its content files");
    }
  }
  cache.set(key, value);
  return value;
}

/**
 * When the content was first created: author time of the EARLIEST commit touching its files, or null.
 * Needs complete history (a shallow clone would make the oldest available commit look like the creation).
 */
const created = new Map();
export function contentCreated(key) {
  if (created.has(key)) return created.get(key);
  ensureHistory();
  let value = null;
  if (git(["rev-parse", "--is-shallow-repository"]) === "false") {
    const all = git(["log", "--format=%aI", "--", ...CONTENT_PATHS[key]]);
    const first = all ? all.split("\n").filter(Boolean).pop() : null;
    if (first && ISO_DATETIME.test(first) && !Number.isNaN(Date.parse(first))) value = first;
  }
  created.set(key, value);
  return value;
}

/** Human-readable account of each date used or omitted (printed in the build log). */
export function contentDateReport() {
  return Object.keys(CONTENT_PATHS).map((k) => {
    const v = contentDate(k);
    const c = contentCreated(k);
    return (v ? `${k}: modified ${v}` : `${k}: modified omitted — ${notes.get(k)}`) + (c ? `, created ${c}` : ", created omitted");
  });
}
