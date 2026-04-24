"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "sign-in" | "sign-up";

type AuthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

const contentByMode: Record<
  AuthMode,
  {
    submitLabel: string;
    successPrefix: string;
    title: string;
    description: string;
    helperText: string;
    alternateHref: string;
    alternateLabel: string;
    alternatePrompt: string;
    endpoint: string;
  }
> = {
  "sign-in": {
    submitLabel: "Sign in",
    successPrefix: "Signed in as",
    title: "Sign in with your local account",
    description: "Use an existing username and password to start a JWT-backed session.",
    helperText: "Need an account?",
    alternateHref: "/auth/sign-up",
    alternateLabel: "Create one",
    alternatePrompt: "Username does not exist. Create an account instead.",
    endpoint: "/v1/auth/login"
  },
  "sign-up": {
    submitLabel: "Create account",
    successPrefix: "Created account for",
    title: "Create a local account",
    description: "Choose a username and password to create an account and sign in immediately.",
    helperText: "Already have an account?",
    alternateHref: "/auth/sign-in",
    alternateLabel: "Sign in",
    alternatePrompt: "Username already exists.",
    endpoint: "/v1/auth/signup"
  }
};

export function LocalAuthPanel({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [form, setForm] = useState({ password: "", username: "" });
  const [state, setState] = useState<AuthState>({ kind: "idle" });
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000",
    []
  );
  const content = contentByMode[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}${content.endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          username: form.username,
          password: form.password
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: { code?: string; message?: string };
            session?: { user?: { name?: string | null } };
          }
        | null;

      if (!response.ok) {
        const defaultMessage = mode === "sign-in" ? "Sign-in failed." : "Sign-up failed.";
        const endpointMessage =
          mode === "sign-in" && payload?.error?.code === "AUTH_USER_NOT_FOUND"
            ? content.alternatePrompt
            : mode === "sign-up" && payload?.error?.code === "AUTH_USER_EXISTS"
              ? content.alternatePrompt
              : payload?.error?.message ?? defaultMessage;

        setState({
          kind: "error",
          message: endpointMessage
        });
        return;
      }

      const signedInName = payload?.session?.user?.name ?? form.username;

      setState({
        kind: "success",
        message: `${content.successPrefix} ${signedInName}.`
      });
      router.refresh();
      router.push("/documents");
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : mode === "sign-in" ? "Sign-in failed." : "Sign-up failed."
      });
    }
  }

  return (
    <section className="auth-login-panel">
      <div className="auth-login-copy">
        <span className="auth-shell-kicker">LOCAL ACCOUNT</span>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <form className="auth-login-form" onSubmit={handleSubmit}>
        <label className="auth-login-field">
          <span>Username</span>
          <input
            autoComplete="username"
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="Enter username"
            type="text"
            value={form.username}
          />
        </label>

        <label className="auth-login-field">
          <span>Password</span>
          <input
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Enter password"
            type="password"
            value={form.password}
          />
        </label>

        <div className="auth-login-actions">
          <button disabled={state.kind === "loading"} type="submit">
            {state.kind === "loading" ? "Working..." : content.submitLabel}
          </button>
        </div>

        <div className={`auth-login-status auth-login-status-${state.kind}`}>
          {state.kind === "idle" && (
            <p>
              {content.helperText}{" "}
              <Link className="auth-inline-link" href={content.alternateHref}>
                {content.alternateLabel}
              </Link>
            </p>
          )}
          {state.kind === "error" && (
            <p>
              {state.message}{" "}
              <Link className="auth-inline-link" href={content.alternateHref}>
                {content.alternateLabel}
              </Link>
            </p>
          )}
          {state.kind === "success" && <p>{state.message}</p>}
        </div>
      </form>
    </section>
  );
}
