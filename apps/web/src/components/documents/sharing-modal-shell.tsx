import { sharingRoles } from "../../lib/app-shell";

export function SharingModalShell() {
  return (
    <section className="overlay-shell">
      <div className="overlay-shell-header">
        <span className="section-chip">WEB-011</span>
        <h3>Sharing modal shell</h3>
      </div>
      <p>
        Previewing the permission surface without live invite APIs yet. This shell is intentionally
        static until the sharing backend tasks land.
      </p>
      <div className="overlay-list">
        {sharingRoles.map((role) => (
          <article className="overlay-option-card" key={role.role}>
            <strong>{role.role}</strong>
            <p>{role.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
