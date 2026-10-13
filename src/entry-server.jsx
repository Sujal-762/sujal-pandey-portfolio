import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";

// Used only at build time by scripts/prerender.mjs.
export function render(path) {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>
  );
}
