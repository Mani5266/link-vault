"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function SignupForm() {
  const { signUpWithPassword, signInWithMagicLink } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMagicLink, setUseMagicLink] = useState(false);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain a number.";
    return null;
  };

  const handlePasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      await signUpWithPassword(email.trim(), password);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
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
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send sign-up link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 border border-success/30 bg-success-subtle flex items-center justify-center mx-auto mb-4" style={{ borderRadius: "var(--radius-sm)" }}>
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display font-semibold text-heading text-paper mb-2">
          Check your email
        </h3>
        <p className="text-caption text-paper-muted mb-4">
          We sent a {useMagicLink ? "sign-up link" : "confirmation email"} to{" "}
          <span className="text-paper font-medium">{email}</span>.
          <br />
          {useMagicLink
            ? "Click the link in the email to create your account."
            : "Click the link in the email to verify your account, then sign in."}
        </p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setEmail("");
            setPassword("");
            setConfirmPassword("");
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
          Sign up with password instead
        </button>
      </form>
    );
  }

  // Email + password form (default)
  return (
    <form onSubmit={handlePasswordSignup} className="space-y-3">
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
        placeholder="Create a password"
        required
        autoComplete="new-password"
        minLength={8}
        className="input-editorial"
      />

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
        autoComplete="new-password"
        minLength={8}
        className="input-editorial"
      />

      <p className="text-micro text-paper-faint px-0.5 uppercase tracking-editorial">
        Min 8 characters with uppercase, lowercase & number
      </p>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            Creating account...
          </>
        ) : (
          "Create Account"
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
