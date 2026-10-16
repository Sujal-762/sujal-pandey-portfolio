// Build-time SEO generation: per-route <head> tags, JSON-LD, robots.txt and sitemap.xml.
// All values come from src/content (confirmed facts and published case studies only).
// Dates are genuine content-modification times from git (scripts/content-dates.mjs) and are omitted —
// never guessed — when they cannot be determined reliably.
import { site, profile, contacts } from "../src/content/site.js";
import { disciplineLabel } from "../src/content/taxonomy.js";
import { contentDate, contentCreated } from "./content-dates.mjs";
import { caseStudies } from "../src/content/caseStudies.js";
import { projects } from "../src/content/projects.js";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const abs = (path) => `${site.siteUrl}${path}`;

// /archive/ describes what it actually holds, computed from the published content — so it never claims case
// studies or projects that don't exist, and stays accurate once they are published.
const ARCHIVE_NAME = "Archive – Sujal Pandey, Forensic Science Student";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function archiveDescription() {
  const held = [
    caseStudies.length && plural(caseStudies.length, "source-checked case study", "source-checked case studies"),
    projects.length && plural(projects.length, "academic project", "academic projects"),
  ].filter(Boolean);
  return held.length
    ? `${held.join(" and ")} by Sujal Pandey, forensic science student at LPU, with sources and the editorial standard.`
    : "Sujal Pandey’s archive: academic record, background sources and the editorial standard case studies and projects must meet before publication.";
}
const personId = () => `${site.siteUrl}/#person`;

/** opts.personImage: absolute URL of the deployed portrait, located and verified by prerender.mjs. */
function personNode({ personImage } = {}) {
  return {
    "@type": "Person",
    "@id": personId(),
    name: profile.name,
    givenName: profile.givenName,
    familyName: profile.familyName,
    url: `${site.siteUrl}/`,
    description: `Third-year ${profile.programme} student at ${profile.institution} (${profile.institutionShort}), ${profile.country}, expected to graduate in ${profile.expectedGraduation}, and aspiring crime scene investigator.`,
    email: `mailto:${contacts.email}`,
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: profile.institution,
      alternateName: profile.institutionShort,
      url: profile.institutionUrl,
    },
    sameAs: [contacts.linkedin.url, contacts.github.url],
    ...(personImage && { image: personImage }),
  };
}

export function jsonLd(route, opts = {}) {
  if (route.page === "archive") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${abs(route.path)}#webpage`,
          url: abs(route.path),
          name: ARCHIVE_NAME,
          inLanguage: site.lang,
          author: { "@id": personId() },
        },
        personNode(opts),
      ],
    };
  }
  if (route.page === "case") {
    const c = route.caseStudy;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": `${abs(route.path)}#article`,
          headline: c.title,
          description: c.summary,
          url: abs(route.path),
          inLanguage: site.lang,
          dateModified: c.verification.dateVerified,
          author: { "@id": personId() },
          about: c.disciplines.map(disciplineLabel),
          citation: c.references.map((r) => r.url),
        },
        personNode(opts),
      ],
    };
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${site.siteUrl}/#webpage`,
        url: `${site.siteUrl}/`,
        name: site.title,
        inLanguage: site.lang,
        isPartOf: { "@id": `${site.siteUrl}/#website` },
        // Optional: only genuine ISO 8601 date-times with offset (from git), otherwise left out.
        ...(contentCreated("profile") && { dateCreated: contentCreated("profile") }),
        ...(contentDate("profile") && { dateModified: contentDate("profile") }),
        mainEntity: { "@id": personId() },
      },
      personNode(opts),
      // Site name: Google uses WebSite structured data on the home page to choose the name shown in results.
      {
        "@type": "WebSite",
        "@id": `${site.siteUrl}/#website`,
        url: `${site.siteUrl}/`,
        name: profile.name,
        inLanguage: site.lang,
      },
    ],
  };
}

export function routeMeta(route) {
  if (route.page === "archive") {
    return { title: ARCHIVE_NAME, description: archiveDescription(), ogType: "website" };
  }
  if (route.page === "case") {
    const c = route.caseStudy;
    return {
      title: c.seoTitle ?? `${c.title} – Case study · Sujal Pandey`,
      description: c.summary,
      ogType: "article",
    };
  }
  return { title: site.title, description: site.description, ogDescription: site.ogDescription, ogType: "profile" };
}

export function headTags(route, opts = {}) {
  const meta = routeMeta(route);
  const url = abs(route.path);
  const image = abs(site.ogImage);
  const ld = JSON.stringify(jsonLd(route, opts), null, 2).replace(/</g, "\\u003c");
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}">`,
    `<meta name="author" content="${esc(profile.name)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="theme-color" content="${esc(site.themeColor)}">`,
    `<meta property="og:type" content="${meta.ogType}">`,
    `<meta property="og:site_name" content="${esc(profile.name)}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.ogDescription ?? meta.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(site.ogImageAlt)}">`,
    `<meta property="og:locale" content="${esc(site.locale)}">`,
  ];
  if (route.page === "home") {
    tags.push(
      `<meta property="profile:first_name" content="${esc(profile.givenName)}">`,
      `<meta property="profile:last_name" content="${esc(profile.familyName)}">`
    );
  }
  tags.push(`<meta name="twitter:card" content="summary_large_image">`, `<script type="application/ld+json">\n${ld}\n</script>`);
  return tags.join("\n    ");
}

export const robotsTxt = () => `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`;

/** Genuine last-modification time of a route's content, or null (then <lastmod> is omitted). */
function routeLastmod(r) {
  if (r.page === "case") return r.caseStudy.verification.dateVerified;
  return contentDate(r.page === "archive" ? "archive" : "home");
}

export const sitemapXml = (routes) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((r) => {
    const lastmod = routeLastmod(r);
    return `  <url>
    <loc>${esc(abs(r.path))}</loc>${lastmod ? `
    <lastmod>${esc(lastmod)}</lastmod>` : ""}
  </url>`;
  })
  .join("\n")}
</urlset>
`;
