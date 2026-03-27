"use client";

import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Editorial masthead */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block group">
            <p className="editorial-label text-paper-muted mb-3 tracking-[0.2em]">
              Welcome back to
            </p>
            <h1 className="font-display text-display font-bold text-paper">
              LinkVault
            </h1>
          </Link>
          <div className="w-12 h-px bg-accent mx-auto mt-4" />
        </div>

        {/* Auth card */}
        <div className="border border-ink-300 bg-ink-50 p-6 space-y-5" style={{ borderRadius: "var(--radius-lg)" }}>
          <LoginForm />

          <p className="text-center text-caption text-paper-muted pt-2">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
