import type { ExportPanelState } from "../../lib/export-panel-state";

interface ExportModalShellProps {
  panelState: ExportPanelState;
}

export function ExportModalShell({ panelState }: ExportModalShellProps) {
  return (
    <section className="overlay-shell">
      <div className="overlay-shell-header">
        <span className="section-chip">Export</span>
        <h3>Export file</h3>
      </div>
      <p>{panelState.summary}</p>
      {panelState.job ? (
        <div className="overlay-caption">
          <strong>Latest job:</strong> {panelState.job.format} · {panelState.job.status}
          {panelState.job.downloadUrl ? ` · ${panelState.job.downloadUrl}` : ""}
        </div>
      ) : null}
      <div className="overlay-list">
        {panelState.entries.map((item) => (
          <article className="overlay-option-card" key={item.format}>
            <strong>{item.format}</strong>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
