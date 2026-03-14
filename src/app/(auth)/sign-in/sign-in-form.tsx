"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getAuthValidationMessage, signInSchema } from "@/features/auth/auth.schemas";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { validateInput } from "@/lib/validation";

type SignInFormProps = {
  redirectTo: string;
  urlError: string | null;
  urlMessage: string | null;
  confirmed: boolean;
};

export function SignInForm({ redirectTo, urlError, urlMessage, confirmed }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credentials = validateInput(signInSchema, { email, password });
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        throw error;
      }

      void fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "sign_in",
          source: "sign_in_form",
        }),
      }).catch(() => null);

      router.replace(redirectTo);
      router.refresh();
    } catch (submitError) {
      setError(getAuthValidationMessage(submitError, "Unable to sign in with the provided credentials."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <section className="auth-showcase">
          <div className="auth-showcase__header">
            <span className="hero-badge">Secure workspace access</span>
            <h1 className="auth-showcase__title">Leadership analytics without the operational noise.</h1>
            <p className="auth-showcase__copy">
              Sign in to access tenant-scoped dashboards, operational alerts, reporting workflows, and the administrative control
              plane.
            </p>
          </div>

          <div className="auth-highlight-grid">
            <article className="auth-highlight">
              <h3>Tenant-aware access</h3>
              <p>Navigation, modules, and data visibility adapt to the active role assignment.</p>
            </article>
            <article className="auth-highlight">
              <h3>Protected sessions</h3>
              <p>Supabase-backed authentication and cookie-based server sessions keep the workspace consistent.</p>
            </article>
            <article className="auth-highlight">
              <h3>Operational continuity</h3>
              <p>Dashboards, reports, and admin workflows all resolve from a shared access model.</p>
            </article>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card__header">
            <span className="auth-card__eyebrow">Sign in</span>
            <h2 className="auth-card__title">Welcome back</h2>
            <p className="auth-card__description">Authenticate securely and continue into your assigned workspace.</p>
          </div>

          {urlMessage && <p className="form-message form-message--success">{urlMessage}</p>}
          {confirmed && <p className="form-message form-message--success">Your email has been confirmed. You can continue to your workspace.</p>}
          {urlError && <p className="form-message form-message--danger">{urlError}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="email">
              <span className="field-label">Email address</span>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="field" htmlFor="password">
              <span className="field-label">Password</span>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="**********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="button button-primary button-block" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </button>

            {error && <p className="form-message form-message--danger">{error}</p>}

            <p className="subtle-link">
              Need access? <Link href="/sign-up">Request an account</Link>
            </p>
          </form>

          <div className="auth-footer">
            <span className="subtle-link">
              No account yet? <Link href="/sign-up">Request access</Link>
            </span>
            <span className="subtle-link">Tenant routing and module access resolve after sign-in.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
