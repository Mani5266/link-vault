"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { cn } from "@/lib/utils";
import type { TagWithCount } from "@linkvault/shared";

// ============================================================
// Tags Management Page
// View all tags, rename, merge, and delete tags across links.
// Editorial design: uppercase labels, hairline separators, warm tones.
// ============================================================

interface TagsApiResponse {
  success: boolean;
  data: TagWithCount[];
}

interface TagActionResponse {
  success: boolean;
  data: { affected: number };
  message?: string;
}

export default function TagsPage() {
  const { accessToken } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Action states
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [mergingTags, setMergingTags] = useState<Set<string>>(new Set());
  const [mergeTarget, setMergeTarget] = useState("");
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    if (!accessToken) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get<TagsApiResponse>("/tags", accessToken);
      setTags(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load tags");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Filtered tags
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  // Total links using tags
  const totalTagUsages = useMemo(
    () => tags.reduce((sum, t) => sum + t.count, 0),
    [tags]
  );

  // ── Rename ──
  const startRename = useCallback((tagName: string) => {
    setRenamingTag(tagName);
    setRenameValue(tagName);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingTag(null);
    setRenameValue("");
  }, []);

  const submitRename = useCallback(async () => {
    if (!accessToken || !renamingTag || !renameValue.trim()) return;
    if (renameValue.trim() === renamingTag) {
      cancelRename();
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiClient.patch<TagActionResponse>(
        "/tags/rename",
        { old_name: renamingTag, new_name: renameValue.trim() },
        accessToken
      );
      addToast(res.message || `Tag renamed`, "success");
      cancelRename();
      fetchTags();
    } catch (err: any) {
      addToast(err.message || "Failed to rename tag", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, renamingTag, renameValue, cancelRename, fetchTags, addToast]);

  // ── Delete ──
  const confirmDelete = useCallback(async (tagName: string) => {
    if (!accessToken) return;
    try {
      setIsSubmitting(true);
      const res = await apiClient.post<TagActionResponse>(
        "/tags/delete",
        { name: tagName },
        accessToken
      );
      addToast(res.message || `Tag deleted`, "success");
      setDeletingTag(null);
      fetchTags();
    } catch (err: any) {
      addToast(err.message || "Failed to delete tag", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, fetchTags, addToast]);

  // ── Merge ──
  const toggleMergeSelection = useCallback((tagName: string) => {
    setMergingTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagName)) {
        next.delete(tagName);
      } else {
        next.add(tagName);
      }
      return next;
    });
  }, []);

  const cancelMerge = useCallback(() => {
    setIsMergeMode(false);
    setMergingTags(new Set());
    setMergeTarget("");
  }, []);

  const submitMerge = useCallback(async () => {
    if (!accessToken || mergingTags.size === 0 || !mergeTarget.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await apiClient.post<TagActionResponse>(
        "/tags/merge",
        {
          source_tags: Array.from(mergingTags),
          target_tag: mergeTarget.trim(),
        },
        accessToken
      );
      addToast(res.message || `Tags merged`, "success");
      cancelMerge();
      fetchTags();
    } catch (err: any) {
      addToast(err.message || "Failed to merge tags", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, mergingTags, mergeTarget, cancelMerge, fetchTags, addToast]);

  // ── Render ──

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-paper-faint mb-1">Manage</p>
            <h1 className="font-display text-display-sm font-bold text-paper">
              Tags
            </h1>
            {!isLoading && tags.length > 0 && (
              <p className="text-paper-dim text-sm mt-1 font-body">
                {tags.length} tag{tags.length === 1 ? "" : "s"} across{" "}
                {totalTagUsages} usage{totalTagUsages === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {/* Merge mode toggle */}
          {tags.length > 1 && !isMergeMode && (
            <button
              onClick={() => setIsMergeMode(true)}
              className="btn-ghost !py-2 !px-4 !text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              Merge Tags
            </button>
          )}
        </div>

        {/* Hairline separator */}
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Merge mode bar */}
      {isMergeMode && (
        <div className="mb-5 p-4 border border-gold/30 bg-gold/5" style={{ borderRadius: "var(--radius-md)" }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              <span className="text-sm text-paper font-body">
                {mergingTags.size === 0
                  ? "Select tags to merge"
                  : `${mergingTags.size} tag${mergingTags.size === 1 ? "" : "s"} selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {mergingTags.size >= 2 && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Target tag name..."
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    className="input-editorial !py-1.5 !px-3 !text-xs w-40"
                    maxLength={30}
                  />
                  <button
                    onClick={submitMerge}
                    disabled={!mergeTarget.trim() || isSubmitting}
                    className="btn-primary !py-1.5 !px-3 !text-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Merging..." : "Merge"}
                  </button>
                </div>
              )}
              <button
                onClick={cancelMerge}
                className="btn-ghost !py-1.5 !px-3 !text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      {tags.length > 5 && (
        <div className="mb-5">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-paper-faint"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Filter tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-ink-50 border border-ink-300 text-sm text-paper placeholder:text-paper-faint transition-colors outline-none focus:border-accent"
              style={{ borderRadius: "var(--radius-sm)" }}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-ink-100 animate-pulse"
              style={{ borderRadius: "var(--radius-sm)" }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="p-6 border border-danger/30 bg-danger-subtle text-center" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="text-danger text-sm font-body">{error}</p>
          <button onClick={fetchTags} className="mt-3 btn-ghost !text-xs">
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 mb-4 bg-ink-200 flex items-center justify-center" style={{ borderRadius: "var(--radius-lg)" }}>
            <svg className="w-8 h-8 text-paper-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <h3 className="font-display text-heading font-bold text-paper mb-2">
            No tags yet
          </h3>
          <p className="text-paper-dim text-sm font-body max-w-sm">
            Tags are automatically created when AI analyzes your saved links, or you can add them manually when editing a link.
          </p>
        </div>
      )}

      {/* Tags list */}
      {!isLoading && !error && filteredTags.length > 0 && (
        <div className="space-y-1">
          {filteredTags.map((tag) => (
            <TagRow
              key={tag.name}
              tag={tag}
              isRenaming={renamingTag === tag.name}
              renameValue={renameValue}
              isDeleting={deletingTag === tag.name}
              isMergeMode={isMergeMode}
              isMergeSelected={mergingTags.has(tag.name)}
              isSubmitting={isSubmitting}
              onStartRename={() => startRename(tag.name)}
              onRenameChange={setRenameValue}
              onSubmitRename={submitRename}
              onCancelRename={cancelRename}
              onStartDelete={() => setDeletingTag(tag.name)}
              onConfirmDelete={() => confirmDelete(tag.name)}
              onCancelDelete={() => setDeletingTag(null)}
              onToggleMerge={() => toggleMergeSelection(tag.name)}
            />
          ))}
        </div>
      )}

      {/* No search results */}
      {!isLoading && !error && tags.length > 0 && filteredTags.length === 0 && searchQuery && (
        <div className="py-12 text-center">
          <p className="text-paper-dim text-sm font-body">
            No tags matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TagRow — Single tag row with actions
// ============================================================

function TagRow({
  tag,
  isRenaming,
  renameValue,
  isDeleting,
  isMergeMode,
  isMergeSelected,
  isSubmitting,
  onStartRename,
  onRenameChange,
  onSubmitRename,
  onCancelRename,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onToggleMerge,
}: {
  tag: TagWithCount;
  isRenaming: boolean;
  renameValue: string;
  isDeleting: boolean;
  isMergeMode: boolean;
  isMergeSelected: boolean;
  isSubmitting: boolean;
  onStartRename: () => void;
  onRenameChange: (value: string) => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  onStartDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onToggleMerge: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 border border-ink-300 bg-ink-50 hover:border-ink-400 transition-all duration-200",
        isMergeSelected && "border-gold/40 bg-gold/5 ring-1 ring-gold/20",
        isDeleting && "border-danger/30 bg-danger-subtle"
      )}
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {/* Merge checkbox */}
      {isMergeMode && (
        <button onClick={onToggleMerge} className="shrink-0">
          <div
            className={cn(
              "w-4.5 h-4.5 border flex items-center justify-center transition-colors",
              isMergeSelected
                ? "bg-gold border-gold"
                : "border-ink-500 hover:border-paper-dim"
            )}
            style={{ borderRadius: "2px" }}
          >
            {isMergeSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
      )}

      {/* Tag icon */}
      <div className="shrink-0 w-8 h-8 bg-accent-subtle flex items-center justify-center" style={{ borderRadius: "var(--radius-sm)" }}>
        <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      </div>

      {/* Tag name / rename input */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitRename();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              className="input-editorial !py-1 !px-2 !text-sm flex-1"
              maxLength={30}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelRename();
              }}
            />
            <button
              type="submit"
              disabled={!renameValue.trim() || isSubmitting}
              className="btn-primary !py-1 !px-2.5 !text-xs disabled:opacity-50"
            >
              {isSubmitting ? "..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancelRename}
              className="btn-ghost !py-1 !px-2.5 !text-xs"
            >
              Cancel
            </button>
          </form>
        ) : (
          <span className="text-sm text-paper font-body font-medium truncate block">
            {tag.name}
          </span>
        )}
      </div>

      {/* Count badge */}
      <span className="shrink-0 px-2 py-0.5 text-micro font-medium bg-ink-200 text-paper-dim tabular-nums"
        style={{ borderRadius: "2px" }}
      >
        {tag.count} link{tag.count === 1 ? "" : "s"}
      </span>

      {/* Actions */}
      {!isMergeMode && !isRenaming && !isDeleting && (
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onStartRename}
            className="p-1.5 text-paper-dim hover:text-paper-muted transition-colors"
            title="Rename tag"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button
            onClick={onStartDelete}
            className="p-1.5 text-paper-dim hover:text-danger transition-colors"
            title="Delete tag"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {isDeleting && (
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs text-danger font-body">Delete?</span>
          <button
            onClick={onConfirmDelete}
            disabled={isSubmitting}
            className="btn-danger !py-1 !px-2.5 !text-xs disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Yes"}
          </button>
          <button
            onClick={onCancelDelete}
            className="btn-ghost !py-1 !px-2.5 !text-xs"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
