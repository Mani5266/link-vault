"use client";

import { useState, useCallback, useMemo } from "react";
import { useLinks } from "@/hooks/useLinks";
import { useAI } from "@/hooks/useAI";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUIStore } from "@/stores/uiStore";
import { useLinkStore } from "@/stores/linkStore";
import { LinkGrid } from "@/components/links/LinkGrid";
import { SortFilterBar } from "@/components/links/SortFilterBar";
import { BulkActionBar } from "@/components/links/BulkActionBar";
import { BulkMoveModal } from "@/components/links/BulkMoveModal";
import { NotesPanel } from "@/components/links/NotesPanel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { Link, LinkSortField, SortDirection, LinkCategory } from "@linkvault/shared";

// ============================================================
// Dashboard — All Links page
// Editorial typography, generous whitespace, warm accent
// ============================================================

export default function DashboardPage() {
  const {
    viewMode,
    setAddLinkModalOpen,
    setEditingLink,
    setDeletingLink,
    setMovingLink,
    searchQuery,
  } = useUIStore();
  const { links, isLoading, isLoadingMore, togglePin, toggleReadingStatus, filters, setFilters, bulkDelete, bulkMove, selectedIds, isSelectionMode, loadMore, goToPage, hasMore, total, totalPages, currentPage } = useLinks();
  const { reAnalyze } = useAI();
  const { toggleSelection } = useLinkStore();

  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [notesLink, setNotesLink] = useState<Link | null>(null);

  // Sort pinned first to match LinkGrid's display order
  const sortedLinks = useMemo(() => {
    return [...links].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });
  }, [links]);

  // Keyboard shortcuts
  const { focusedIndex } = useKeyboardShortcuts({
    links: sortedLinks,
    onEdit: (id) => {
      const link = sortedLinks.find((l) => l.id === id);
      if (link) setEditingLink(link as Link);
    },
    onDelete: (id) => {
      const link = sortedLinks.find((l) => l.id === id);
      if (link) setDeletingLink(link as Link);
    },
    onTogglePin: (id) => {
      const link = sortedLinks.find((l) => l.id === id);
      if (link) togglePin(link as Link);
    },
    onToggleSelect: (id) => toggleSelection(id),
  });

  const handleSortChange = useCallback((sortBy: LinkSortField, sortDir: SortDirection) => {
    setFilters({ sort_by: sortBy, sort_dir: sortDir });
  }, [setFilters]);

  const handleCategoryChange = useCallback((category: LinkCategory | undefined) => {
    setFilters({ category, page: 1 });
  }, [setFilters]);

  const handlePinnedChange = useCallback((pinned: boolean | undefined) => {
    setFilters({ is_pinned: pinned, page: 1 });
  }, [setFilters]);

  const handleBulkMove = useCallback((collectionId: string | null) => {
    bulkMove(selectedIds, collectionId);
    setIsBulkMoveOpen(false);
  }, [bulkMove, selectedIds]);

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-paper-faint mb-1">Index</p>
            <h1 className="font-display text-display-sm font-bold text-paper">All Links</h1>
            <p className="text-paper-dim text-sm mt-1 font-body">
              {!isLoading && total > 0
                ? `${total} link${total === 1 ? "" : "s"} saved`
                : null}
            </p>
          </div>
          <BulkActionBar
            linkIds={links.map((l) => l.id)}
            onBulkDelete={bulkDelete}
            onBulkMoveOpen={() => setIsBulkMoveOpen(true)}
          />
        </div>

        {/* Hairline separator */}
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Sort & Filter Bar */}
      {!isLoading && (links.length > 0 || filters.category || filters.is_pinned) && (
        <div className="mb-5">
          <SortFilterBar
            sortBy={filters.sort_by || "created_at"}
            sortDir={filters.sort_dir || "desc"}
            category={filters.category}
            isPinned={filters.is_pinned}
            onSortChange={handleSortChange}
            onCategoryChange={handleCategoryChange}
            onPinnedChange={handlePinnedChange}
          />
        </div>
      )}

      <ErrorBoundary compact>
        <LinkGrid
        links={links}
        viewMode={viewMode}
        isLoading={isLoading}
        emptyContext="all"
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
        onViewNotes={setNotesLink}
      />
      </ErrorBoundary>

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={isBulkMoveOpen}
        selectedCount={selectedIds.length}
        onMove={handleBulkMove}
        onClose={() => setIsBulkMoveOpen(false)}
      />

      {/* Notes Panel */}
      <NotesPanel
        linkId={notesLink?.id || ""}
        linkTitle={notesLink?.title || notesLink?.url || ""}
        isOpen={!!notesLink}
        onClose={() => setNotesLink(null)}
      />
    </div>
  );
}
