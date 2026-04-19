import { AuthShellStates } from "../../../components/auth/auth-shell-states";
import { JwtLoginPanel } from "../../../components/auth/jwt-login-panel";

export default function AuthPage() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-004</span>
        <h2>Local account sign-in</h2>
        <p>
          The app now issues its own JWT-backed session cookie from a local username and password
          flow instead of relying on the older Google callback stub.
        </p>
      </section>

      <JwtLoginPanel />
      <AuthShellStates />
    </div>
  );
}
