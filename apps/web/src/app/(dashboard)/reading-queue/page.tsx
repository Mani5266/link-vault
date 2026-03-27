"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useLinks } from "@/hooks/useLinks";
import { useAI } from "@/hooks/useAI";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUIStore } from "@/stores/uiStore";
import { useLinkStore } from "@/stores/linkStore";
import { LinkGrid } from "@/components/links/LinkGrid";
import { SortFilterBar } from "@/components/links/SortFilterBar";
import type { Link, LinkSortField, SortDirection, LinkCategory } from "@linkvault/shared";

// ============================================================
// Reading Queue — Links marked as "to read"
// Two-tab layout: Unread | Read
// ============================================================

type Tab = "unread" | "read";

export default function ReadingQueuePage() {
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

  const [activeTab, setActiveTab] = useState<Tab>("unread");

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

  // Set reading_status filter based on active tab
  useEffect(() => {
    setFilters({ reading_status: activeTab, page: 1 });
  }, [activeTab, setFilters]);

  // Sort pinned first
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

  const handlePinnedChange = useCallback(
    (pinned: boolean | undefined) => {
      setFilters({ is_pinned: pinned, page: 1 });
    },
    [setFilters]
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div>
          <p className="editorial-label text-paper-faint mb-1">Manage</p>
          <h1 className="font-display text-display-sm font-bold text-paper">
            Reading Queue
          </h1>
          <p className="text-paper-dim text-sm mt-1 font-body">
            {!isLoading && total > 0
              ? `${total} ${activeTab === "unread" ? "unread" : "read"} link${total === 1 ? "" : "s"}`
              : null}
          </p>
        </div>

        {/* Hairline separator */}
        <div className="h-px bg-ink-300 mt-6" />

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-0">
          <TabButton
            label="Unread"
            active={activeTab === "unread"}
            onClick={() => setActiveTab("unread")}
          />
          <TabButton
            label="Read"
            active={activeTab === "read"}
            onClick={() => setActiveTab("read")}
          />
        </div>
      </div>

      {/* Sort & Filter Bar */}
      {!isLoading &&
        (links.length > 0 || filters.category || filters.is_pinned) && (
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

      <LinkGrid
        links={links}
        viewMode={viewMode}
        isLoading={isLoading}
        emptyContext={
          activeTab === "unread" ? "reading-queue-unread" : "reading-queue-read"
        }
        searchQuery={searchQuery || undefined}
        selectedIds={selectedIds}
        isSelectionMode={isSelectionMode}
        focusedIndex={focusedIndex}
        hasMore={hasMore}
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

// ============================================================
// Tab Button — Editorial underline style
// ============================================================

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-body font-medium transition-colors border-b-2 ${
        active
          ? "text-paper border-accent"
          : "text-paper-dim border-transparent hover:text-paper-muted hover:border-ink-400"
      }`}
    >
      {label}
    </button>
  );
}
