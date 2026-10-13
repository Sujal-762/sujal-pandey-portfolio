// Shown by the dev server for unknown paths. In production, hosts serve public/404.html instead.
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="world world--archive notfound" data-world="archive">
      <div className="container">
        <p className="type-stamp">Error 404 · File not found</p>
        <h1 className="dossier__title">Page not found</h1>
        <p>This file doesn't exist, or the case study hasn't been published.</p>
        <p><a className="btn btn--ink" href="/">Back to the portfolio</a></p>
      </div>
    </main>
  );
}
