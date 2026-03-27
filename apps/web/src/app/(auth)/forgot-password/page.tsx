"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      await resetPassword(email.trim());
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Editorial masthead */}
        <div className="text-center mb-10">
          <Link href="/login" className="inline-block group">
            <p className="editorial-label text-paper-muted mb-3 tracking-[0.2em]">
              Account recovery
            </p>
            <h1 className="font-display text-display font-bold text-paper">
              LinkVault
            </h1>
          </Link>
          <div className="w-12 h-px bg-accent mx-auto mt-4" />
        </div>

        {/* Card */}
        <div className="border border-ink-300 bg-ink-50 p-6 space-y-5" style={{ borderRadius: "var(--radius-lg)" }}>
          {emailSent ? (
            <div className="text-center py-6">
              <div
                className="w-10 h-10 border border-accent/30 bg-accent-subtle flex items-center justify-center mx-auto mb-4"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-heading text-paper mb-2">
                Check your email
              </h3>
              <p className="text-caption text-paper-muted mb-4">
                We sent a password reset link to{" "}
                <span className="text-paper font-medium">{email}</span>.
                <br />
                Click the link in the email to reset your password.
              </p>
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="text-accent hover:text-accent-hover text-caption font-medium transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display font-semibold text-heading text-paper mb-1">
                  Reset password
                </h2>
                <p className="text-caption text-paper-muted">
                  Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div
                    className="px-3.5 py-2.5 border border-danger/20 bg-danger-subtle text-danger text-caption"
                    style={{ borderRadius: "var(--radius-sm)" }}
                  >
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
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-caption text-paper-muted pt-2">
            Remember your password?{" "}
            <Link
              href="/login"
              className="text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
