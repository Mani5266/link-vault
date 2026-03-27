"use client";

import { useRef, useEffect } from "react";
import type { Link, ReadingStatus } from "@linkvault/shared";
import { LinkCard } from "./LinkCard";
import { LinkCardSkeletonGroup } from "./LinkCardSkeleton";
import { EmptyState } from "./EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

// ============================================================
// LinkGrid — Editorial grid/list container
// Newspaper-column grid for cards, clean index for list
// Includes paginated "Load more" button
// ============================================================

interface LinkGridProps {
  links: Link[];
  viewMode: "grid" | "list";
  isLoading: boolean;
  /** Context label for empty state */
  emptyContext?: "all" | string;
  emptyEmoji?: string;
  /** If set, the empty state shows "no results" instead of "empty vault" */
  searchQuery?: string;
  selectedIds?: string[];
  isSelectionMode?: boolean;
  /** Keyboard navigation — index of the focused link (-1 = none) */
  focusedIndex?: number;
  /** Pagination */
  hasMore?: boolean;
  isLoadingMore?: boolean;
  total?: number;
  currentPage?: number;
  totalPages?: number;
  onLoadMore?: () => void;
  onPageChange?: (page: number) => void;
  onAddLink?: () => void;
  onEdit?: (link: Link) => void;
  onDelete?: (link: Link) => void;
  onTogglePin?: (link: Link) => void;
  onMoveToCollection?: (link: Link) => void;
  onReAnalyze?: (link: Link) => void;
  onToggleSelect?: (link: Link) => void;
  onToggleReadingStatus?: (link: Link, status: ReadingStatus | null) => void;
}

export function LinkGrid({
  links,
  viewMode,
  isLoading,
  emptyContext = "all",
  emptyEmoji,
  searchQuery,
  selectedIds = [],
  isSelectionMode = false,
  focusedIndex = -1,
  hasMore = false,
  isLoadingMore = false,
  total,
  currentPage = 1,
  totalPages = 1,
  onLoadMore,
  onPageChange,
  onAddLink,
  onEdit,
  onDelete,
  onTogglePin,
  onMoveToCollection,
  onReAnalyze,
  onToggleSelect,
  onToggleReadingStatus,
}: LinkGridProps) {
  // Auto-load-more sentinel — triggers loadMore when scrolled into view
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore]);

  if (isLoading) {
    return (
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "flex flex-col gap-2"
        )}
      >
        <LinkCardSkeletonGroup
          count={viewMode === "grid" ? 6 : 4}
          viewMode={viewMode}
        />
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <EmptyState
        context={emptyContext}
        emoji={emptyEmoji}
        searchQuery={searchQuery}
        onAddLink={onAddLink}
      />
    );
  }

  // Sort pinned links first
  const sorted = [...links].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  return (
    <div>
      <div
        className={cn(
          "animate-fade-in",
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "flex flex-col gap-2"
        )}
      >
        {sorted.map((link, index) => (
          <LinkCard
            key={link.id}
            link={link}
            viewMode={viewMode}
            isSelected={selectedIds.includes(link.id)}
            isSelectionMode={isSelectionMode}
            isFocused={index === focusedIndex}
            dataIndex={index}
            onEdit={onEdit}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onMoveToCollection={onMoveToCollection}
            onReAnalyze={onReAnalyze}
            onToggleSelect={onToggleSelect}
            onToggleReadingStatus={onToggleReadingStatus}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel — triggers auto-load when visible */}
      {hasMore && <div ref={sentinelRef} className="h-1" />}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-6">
          <svg className="w-5 h-5 text-paper-faint animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Pagination */}
      {total !== undefined && totalPages > 1 && onPageChange && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          itemCount={links.length}
          onPageChange={onPageChange}
        />
      )}

      {/* All loaded indicator (single page) */}
      {totalPages <= 1 && links.length > 0 && total !== undefined && total > 0 && links.length >= total && links.length > 20 && (
        <div className="mt-8">
          <div className="h-px bg-ink-300" />
          <p className="text-paper-faint text-caption font-body text-center pt-4">
            All {total} links loaded
          </p>
        </div>
      )}
    </div>
  );
}

// Small animated dots for loading state
function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="w-1 h-1 rounded-full bg-paper-dim animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="w-1 h-1 rounded-full bg-paper-dim animate-pulse" style={{ animationDelay: "150ms" }} />
      <span className="w-1 h-1 rounded-full bg-paper-dim animate-pulse" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
