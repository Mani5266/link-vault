"use client";

import { cn } from "@/lib/utils";

// ============================================================
// LinkCardSkeleton — Editorial shimmer loading placeholders
// Uses shimmer-editorial class, sharp corners, warm tones
// ============================================================

interface LinkCardSkeletonProps {
  viewMode: "grid" | "list";
}

export function LinkCardSkeleton({ viewMode }: LinkCardSkeletonProps) {
  if (viewMode === "list") {
    return <ListRowSkeleton />;
  }
  return <GridCardSkeleton />;
}

function GridCardSkeleton() {
  return (
    <div
      className="flex flex-col border border-ink-300 bg-ink-50 animate-fade-in"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="w-4 h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
        <div className="w-20 h-3 shimmer-editorial" style={{ borderRadius: "2px" }} />
      </div>

      {/* Title */}
      <div className="px-4 pb-1.5 space-y-1.5">
        <div className="w-full h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
        <div className="w-2/3 h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
      </div>

      {/* Description */}
      <div className="px-4 pb-2 space-y-1">
        <div className="w-full h-3 shimmer-editorial" style={{ borderRadius: "2px" }} />
        <div className="w-4/5 h-3 shimmer-editorial" style={{ borderRadius: "2px" }} />
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-3 border-t border-ink-300/60 flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="w-14 h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
          <div className="w-10 h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
        </div>
        <div className="w-12 h-3 shimmer-editorial" style={{ borderRadius: "2px" }} />
      </div>
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border border-ink-300 bg-ink-50 animate-fade-in"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {/* Icon */}
      <div className="shrink-0 w-9 h-9 shimmer-editorial" style={{ borderRadius: "var(--radius-sm)" }} />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-40 h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
          <div className="w-20 h-3 shimmer-editorial" style={{ borderRadius: "2px" }} />
        </div>
        <div className="w-60 h-3 shimmer-editorial" style={{ borderRadius: "2px" }} />
        <div className="flex gap-1.5">
          <div className="w-10 h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
          <div className="w-14 h-4 shimmer-editorial" style={{ borderRadius: "2px" }} />
        </div>
      </div>

      {/* Date */}
      <div className="w-12 h-3 shimmer-editorial hidden md:block" style={{ borderRadius: "2px" }} />
    </div>
  );
}

/**
 * Render a group of skeleton cards for loading state.
 */
export function LinkCardSkeletonGroup({
  count = 6,
  viewMode,
}: {
  count?: number;
  viewMode: "grid" | "list";
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <LinkCardSkeleton key={i} viewMode={viewMode} />
      ))}
    </>
  );
}
