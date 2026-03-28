"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useLinks } from "@/hooks/useLinks";
import { useAI } from "@/hooks/useAI";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUIStore } from "@/stores/uiStore";
import { useLinkStore } from "@/stores/linkStore";
import { LinkGrid } from "@/components/links/LinkGrid";
import type { Link, LinkSortField, SortDirection } from "@linkvault/shared";

// ============================================================
// Recent — Last saved links across all collections
// ============================================================

export default function RecentPage() {
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
    hasMore,
    total,
  } = useLinks();

  // Sort by newest first, limit to 30
  useEffect(() => {
    setFilters({ sort_by: "created_at", sort_dir: "desc", limit: 30, page: 1 });
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

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div>
          <p className="editorial-label text-paper-faint mb-1">Quick Access</p>
          <h1 className="font-display text-display-sm font-bold text-paper">
            Recent
          </h1>
          <p className="text-paper-dim text-sm mt-1 font-body">
            {!isLoading && total > 0
              ? `Your last ${Math.min(total, 30)} saved link${total === 1 ? "" : "s"}`
              : null}
          </p>
        </div>
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      <LinkGrid
        links={links}
        viewMode={viewMode}
        isLoading={isLoading}
        emptyContext="recent"
        emptyEmoji="🕐"
        searchQuery={searchQuery || undefined}
        selectedIds={selectedIds}
        isSelectionMode={isSelectionMode}
        focusedIndex={focusedIndex}
        hasMore={false}
        isLoadingMore={isLoadingMore}
        total={total}
        onLoadMore={loadMore}
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
