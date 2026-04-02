import { versionHistory } from "../../lib/app-shell";

export function VersionHistoryShell() {
  return (
    <section className="panel-card">
      <div className="panel-heading">
        <span className="section-chip">WEB-010</span>
        <h3>Version history</h3>
      </div>
      <div className="timeline-stack">
        {versionHistory.map((entry) => (
          <article className="timeline-entry" key={entry.label}>
            <strong>{entry.label}</strong>
            <p>{entry.summary}</p>
            <span>{entry.when}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
