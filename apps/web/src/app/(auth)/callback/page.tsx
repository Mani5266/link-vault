"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fallback callback page — if the user lands here directly,
 * redirect them to the dashboard. The actual magic link callback
 * is handled by the /auth/callback route handler.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      router.replace("/");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-paper-muted text-caption">Completing sign in...</p>
      </div>
    </main>
  );
}
