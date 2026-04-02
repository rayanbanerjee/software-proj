export default function DocumentLoading() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-015</span>
        <h2>Loading document shell</h2>
        <p>Route-level loading state for document metadata and editor surface hydration.</p>
      </section>

      <section className="document-loading-shell" aria-busy="true">
        <div className="loading-line loading-line-wide" />
        <div className="loading-line" />
        <div className="loading-line" />
      </section>
    </div>
  );
}
