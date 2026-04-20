"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type LoginState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "create_prompt"; message: string }
  | { kind: "success"; message: string };

const defaultForm = {
  username: "owner",
  password: "dev-password"
};

export function JwtLoginPanel() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [state, setState] = useState<LoginState>({ kind: "idle" });

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000",
    []
  );

  async function submitLogin(createUserIfMissing = false) {
    const response = await fetch(`${apiBaseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        username: form.username,
        password: form.password,
        createUserIfMissing
      })
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: { code?: string; message?: string };
          outcome?: "authenticated" | "created";
          session?: { user?: { name?: string | null } };
        }
      | null;

    if (!response.ok) {
      if (payload?.error?.code === "AUTH_USER_NOT_FOUND") {
        setState({
          kind: "create_prompt",
          message: payload.error.message ?? "Username does not exist."
        });
        return;
      }

      setState({
        kind: "error",
        message: payload?.error?.message ?? "JWT login failed."
      });
      return;
    }

    const signedInName = payload?.session?.user?.name ?? form.username;
    const outcomePrefix = payload?.outcome === "created" ? "Created and signed in as" : "Signed in as";

    setState({
      kind: "success",
      message: `${outcomePrefix} ${signedInName}.`
    });
    router.refresh();
    router.push("/documents");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "loading" });

    try {
      await submitLogin();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "JWT login failed."
      });
    }
  }

  async function handleCreateUser() {
    setState({ kind: "loading" });

    try {
      await submitLogin(true);
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "User creation failed."
      });
    }
  }

  return (
    <section className="auth-login-panel">
      <div className="auth-login-copy">
        <span className="auth-shell-kicker">JWT AUTH</span>
        <h2>Sign in with username and password</h2>
        <p>
          Enter an existing username to sign in. If the username does not exist, the app will offer
          to create it with the same password.
        </p>
      </div>

      <form className="auth-login-form" onSubmit={handleSubmit}>
        <label className="auth-login-field">
          <span>Username</span>
          <input
            autoComplete="username"
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            type="text"
            value={form.username}
          />
        </label>

        <label className="auth-login-field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            type="password"
            value={form.password}
          />
        </label>

        <div className="auth-login-actions">
          <button disabled={state.kind === "loading"} type="submit">
            {state.kind === "loading" ? "Checking..." : "Sign in"}
          </button>
        </div>

        <div className={`auth-login-status auth-login-status-${state.kind}`}>
          {state.kind === "idle" && (
            <p>Enter a username and password. If the username is missing, you will be asked whether to create it.</p>
          )}
          {state.kind === "create_prompt" && (
            <div className="auth-create-prompt">
              <p>{state.message} Create a new user with this password?</p>
              <div className="auth-login-actions">
                <button onClick={handleCreateUser} type="button">
                  Create user
                </button>
              </div>
            </div>
          )}
          {state.kind === "error" && <p>{state.message}</p>}
          {state.kind === "success" && <p>{state.message}</p>}
        </div>
      </form>
    </section>
  );
}
