"use client";

// ============================================================
// Dashboard Error Page — Next.js error boundary for dashboard routes
// Editorial design system styling
// ============================================================

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
      <div className="w-14 h-14 mb-5 flex items-center justify-center border border-danger/30 bg-danger-subtle" style={{ borderRadius: "var(--radius-md)" }}>
        <svg className="w-7 h-7 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="font-display text-display-sm text-paper mb-2">
        Something went wrong
      </h2>
      <p className="text-caption text-paper-muted max-w-md mb-2">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      {error.digest && (
        <p className="text-micro text-paper-faint mb-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="btn-primary !py-2 !px-5 !text-xs"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="btn-ghost !py-2 !px-5 !text-xs"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
