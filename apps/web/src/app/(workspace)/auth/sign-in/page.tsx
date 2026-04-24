import Link from "next/link";

import { LocalAuthPanel } from "../../../../components/auth/local-auth-panel";

export default function SignInPage() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">AUTH</span>
        <h2>Sign in</h2>
        <p>
          Use your existing local username and password to enter the workspace, or{" "}
          <Link className="auth-inline-link" href="/auth/sign-up">
            create a new account
          </Link>
          .
        </p>
      </section>

      <LocalAuthPanel mode="sign-in" />
    </div>
  );
}
