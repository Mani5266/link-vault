"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain a number.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await updatePassword(password);
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err.message || "Failed to update password.";
      if (msg.toLowerCase().includes("same password")) {
        setError("New password must be different from your current password.");
      } else if (msg.toLowerCase().includes("session")) {
        setError("Your reset link has expired. Please request a new one.");
      } else {
        setError(msg);
      }
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
              Set new password
            </p>
            <h1 className="font-display text-display font-bold text-paper">
              LinkVault
            </h1>
          </Link>
          <div className="w-12 h-px bg-accent mx-auto mt-4" />
        </div>

        {/* Card */}
        <div className="border border-ink-300 bg-ink-50 p-6 space-y-5" style={{ borderRadius: "var(--radius-lg)" }}>
          {isSuccess ? (
            <div className="text-center py-6">
              <div
                className="w-10 h-10 border border-success/30 bg-success-subtle flex items-center justify-center mx-auto mb-4"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-heading text-paper mb-2">
                Password updated
              </h3>
              <p className="text-caption text-paper-muted mb-5">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="btn-primary"
              >
                Sign in
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display font-semibold text-heading text-paper mb-1">
                  New password
                </h2>
                <p className="text-caption text-paper-muted">
                  Enter your new password below.
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  className="input-editorial"
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
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
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-caption text-paper-muted pt-2">
            <Link
              href="/login"
              className="text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
