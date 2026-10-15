// Build-time SEO generation: per-route <head> tags, JSON-LD, robots.txt and sitemap.xml.
// All values come from src/content (confirmed facts and published case studies only).
// Dates are genuine content-modification times from git (scripts/content-dates.mjs) and are omitted —
// never guessed — when they cannot be determined reliably.
import { site, profile, contacts } from "../src/content/site.js";
import { disciplineLabel } from "../src/content/taxonomy.js";
import { contentDate } from "./content-dates.mjs";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const abs = (path) => `${site.siteUrl}${path}`;
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
          name: "Case Archive – Sujal Pandey",
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
        // Optional: only a genuine ISO 8601 date-time with offset, otherwise left out.
        ...(contentDate("profile") && { dateModified: contentDate("profile") }),
        mainEntity: { "@id": personId() },
      },
      personNode(opts),
    ],
  };
}

export function routeMeta(route) {
  if (route.page === "archive") {
    return {
      title: "Case Archive – Sujal Pandey, Forensic Science Student",
      description: "Archive of verified public case studies and academic work by Sujal Pandey, B.Sc. Forensic Science student at LPU, with sources and editorial standards.",
      ogType: "website",
    };
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
