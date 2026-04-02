import type { AiPanelState } from "../../lib/ai-panel-state";
import { aiActionMenu } from "../../lib/app-shell";

interface AiActionMenuShellProps {
  panelState: AiPanelState;
}

export function AiActionMenuShell({ panelState }: AiActionMenuShellProps) {
  return (
    <section className="overlay-shell">
      <div className="overlay-shell-header">
        <span className="section-chip">WEB-012</span>
        <h3>AI action menu shell</h3>
      </div>
      <p>
        {panelState.summary}
      </p>
      <div className="overlay-caption">
        <strong>Status:</strong> {panelState.status} · {panelState.ctaLabel}
      </div>
      <div className="overlay-list">
        {aiActionMenu.map((item) => (
          <article className="overlay-option-card" key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
