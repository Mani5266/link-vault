"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm() {
  const { signInWithPassword, signInWithMagicLink } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      await signInWithPassword(email.trim(), password);
      router.push("/");
    } catch (err: any) {
      const msg = err.message || "Invalid email or password.";
      if (msg.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setError("Please verify your email address before signing in. Check your inbox for the confirmation link.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      await signInWithMagicLink(email.trim());
      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Magic link sent confirmation
  if (magicLinkSent) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 border border-accent/30 bg-accent-subtle flex items-center justify-center mx-auto mb-4" style={{ borderRadius: "var(--radius-sm)" }}>
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="font-display font-semibold text-heading text-paper mb-2">
          Check your email
        </h3>
        <p className="text-caption text-paper-muted mb-4">
          We sent a magic link to{" "}
          <span className="text-paper font-medium">{email}</span>.
          <br />
          Click the link in the email to sign in.
        </p>
        <button
          onClick={() => {
            setMagicLinkSent(false);
            setEmail("");
          }}
          className="text-accent hover:text-accent-hover text-caption font-medium transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  // Magic link form
  if (useMagicLink) {
    return (
      <form onSubmit={handleMagicLink} className="space-y-3">
        {error && (
          <div className="px-3.5 py-2.5 border border-danger/20 bg-danger-subtle text-danger text-caption" style={{ borderRadius: "var(--radius-sm)" }}>
            {error}
          </div>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          autoComplete="email"
          className="input-editorial"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Sending...
            </>
          ) : (
            "Send Magic Link"
          )}
        </button>

        <button
          type="button"
          onClick={() => { setUseMagicLink(false); setError(null); }}
          className="w-full text-caption text-paper-muted hover:text-paper transition-colors py-1"
        >
          Sign in with password instead
        </button>
      </form>
    );
  }

  // Email + password form (default)
  return (
    <form onSubmit={handlePasswordLogin} className="space-y-3">
      {error && (
        <div className="px-3.5 py-2.5 border border-danger/20 bg-danger-subtle text-danger text-caption" style={{ borderRadius: "var(--radius-sm)" }}>
          {error}
        </div>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        autoComplete="email"
        className="input-editorial"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        autoComplete="current-password"
        className="input-editorial"
      />

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-caption text-paper-muted hover:text-accent transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>

      <button
        type="button"
        onClick={() => { setUseMagicLink(true); setError(null); }}
        className="w-full text-caption text-paper-muted hover:text-paper transition-colors py-1"
      >
        Use magic link instead (passwordless)
      </button>
    </form>
  );
}

function LoadingSpinner() {
  return (
    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  );
}
