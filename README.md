# Sujal Pandey — Forensic Science Portfolio

A cinematic, scroll-driven portfolio for **Sujal Pandey**, third-year B.Sc. Forensic Science student at Lovely
Professional University (LPU), India (expected graduation 2027), aspiring crime scene investigator.

One continuous journey: **investigation room → evidence table → physical-to-digital transformation → digital
lab → data trace → archive desk → contact**, rendered in WebGL with all readable content in normal HTML.

## Run it

Requires Node.js **20.19+** (tested with Node 24) and npm.

```bash
npm install          # once
npm run dev          # live editing → http://localhost:5173/
npm run build        # build + pre-render / and /archive/ (and /cases/<slug>/) into dist/
npm run preview      # serve dist/ → http://localhost:4173/
npm run check        # build, then test the built site + content (must pass)
npm run check:publish  # same, but also fails while anything is unresolved (must pass before deploying)
npm run set-domain -- https://real-url   # set the real public URL once known
```

> **Seeing the full motion:** the site follows your system's *reduce motion* setting. On Windows, turn on
> **Settings → Accessibility → Visual effects → Animation effects**, otherwise you get the calm version.

## Architecture

```
┌──────────────────────── fixed WebGL stage (src/journey/Stage.jsx, lazy-loaded) ───────────────────────┐
│ CameraRig · Room · Lab · Desk · Particles (one GPU system) · Dust                                      │
└────────────────────────── reads journey.current (smoothed) every frame ───────────────────────────────┘
┌──────────────── scrolling DOM chapters (src/journey/Chapters.jsx) — all text, links, controls ─────────┐
│ #top · #evidence · #transform · #lab · #trace · #archive · #contact   (each: tall section + sticky frame)│
└─────────── useJourney: scroll → journey.target (chapter units); writes --lp on every chapter ──────────┘
```

- **One timeline** (`src/journey/timeline.js`). Progress is measured in *chapter units* (`u = chapter + local
  progress`). Camera path (Catmull-Rom through keyframes), light/fog curves, particle phases and environment
  visibility are all pure functions of `u` — so scrolling forwards, backwards, fast, slow, refreshing or
  jumping via the nav always produces a valid frame.
- **Smoothing**: `journey.current` follows the scroll-derived `journey.target` with frame-rate-independent
  damping (cinematic inertia, coherent reversal). The DOM overlays read the *same* smoothed value through the
  CSS variable `--lp`, so typography stays locked to the camera.
- **The transformation** is one particle system (`scene/Particles.jsx`, custom shader). Every particle owns
  four positions — on the ridge card, scattered in the room, in the lab fingerprint, on the archive paper —
  and the shader blends them: scan → crimson points and square fragments lift off the card → spread as the
  room dissolves into fog → colour shifts to cyan as blue light rises → they assemble into the lab
  fingerprint → later stream as a thin trace (shared Bézier spine) onto the paper as blue ink lines.
- **Opening**: first visit per session the camera dollies in while the name pulls into focus (~3.4 s).
  "Skip intro" is the first focusable control; scrolling also cuts the dolly short. Never replays in the
  same session; never runs with reduced motion.
- **Evidence hotspots**: 3D-tracked dots (pointer enhancement) + an always-visible **Evidence index** of real
  buttons (keyboard/touch/screen-reader path). Panels close with Escape and return focus.
- **Lab**: Fingerprint (illustrative scan with honest status + annotations) and Device (fictional timeline
  that also updates the 3D phone screen). Every simulated element is labelled fictional/illustrative.
- **No blank screen**: original SVG posters (`src/journey/Poster.jsx`) show immediately and stay as the full
  experience in **calm mode** (reduced motion, no WebGL, or WebGL failure/context loss).
- **Supporting pages**: `/archive/` (searchable index, editorial standard, sources, academic record) and
  `/cases/<slug>/` (verified dossiers). All pre-rendered.
- **Performance**: three.js chunk (~250 kB gz) loads lazily after the page is readable. Low-power/touch
  devices get lower DPR, 2,400 particles (vs 5,200), fewer dust motes and no shadows. Every texture,
  geometry and material is disposed on unmount; no real-time post-processing.

### Code map

```
src/journey/       store.js · timeline.js · useJourney.js · Stage.jsx · Chapters.jsx · Poster.jsx
src/journey/scene/ CameraRig · Room · Lab · Desk · Particles · Dust · textures (procedural canvas art)
src/content/       site.js (facts) · journey.js (hotspots, lab text) · caseStudies.js (PUBLISHED only)
                   projects.js · sources.js (background reading) · taxonomy.js
src/pages/         Home · ArchivePage · CaseStudyPage · NotFound
src/styles/        base.css · journey.css · pages.css
scripts/           seo.mjs · prerender.mjs · check.mjs · set-domain.mjs · og-image.html
drafts/            INTERNAL, git-ignored, never imported: projects.md (RAPID, Evidencia), case-studies.md
```

### Dependencies added in this redesign

- **three 0.182.0** + **@react-three/fiber 9.8.1** — WebGL scene in React. R3F 9 supports React 19.0–19.3.
  three is pinned to 0.182 because 0.183+ logs a `THREE.Clock` deprecation warning from R3F's internals.
  No drei, no post-processing libraries.

## Adding a properly sourced case study

1. Draft in `drafts/case-studies.md` (template + suitability checklist). **Never** draft in
   `src/content/caseStudies.js` — it is bundled into public JavaScript.
2. When complete and verified, add it to `src/content/caseStudies.js` with `status: "published"`.
3. Images: original diagrams preferred, in `public/cases/<slug>/`, each with alt, caption, credit,
   **licence** and source URL.
4. `npm run check` validates the schema and ethics flags (no active cases, no graphic imagery, minimised
   victim details), reference numbering, licences and files; the build creates `/cases/<slug>/`, lists it in
   the archive chapter, `/archive/` and `sitemap.xml`.

## What `npm run check` verifies (on the built `dist/`)

- One `<h1>` per page; titles/descriptions; canonical = own route; Open Graph; pre-rendered content.
- JSON-LD: ProfilePage+Person (home), CollectionPage+Person (archive), Article+Person (cases); no job,
  credential, employer or award claims; `sameAs`/email match real links.
- Home: all confirmed facts and the five interests in crawlable text; all seven chapters present; honesty
  labels present in HTML ("no real case or evidence depicted", "illustrative props", "Fictional /
  illustrative data", "no real device was examined"); the device timeline labelled fictional; no canvas in
  the pre-rendered HTML; contact links present.
- Archive: "Dossiers in preparation" while empty; links to every published case and background source.
- Alt text, unique ids, ARIA references, anchors (incl. `/#chapter` from other pages), local files, https +
  `noopener` external links, mailto format.
- Every deployed file: no `RAPID`/`Evidencia`, `[VERIFY`, unpublished case titles or internal folders.
- `robots.txt` / `sitemap.xml` consistent with the canonical domain and the exact public routes.

## Remaining publication blockers and decisions

1. **Domain — BLOCKS PUBLISHING.** `siteUrl` is the placeholder `https://YOUR-DOMAIN.example`. When known:
   `npm run set-domain -- https://real-url` → `npm run check:publish` → deploy `dist/`.
2. **Case studies** — none yet (archive shows "Dossiers in preparation").
3. **RAPID and Evidencia** — unverified; kept in `drafts/projects.md` only.
4. **Portrait** — to be supplied later as a local asset; none used now (no generated faces).
5. **Wording review** — hotspot texts (`src/content/journey.js`), lab notes and the fictional timeline,
   captions, the contact line. "Third year" needs a yearly update.
6. **LinkedIn URL** — confirm manually (LinkedIn blocks automated checks).
7. **Achievements** — none beyond education.
8. **"References"** — implemented as *Sources* on `/archive/`; tell me if you meant professional referees.

## Asset licences

- All 3D geometry, textures (concrete, paper, ridge card, board notes, markers, phone screen, folders),
  particles and SVG posters are **original, procedurally generated** for this site. No photographs, no
  third-party images, no external URLs at runtime.
- Fonts (self-hosted, Fontsource): Instrument Serif, IBM Plex Sans/Mono — SIL Open Font License 1.1.
- Icons: Lucide (ISC). Libraries: React, Motion, Vite, three.js, React Three Fiber (all MIT).

## Deploy (only after `npm run check:publish` passes — nothing is purchased)

Deploy `dist/` only. Netlify / Cloudflare Pages: build `npm run build`, output `dist`. GitHub Pages: an
Actions workflow running `npm ci && npm run build` and uploading `dist/` (served from the domain root).

## Content rules

- Student and aspiring CSI — never a practising/certified CSI, police officer, lab professional or examiner.
- The five subjects are academic interests, not qualifications.
- Scenes, props and lab data are illustrative/fictional and labelled as such; no real evidence or cases.
- No graphic imagery, private case data, active cases or unlicensed images.
