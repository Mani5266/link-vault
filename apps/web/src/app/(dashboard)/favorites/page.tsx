"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useLinks } from "@/hooks/useLinks";
import { useAI } from "@/hooks/useAI";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUIStore } from "@/stores/uiStore";
import { useLinkStore } from "@/stores/linkStore";
import { LinkGrid } from "@/components/links/LinkGrid";
import { SortFilterBar } from "@/components/links/SortFilterBar";
import type { Link, LinkSortField, SortDirection, LinkCategory } from "@linkvault/shared";

// ============================================================
// Favorites — All pinned links across collections
// ============================================================

export default function FavoritesPage() {
  const {
    viewMode,
    setAddLinkModalOpen,
    setEditingLink,
    setDeletingLink,
    setMovingLink,
    searchQuery,
  } = useUIStore();
  const { toggleSelection } = useLinkStore();
  const { reAnalyze } = useAI();

  const {
    links,
    isLoading,
    isLoadingMore,
    togglePin,
    toggleReadingStatus,
    filters,
    setFilters,
    selectedIds,
    isSelectionMode,
    loadMore,
    goToPage,
    hasMore,
    total,
    totalPages,
    currentPage,
  } = useLinks();

  // Filter to pinned links only
  useEffect(() => {
    setFilters({ is_pinned: true, page: 1 });
  }, [setFilters]);

  const { focusedIndex } = useKeyboardShortcuts({
    links,
    onEdit: (id) => {
      const link = links.find((l) => l.id === id);
      if (link) setEditingLink(link as Link);
    },
    onDelete: (id) => {
      const link = links.find((l) => l.id === id);
      if (link) setDeletingLink(link as Link);
    },
    onTogglePin: (id) => {
      const link = links.find((l) => l.id === id);
      if (link) togglePin(link as Link);
    },
    onToggleSelect: (id) => toggleSelection(id),
  });

  const handleSortChange = useCallback(
    (sortBy: LinkSortField, sortDir: SortDirection) => {
      setFilters({ sort_by: sortBy, sort_dir: sortDir });
    },
    [setFilters]
  );

  const handleCategoryChange = useCallback(
    (category: LinkCategory | undefined) => {
      setFilters({ category, page: 1 });
    },
    [setFilters]
  );

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div>
          <p className="editorial-label text-paper-faint mb-1">Quick Access</p>
          <h1 className="font-display text-display-sm font-bold text-paper">
            Favorites
          </h1>
          <p className="text-paper-dim text-sm mt-1 font-body">
            {!isLoading && total > 0
              ? `${total} pinned link${total === 1 ? "" : "s"}`
              : null}
          </p>
        </div>
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Sort & Filter Bar */}
      {!isLoading && (links.length > 0 || filters.category) && (
        <div className="mb-5">
          <SortFilterBar
            sortBy={filters.sort_by || "created_at"}
            sortDir={filters.sort_dir || "desc"}
            category={filters.category}
            onSortChange={handleSortChange}
            onCategoryChange={handleCategoryChange}
            onPinnedChange={() => {}}
          />
        </div>
      )}

      <LinkGrid
        links={links}
        viewMode={viewMode}
        isLoading={isLoading}
        emptyContext="favorites"
        emptyEmoji="⭐"
        searchQuery={searchQuery || undefined}
        selectedIds={selectedIds}
        isSelectionMode={isSelectionMode}
        focusedIndex={focusedIndex}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        onLoadMore={loadMore}
        onPageChange={goToPage}
        onAddLink={() => setAddLinkModalOpen(true)}
        onEdit={setEditingLink}
        onDelete={setDeletingLink}
        onTogglePin={togglePin}
        onMoveToCollection={setMovingLink}
        onReAnalyze={reAnalyze}
        onToggleSelect={(link) => toggleSelection(link.id)}
        onToggleReadingStatus={toggleReadingStatus}
      />
    </div>
  );
}
