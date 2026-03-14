"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getAuthValidationMessage, signUpSchema } from "@/features/auth/auth.schemas";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { validateInput } from "@/lib/validation";

const onboardingHighlights = [
  {
    title: "Structured onboarding",
    description: "New accounts move through confirmation, tenant assignment, and workspace routing without manual handoffs.",
  },
  {
    title: "Healthcare-ready hierarchy",
    description: "Organizations, facilities, departments, and scoped roles are prepared from the start.",
  },
  {
    title: "Secure foundation",
    description: "Authentication, role-aware navigation, and audit-friendly administration stay aligned.",
  },
];

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const values = validateInput(signUpSchema, { name, email, password });
      const supabase = getSupabaseBrowserClient();
      const emailRedirectTo = new URL("/auth/confirm", window.location.origin).toString();
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name },
          emailRedirectTo,
        },
      });

      if (error) {
        throw error;
      }

      setMessage("Check your email to confirm your account.");
      router.replace("/sign-in?message=Check%20your%20email%20to%20confirm%20your%20account.");
    } catch (submitError) {
      setError(getAuthValidationMessage(submitError, "Unable to create your account right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <section className="auth-showcase">
          <div className="auth-showcase__header">
            <span className="hero-badge">Workspace onboarding</span>
            <h1 className="auth-showcase__title">Set up a tenant-ready account with less friction and less noise.</h1>
            <p className="auth-showcase__copy">
              Register once, confirm your email, and move into tenant onboarding with the access model already aligned for a real SaaS
              platform.
            </p>
          </div>

          <div className="auth-highlight-grid">
            {onboardingHighlights.map((item) => (
              <article key={item.title} className="auth-highlight">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card__header">
            <span className="auth-card__eyebrow">Create account</span>
            <h2 className="auth-card__title">Request access</h2>
            <p className="auth-card__description">
              Use a work email so the platform can route you through tenant setup and administrator assignment.
            </p>
          </div>

          {error && <p className="form-message form-message--danger">{error}</p>}
          {message && <p className="form-message form-message--success">{message}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="name">
              <span className="field-label">Full name</span>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Taylor Rodgers"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label className="field" htmlFor="email">
              <span className="field-label">Work email</span>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@hospital.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field" htmlFor="password">
              <span className="field-label">Password</span>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button type="submit" className="button button-primary button-block" disabled={loading}>
              {loading ? "Creating account..." : "Continue"}
            </button>
          </form>

          <div className="auth-footer">
            <span className="subtle-link">
              Already registered? <Link href="/sign-in">Sign in</Link>
            </span>
            <span className="subtle-link">Confirmation email and onboarding redirect are handled automatically.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
