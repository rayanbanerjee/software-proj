"use client";

import { useMemo, useState, type FormEvent } from "react";

type LoginState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

const defaultForm = {
  email: "owner@example.com",
  imageUrl: "",
  name: "Owner Demo"
};

export function JwtLoginPanel() {
  const [form, setForm] = useState(defaultForm);
  const [state, setState] = useState<LoginState>({ kind: "idle" });

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000",
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/v1/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          imageUrl: form.imageUrl.trim() || null,
          name: form.name.trim() || null
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string }; session?: { user?: { email?: string } } }
        | null;

      if (!response.ok) {
        setState({
          kind: "error",
          message: payload?.error?.message ?? "JWT login failed."
        });
        return;
      }

      setState({
        kind: "success",
        message: `Signed in as ${payload?.session?.user?.email ?? form.email}.`
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "JWT login failed."
      });
    }
  }

  return (
    <section className="auth-login-panel">
      <div className="auth-login-copy">
        <span className="auth-shell-kicker">JWT AUTH</span>
        <h2>Sign in with a JWT-backed session</h2>
        <p>
          This branch now issues app-owned JWT sessions directly instead of relying on the older
          Google callback stub.
        </p>
      </div>

      <form className="auth-login-form" onSubmit={handleSubmit}>
        <label className="auth-login-field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={form.email}
          />
        </label>

        <label className="auth-login-field">
          <span>Name</span>
          <input
            autoComplete="name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            type="text"
            value={form.name}
          />
        </label>

        <label className="auth-login-field">
          <span>Image URL</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
            placeholder="https://example.com/avatar.png"
            type="url"
            value={form.imageUrl}
          />
        </label>

        <div className="auth-login-actions">
          <button disabled={state.kind === "loading"} type="submit">
            {state.kind === "loading" ? "Signing in..." : "Issue JWT session"}
          </button>
        </div>

        <div className={`auth-login-status auth-login-status-${state.kind}`}>
          {state.kind === "idle" && <p>Submit the form to receive the signed session cookie.</p>}
          {state.kind === "error" && <p>{state.message}</p>}
          {state.kind === "success" && <p>{state.message}</p>}
        </div>
      </form>
    </section>
  );
}
