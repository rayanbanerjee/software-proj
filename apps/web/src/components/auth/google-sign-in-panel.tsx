"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type SignedInUser = {
  email: string;
  name: string | null;
};

type AuthStatus = "idle" | "loading" | "rendering" | "signed-in" | "error";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            callback: (response: { credential?: string }) => void;
            client_id: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              shape?: "pill" | "rectangular";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "continue_with" | "signup_with";
              theme?: "outline" | "filled_blue" | "filled_black";
              type?: "standard" | "icon";
              width?: string | number;
            }
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInPanelProps {
  apiBaseUrl?: string;
  clientId?: string;
}

export function GoogleSignInPanel({
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
}: GoogleSignInPanelProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [user, setUser] = useState<SignedInUser | null>(null);

  useEffect(() => {
    if (!clientId || !buttonRef.current || !isGoogleScriptLoaded || !window.google?.accounts.id) {
      return;
    }

    const handleCredential = async (response: { credential?: string }) => {
      if (!response.credential) {
        setStatus("error");
        setErrorMessage("Google did not return an ID token.");
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const result = await fetch(`${apiBaseUrl}/v1/auth/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            idToken: response.credential
          })
        });

        const payload = await result.json();

        if (!result.ok) {
          throw new Error(payload?.error?.message ?? "Google sign-in failed.");
        }

        setUser({
          email: payload.session.user.email,
          name: payload.session.user.name ?? null
        });
        setStatus("signed-in");
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Google sign-in failed.");
      }
    };

    setStatus((currentStatus) => (currentStatus === "signed-in" ? currentStatus : "rendering"));
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 280
    });
    setStatus((currentStatus) => (currentStatus === "signed-in" ? currentStatus : "idle"));
  }, [apiBaseUrl, clientId, isGoogleScriptLoaded]);

  return (
    <section className="auth-shell-card auth-live-card">
      <span className="auth-shell-kicker">Live auth</span>
      <h2>Sign in with Google</h2>
      <p>
        This exchanges a real Google ID token for the API session cookie used by the rest of the app.
      </p>
      {!clientId ? (
        <div className="auth-status-note auth-status-note-error">
          Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable the Google sign-in button.
        </div>
      ) : (
        <>
          <Script
            onLoad={() => {
              setIsGoogleScriptLoaded(true);
              setErrorMessage(null);
            }}
            onError={() => {
              setStatus("error");
              setErrorMessage("Google sign-in script failed to load.");
            }}
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
          />
          <div className="google-sign-in-slot" ref={buttonRef} />
        </>
      )}
      <div className="auth-status-note">
        <strong>Status:</strong>{" "}
        {status === "idle"
          ? "ready"
          : status === "loading"
            ? "exchanging token"
            : status === "rendering"
              ? "loading Google sign-in"
            : status === "signed-in"
              ? `signed in as ${user?.name ?? user?.email ?? "user"}`
              : "error"}
      </div>
      {errorMessage ? (
        <div className="auth-status-note auth-status-note-error">{errorMessage}</div>
      ) : null}
    </section>
  );
}
