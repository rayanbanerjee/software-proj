import type { VersionHistoryEntry } from "../../lib/version-history";

interface VersionHistoryShellProps {
  entries: readonly VersionHistoryEntry[];
}

export function VersionHistoryShell({ entries }: VersionHistoryShellProps) {
  return (
    <section className="panel-card">
      <div className="panel-heading">
        <span className="section-chip">WEB-010</span>
        <h3>Version history</h3>
      </div>
      <div className="timeline-stack">
        {entries.map((entry) => (
          <article className="timeline-entry" key={entry.key}>
            <strong>{entry.label}</strong>
            <p>{entry.summary}</p>
            <span>{entry.when}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
