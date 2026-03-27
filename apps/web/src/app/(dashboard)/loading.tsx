// ============================================================
// Dashboard Loading — Skeleton shown while dashboard routes load
// ============================================================

export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 w-40 bg-surface-100 rounded-lg mb-2" />
        <div className="h-4 w-24 bg-surface-100 rounded" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-28 bg-surface-100 rounded-lg" />
        <div className="h-8 w-32 bg-surface-100 rounded-lg" />
        <div className="h-8 w-20 bg-surface-100 rounded-lg" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-surface-50 p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-surface-100 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-3/4 bg-surface-100 rounded mb-2" />
                <div className="h-3 w-1/2 bg-surface-100 rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-surface-100 rounded mb-2" />
            <div className="h-3 w-2/3 bg-surface-100 rounded mb-4" />
            <div className="flex items-center gap-2">
              <div className="h-5 w-14 bg-surface-100 rounded-full" />
              <div className="h-5 w-16 bg-surface-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
