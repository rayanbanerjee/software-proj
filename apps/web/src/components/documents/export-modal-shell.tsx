import { exportOptions } from "../../lib/app-shell";

export function ExportModalShell() {
  return (
    <section className="overlay-shell">
      <div className="overlay-shell-header">
        <span className="section-chip">WEB-013</span>
        <h3>Export modal shell</h3>
      </div>
      <p>Queued export targets are represented here as shell options until worker-backed jobs land.</p>
      <div className="overlay-list">
        {exportOptions.map((item) => (
          <article className="overlay-option-card" key={item.format}>
            <strong>{item.format}</strong>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
