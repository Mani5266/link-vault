"use client";

// ============================================================
// Pagination — Editorial page-number controls
// ============================================================

import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  itemCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  itemCount,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page numbers to show: always show first, last, current, and neighbors
  const pages = buildPageNumbers(currentPage, totalPages);

  const start = (currentPage - 1) * 20 + 1;
  const end = Math.min(currentPage * 20, total);

  return (
    <div className="mt-8">
      <div className="h-px bg-ink-300" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 pb-2">
        {/* Item count */}
        <p className="text-paper-faint text-caption font-body">
          {start}&ndash;{end} of {total} links
        </p>

        {/* Page controls */}
        <div className="flex items-center gap-1">
          {/* Prev */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={cn(
              "p-1.5 transition-colors",
              currentPage <= 1
                ? "text-ink-500 cursor-not-allowed"
                : "text-paper-faint hover:text-paper"
            )}
            style={{ borderRadius: "var(--radius-sm)" }}
            aria-label="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Page numbers */}
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="px-1 text-paper-faint text-caption select-none">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={cn(
                  "min-w-[28px] h-7 px-1.5 text-xs font-medium transition-colors",
                  p === currentPage
                    ? "bg-accent text-white"
                    : "text-paper-muted hover:text-paper hover:bg-ink-200"
                )}
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={cn(
              "p-1.5 transition-colors",
              currentPage >= totalPages
                ? "text-ink-500 cursor-not-allowed"
                : "text-paper-faint hover:text-paper"
            )}
            style={{ borderRadius: "var(--radius-sm)" }}
            aria-label="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Build an array of page numbers to display, with "..." for gaps.
 * Always shows: first page, last page, current page, and 1 neighbor on each side.
 */
function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const neighbors = new Set<number>();

  // Always include first, last, and current +/- 1
  neighbors.add(1);
  neighbors.add(total);
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
    neighbors.add(i);
  }

  const sorted = Array.from(neighbors).sort((a, b) => a - b);

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      pages.push("...");
    }
    pages.push(sorted[i]);
  }

  return pages;
}
