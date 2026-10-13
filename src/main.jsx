import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles/base.css";
import "./styles/journey.css";
import "./styles/pages.css";

import App from "./App.jsx";

const container = document.getElementById("root");
const app = (
  <StrictMode>
    <App path={window.location.pathname} />
  </StrictMode>
);

// Production HTML is pre-rendered (scripts/prerender.mjs) → hydrate it.
// The dev server serves an empty root → render from scratch.
if (container.firstElementChild) hydrateRoot(container, app);
else createRoot(container).render(app);
