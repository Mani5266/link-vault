"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { cn } from "@/lib/utils";
import type { Link, DuplicateGroup } from "@linkvault/shared";

// ============================================================
// Duplicates Page
// Scan for near-duplicate links, review groups, merge or delete.
// Editorial design: uppercase labels, hairline separators, warm tones.
// ============================================================

interface DuplicatesApiResponse {
  success: boolean;
  data: {
    groups: DuplicateGroup[];
    total_groups: number;
    total_duplicates: number;
  };
}

interface MergeApiResponse {
  success: boolean;
  data: { merged: number };
  message?: string;
}

export default function DuplicatesPage() {
  const { accessToken } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch duplicates
  const scan = useCallback(async () => {
    if (!accessToken) return;
    try {
      setIsScanning(true);
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get<DuplicatesApiResponse>(
        "/duplicates",
        accessToken
      );
      setGroups(res.data.groups);
    } catch (err: any) {
      setError(err.message || "Failed to scan for duplicates");
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  }, [accessToken]);

  useEffect(() => {
    scan();
  }, [scan]);

  const totalDuplicates = groups.reduce((sum, g) => sum + g.links.length, 0);

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-paper-faint mb-1">Manage</p>
            <h1 className="font-display text-display-sm font-bold text-paper">
              Duplicates
            </h1>
            {!isLoading && groups.length > 0 && (
              <p className="text-paper-dim text-sm mt-1 font-body">
                {groups.length} group{groups.length === 1 ? "" : "s"} with{" "}
                {totalDuplicates} total link
                {totalDuplicates === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <button
            onClick={scan}
            disabled={isScanning}
            className="btn-ghost !py-2 !px-4 !text-xs"
          >
            <svg
              className={cn("w-3.5 h-3.5", isScanning && "animate-spin")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.016 4.356v4.992"
              />
            </svg>
            {isScanning ? "Scanning..." : "Rescan"}
          </button>
        </div>

        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-5 bg-ink-100 animate-pulse"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <div className="h-4 bg-ink-200 w-48 mb-4" style={{ borderRadius: "var(--radius-sm)" }} />
              <div className="space-y-2">
                <div className="h-16 bg-ink-200" style={{ borderRadius: "var(--radius-sm)" }} />
                <div className="h-16 bg-ink-200" style={{ borderRadius: "var(--radius-sm)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div
          className="p-6 border border-danger/30 bg-danger-subtle text-center"
          style={{ borderRadius: "var(--radius-md)" }}
        >
          <p className="text-danger text-sm font-body">{error}</p>
          <button onClick={scan} className="mt-3 btn-ghost !text-xs">
            Try again
          </button>
        </div>
      )}

      {/* No duplicates */}
      {!isLoading && !error && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 mb-4 bg-ink-200 flex items-center justify-center"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-display text-heading font-bold text-paper mb-2">
            No duplicates found
          </h3>
          <p className="text-paper-dim text-sm font-body max-w-sm">
            Your library is clean. We checked for links with matching URLs
            (ignoring protocol, www, and tracking parameters).
          </p>
        </div>
      )}

      {/* Duplicate groups */}
      {!isLoading && !error && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map((group, idx) => (
            <DuplicateGroupCard
              key={group.canonical_url}
              group={group}
              index={idx + 1}
              accessToken={accessToken}
              addToast={addToast}
              onMerged={() => {
                setGroups((prev) =>
                  prev.filter((g) => g.canonical_url !== group.canonical_url)
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DuplicateGroupCard — One group of near-duplicate links
// ============================================================

function DuplicateGroupCard({
  group,
  index,
  accessToken,
  addToast,
  onMerged,
}: {
  group: DuplicateGroup;
  index: number;
  accessToken: string | null;
  addToast: (message: string, type: "success" | "error" | "info") => void;
  onMerged: () => void;
}) {
  const [selectedKeepId, setSelectedKeepId] = useState<string>(
    group.links[0].id
  );
  const [isMerging, setIsMerging] = useState(false);

  const handleMerge = useCallback(async () => {
    if (!accessToken) return;

    const deleteIds = group.links
      .filter((l) => l.id !== selectedKeepId)
      .map((l) => l.id);

    if (deleteIds.length === 0) return;

    try {
      setIsMerging(true);
      const res = await apiClient.post<MergeApiResponse>(
        "/duplicates/merge",
        { keep_id: selectedKeepId, delete_ids: deleteIds },
        accessToken
      );
      addToast(
        res.message || `Merged ${deleteIds.length} duplicate(s)`,
        "success"
      );
      onMerged();
    } catch (err: any) {
      addToast(err.message || "Failed to merge duplicates", "error");
    } finally {
      setIsMerging(false);
    }
  }, [accessToken, group.links, selectedKeepId, addToast, onMerged]);

  return (
    <div
      className="border border-ink-300 bg-ink-50 overflow-hidden"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      {/* Group header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-ink-300 bg-ink-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 editorial-label text-paper-faint">
            Group {index}
          </span>
          <span className="text-xs text-paper-dim font-mono truncate">
            {group.canonical_url}
          </span>
        </div>
        <span className="shrink-0 px-2 py-0.5 text-micro font-medium bg-accent-subtle text-accent tabular-nums"
          style={{ borderRadius: "2px" }}
        >
          {group.links.length} links
        </span>
      </div>

      {/* Links in group */}
      <div className="divide-y divide-ink-300">
        {group.links.map((link) => (
          <DuplicateLinkRow
            key={link.id}
            link={link}
            isSelected={selectedKeepId === link.id}
            onSelect={() => setSelectedKeepId(link.id)}
          />
        ))}
      </div>

      {/* Merge action */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-ink-300 bg-ink-100">
        <p className="text-xs text-paper-dim font-body">
          Keep the selected link, merge tags &amp; metadata, delete the rest.
        </p>
        <button
          onClick={handleMerge}
          disabled={isMerging}
          className="btn-primary !py-2 !px-4 !text-xs shrink-0 disabled:opacity-50"
        >
          {isMerging ? "Merging..." : `Merge (delete ${group.links.length - 1})`}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DuplicateLinkRow — Single link inside a duplicate group
// ============================================================

function DuplicateLinkRow({
  link,
  isSelected,
  onSelect,
}: {
  link: Link;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const createdDate = new Date(link.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <label
      className={cn(
        "flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors",
        isSelected
          ? "bg-accent/5 border-l-2 border-accent pl-[18px]"
          : "hover:bg-ink-100"
      )}
    >
      {/* Radio button */}
      <div className="shrink-0 mt-1">
        <div
          className={cn(
            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected
              ? "border-accent"
              : "border-ink-500 hover:border-paper-dim"
          )}
        >
          {isSelected && (
            <div className="w-2 h-2 rounded-full bg-accent" />
          )}
        </div>
        <input
          type="radio"
          checked={isSelected}
          onChange={onSelect}
          className="sr-only"
        />
      </div>

      {/* Favicon */}
      <div className="shrink-0 mt-0.5">
        {link.favicon_url ? (
          <img
            src={link.favicon_url}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-4 h-4 bg-ink-300" style={{ borderRadius: "2px" }} />
        )}
      </div>

      {/* Link details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-paper font-body font-medium truncate">
          {link.title || link.url}
        </p>
        <p className="text-xs text-paper-dim font-mono truncate mt-0.5">
          {link.url}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {/* Domain */}
          {link.domain && (
            <span className="text-micro text-paper-faint">{link.domain}</span>
          )}
          {/* Date */}
          <span className="text-micro text-paper-faint">{createdDate}</span>
          {/* Tags */}
          {link.tags && link.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {link.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-micro bg-ink-200 text-paper-dim"
                  style={{ borderRadius: "2px" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {/* Category */}
          {link.category && (
            <span className="px-1.5 py-0.5 text-micro bg-accent-subtle text-accent"
              style={{ borderRadius: "2px" }}
            >
              {link.category}
            </span>
          )}
          {/* AI badge */}
          {link.ai_processed && (
            <span className="px-1.5 py-0.5 text-micro bg-gold/10 text-gold"
              style={{ borderRadius: "2px" }}
            >
              AI
            </span>
          )}
        </div>
      </div>

      {/* Keep badge */}
      {isSelected && (
        <span className="shrink-0 px-2 py-0.5 text-micro font-medium bg-accent text-white mt-1"
          style={{ borderRadius: "2px" }}
        >
          KEEP
        </span>
      )}
    </label>
  );
}
