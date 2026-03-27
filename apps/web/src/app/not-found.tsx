import Link from "next/link";

// ============================================================
// Not Found — 404 page for unmatched routes
// ============================================================

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <div className="text-6xl mb-6">&#128683;</div>
      <h1 className="font-display text-4xl font-bold mb-3">404</h1>
      <h2 className="text-xl text-zinc-300 mb-2">Page not found</h2>
      <p className="text-zinc-500 max-w-md mb-8 text-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
      >
        Back to Dashboard
      </Link>
    </main>
  );
}
