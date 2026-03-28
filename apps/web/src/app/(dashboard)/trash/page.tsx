"use client";

import { useState, useCallback, useEffect } from "react";
import { useLinks } from "@/hooks/useLinks";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { LinkGrid } from "@/components/links/LinkGrid";
import { apiClient } from "@/lib/api";
import type { Link, ApiResponse } from "@linkvault/shared";

// ============================================================
// Trash — Soft-deleted links with restore/permanent delete
// ============================================================

export default function TrashPage() {
  const { viewMode, searchQuery } = useUIStore();
  const { accessToken } = useAuthStore();
  const { addToast } = useToastStore();

  const {
    links,
    isLoading,
    isLoadingMore,
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
    refetch,
  } = useLinks();

  const [emptyingTrash, setEmptyingTrash] = useState(false);

  // Filter to deleted links only
  useEffect(() => {
    setFilters({ deleted: true, sort_by: "created_at", sort_dir: "desc", page: 1 });
  }, [setFilters]);

  const handleRestore = useCallback(
    async (link: Link) => {
      if (!accessToken) return;
      try {
        await apiClient.post<ApiResponse<null>>(
          `/links/${link.id}/restore`,
          {},
          accessToken
        );
        addToast("Link restored", "success");
        refetch();
      } catch {
        addToast("Failed to restore link", "error");
      }
    },
    [accessToken, addToast, refetch]
  );

  const handlePermanentDelete = useCallback(
    async (link: Link) => {
      if (!accessToken) return;
      try {
        await apiClient.delete<ApiResponse<null>>(
          `/links/${link.id}/permanent`,
          accessToken
        );
        addToast("Link permanently deleted", "success");
        refetch();
      } catch {
        addToast("Failed to delete link", "error");
      }
    },
    [accessToken, addToast, refetch]
  );

  const handleEmptyTrash = useCallback(async () => {
    if (!accessToken || emptyingTrash) return;
    setEmptyingTrash(true);
    try {
      await apiClient.delete<ApiResponse<null>>("/links/trash", accessToken);
      addToast("Trash emptied", "success");
      refetch();
    } catch {
      addToast("Failed to empty trash", "error");
    } finally {
      setEmptyingTrash(false);
    }
  }, [accessToken, emptyingTrash, addToast, refetch]);

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-paper-faint mb-1">Manage</p>
            <h1 className="font-display text-display-sm font-bold text-paper">
              Trash
            </h1>
            <p className="text-paper-dim text-sm mt-1 font-body">
              {!isLoading && total > 0
                ? `${total} deleted link${total === 1 ? "" : "s"} — auto-removed after 30 days`
                : null}
            </p>
          </div>
          {!isLoading && total > 0 && (
            <button
              onClick={handleEmptyTrash}
              disabled={emptyingTrash}
              className="px-4 py-2 text-xs font-body font-medium text-danger bg-danger-subtle hover:bg-danger/20 border border-danger/30 transition-all duration-200 shrink-0"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {emptyingTrash ? "Emptying..." : "Empty Trash"}
            </button>
          )}
        </div>
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Trash items — rendered as a simple list with restore/delete actions */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-ink-500 border-t-accent rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-fade-in-up">
          <div className="w-8 h-px bg-ink-400 mb-8" />
          <p className="editorial-label text-paper-faint mb-6">Trash</p>
          <span className="text-4xl mb-4">🗑️</span>
          <h2 className="font-display text-display-sm font-bold text-paper mb-3">
            Trash is empty
          </h2>
          <p className="text-sm text-paper-dim max-w-sm leading-relaxed">
            Deleted links will appear here for 30 days before being permanently removed.
          </p>
          <div className="w-8 h-px bg-ink-400 mt-8" />
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link, i) => (
            <div
              key={link.id}
              className="flex items-center gap-4 px-4 py-3 bg-ink-50 border border-ink-300 hover:border-ink-400 transition-all duration-200 animate-fade-in-up"
              style={{
                borderRadius: "var(--radius-sm)",
                animationDelay: `${i * 30}ms`,
                animationFillMode: "backwards",
              }}
            >
              {/* Favicon + info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-paper truncate">
                  {link.title || link.url}
                </p>
                <p className="text-xs text-paper-faint truncate mt-0.5">
                  {link.domain || link.url}
                  {link.deleted_at && (
                    <span className="ml-2 text-paper-faint">
                      — deleted {formatTimeAgo(link.deleted_at)}
                    </span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRestore(link as Link)}
                  className="px-3 py-1.5 text-xs font-body font-medium text-paper-muted hover:text-paper bg-ink-100 hover:bg-ink-200 border border-ink-300 transition-all duration-200"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  Restore
                </button>
                <button
                  onClick={() => handlePermanentDelete(link as Link)}
                  className="px-3 py-1.5 text-xs font-body font-medium text-danger hover:bg-danger-subtle border border-transparent hover:border-danger/30 transition-all duration-200"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  Delete Forever
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => goToPage((currentPage || 1) - 1)}
                disabled={!currentPage || currentPage <= 1}
                className="px-3 py-1.5 text-xs font-body text-paper-muted hover:text-paper bg-ink-100 border border-ink-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                Previous
              </button>
              <span className="text-xs text-paper-faint font-body">
                Page {currentPage || 1} of {totalPages}
              </span>
              <button
                onClick={() => goToPage((currentPage || 1) + 1)}
                disabled={!currentPage || currentPage >= totalPages}
                className="px-3 py-1.5 text-xs font-body text-paper-muted hover:text-paper bg-ink-100 border border-ink-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
