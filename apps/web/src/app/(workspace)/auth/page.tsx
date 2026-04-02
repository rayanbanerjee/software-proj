import { AuthShellStates } from "../../../components/auth/auth-shell-states";

export default function AuthPage() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-004</span>
        <h2>Authentication shell states</h2>
        <p>
          These states align with the new auth callback contract without pretending the rest of the
          auth stack already exists.
        </p>
      </section>

      <AuthShellStates />
    </div>
  );
}
