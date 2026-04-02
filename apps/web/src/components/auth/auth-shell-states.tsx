import { authShellStates } from "../../lib/app-shell";

export function AuthShellStates() {
  return (
    <section className="auth-shell-grid">
      {authShellStates.map((state) => (
        <article className="auth-shell-card" key={state.state}>
          <span className="auth-shell-kicker">{state.kicker}</span>
          <h2>{state.title}</h2>
          <p>{state.description}</p>
          <ul className="auth-shell-points">
            {state.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
