import Link from "next/link";

export default function AuthPage() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-004</span>
        <h2>Choose how you want to access the workspace</h2>
        <p>
          Local auth now uses separate pages for creating an account and signing into an existing
          one. The account session is still issued by the API as a JWT-backed cookie.
        </p>
      </section>

      <section className="auth-route-grid">
        <article className="auth-shell-card auth-route-card">
          <span className="auth-shell-kicker">SIGN IN</span>
          <h2>Use an existing account</h2>
          <p>Open the dedicated sign-in page for returning users.</p>
          <div className="auth-route-actions">
            <Link className="auth-route-link" href="/auth/sign-in">
              Go to sign in
            </Link>
          </div>
        </article>

        <article className="auth-shell-card auth-route-card">
          <span className="auth-shell-kicker">SIGN UP</span>
          <h2>Create a new account</h2>
          <p>Open the dedicated sign-up page to create a local account first.</p>
          <div className="auth-route-actions">
            <Link className="auth-route-link" href="/auth/sign-up">
              Go to sign up
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
