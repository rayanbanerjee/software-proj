import Link from "next/link";

import { LocalAuthPanel } from "../../../../components/auth/local-auth-panel";

export default function SignUpPage() {
  return (
    <div className="workspace-page-stack">
      <section className="page-intro-card">
        <span className="workspace-kicker">AUTH</span>
        <h2>Sign up</h2>
        <p>
          Create a local account to start using the workspace, or{" "}
          <Link className="auth-inline-link" href="/auth/sign-in">
            sign in instead
          </Link>
          .
        </p>
      </section>

      <LocalAuthPanel mode="sign-up" />
    </div>
  );
}
