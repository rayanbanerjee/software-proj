import { AuthShellStates } from "../../../components/auth/auth-shell-states";
import { JwtLoginPanel } from "../../../components/auth/jwt-login-panel";

export default function AuthPage() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-004</span>
        <h2>JWT authentication</h2>
        <p>
          The app now issues its own JWT-backed session cookie from the API instead of relying on
          the old Google callback stub.
        </p>
      </section>

      <JwtLoginPanel />
      <AuthShellStates />
    </div>
  );
}
