import { aiActionMenu } from "../../lib/app-shell";

export function AiActionMenuShell() {
  return (
    <section className="overlay-shell">
      <div className="overlay-shell-header">
        <span className="section-chip">WEB-012</span>
        <h3>AI action menu shell</h3>
      </div>
      <p>
        Action slots are scaffolded here so later request flows can attach to a stable menu
        surface.
      </p>
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
