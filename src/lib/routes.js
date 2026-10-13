// Tiny path router shared by the browser, the SSR entry and the pre-render script.
// Plain JavaScript (no JSX) so Node scripts can import it.
import { caseStudies } from "../content/caseStudies.js";

export const casePath = (slug) => `/cases/${slug}/`;

export function matchRoute(pathname = "/") {
  const path = pathname.replace(/index\.html$/, "");
  if (path === "/" || path === "") return { page: "home", path: "/" };
  if (/^\/archive\/?$/.test(path)) return { page: "archive", path: "/archive/" };
  const m = path.match(/^\/cases\/([a-z0-9-]+)\/?$/);
  if (m) {
    const caseStudy = caseStudies.find((c) => c.slug === m[1]);
    if (caseStudy) return { page: "case", path: casePath(caseStudy.slug), caseStudy };
  }
  return { page: "notfound", path };
}

/** Every route that is pre-rendered into dist/ and listed in sitemap.xml. */
export const publicRoutes = () => [
  { page: "home", path: "/" },
  { page: "archive", path: "/archive/" },
  ...caseStudies.map((c) => ({ page: "case", path: casePath(c.slug), caseStudy: c })),
];
