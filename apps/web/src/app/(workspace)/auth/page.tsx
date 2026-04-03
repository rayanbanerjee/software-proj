import { AuthShellStates } from "../../../components/auth/auth-shell-states";
import { GoogleSignInPanel } from "../../../components/auth/google-sign-in-panel";

export default function AuthPage() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-004</span>
        <h2>Authentication</h2>
        <p>
          Use Google sign-in to mint the API session cookie, then fall back to the shell states below for loading and signed-in UX previews.
        </p>
      </section>

      <GoogleSignInPanel />
      <AuthShellStates />
    </div>
  );
}
