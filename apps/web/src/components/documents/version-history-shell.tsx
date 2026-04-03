import type { VersionHistoryEntry } from "../../lib/version-history";

interface VersionHistoryShellProps {
  entries: readonly VersionHistoryEntry[];
}

export function VersionHistoryShell({ entries }: VersionHistoryShellProps) {
  return (
    <section className="panel-card">
      <div className="panel-heading">
        <span className="section-chip">Timeline</span>
        <div className="panel-heading-copy">
          <h3>History</h3>
          <p>
            {entries.length > 0
              ? `${entries.length} recent checkpoints available for this file.`
              : "No live revisions available for this document yet."}
          </p>
        </div>
      </div>
      <div className="timeline-stack">
        {entries.length === 0 ? (
          <article className="timeline-entry">
            <strong>No revision history yet</strong>
            <p>The timeline will populate after the document creates or receives real revision snapshots.</p>
            <span>Waiting for live data</span>
          </article>
        ) : entries.map((entry) => (
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
