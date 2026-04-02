import { collaboratorPresence } from "../../lib/app-shell";

export function PresenceShell() {
  return (
    <section className="presence-shell">
      <div className="panel-heading">
        <span className="section-chip">WEB-009</span>
        <h3>Collaborator presence</h3>
      </div>
      <div className="presence-stack">
        {collaboratorPresence.map((collaborator) => (
          <article className="presence-card" key={collaborator.name}>
            <div className="presence-avatar" aria-hidden="true">
              {collaborator.initials}
            </div>
            <div>
              <strong>{collaborator.name}</strong>
              <p>{collaborator.status}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
