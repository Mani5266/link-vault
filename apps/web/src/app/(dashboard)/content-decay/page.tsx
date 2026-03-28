"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiResponse, PaginatedResponse } from "@linkvault/shared";

// ============================================================
// Content Decay — Staleness scoring & monitoring dashboard
// ============================================================

interface DecayScore {
  link_id: string;
  user_id: string;
  decay_score: number;
  age_days: number;
  decay_rate: string;
  scanned_at: string;
  link: {
    title: string | null;
    url: string;
    domain: string | null;
    category: string | null;
    created_at: string;
    reading_status: string | null;
    favicon_url: string | null;
    emoji: string | null;
  } | null;
}

interface DecaySummary {
  total: number;
  avg_score: number;
  fresh: number;
  aging: number;
  stale: number;
  by_rate: { fast: number; medium: number; slow: number };
  last_scan: string | null;
}

type FilterBucket = "all" | "fresh" | "aging" | "stale";

const BUCKET_META: Record<
  Exclude<FilterBucket, "all">,
  { label: string; color: string; bgColor: string; range: string }
> = {
  fresh: {
    label: "Fresh",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    range: "0–30",
  },
  aging: {
    label: "Aging",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    range: "31–60",
  },
  stale: {
    label: "Stale",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    range: "61–100",
  },
};

const RATE_META: Record<string, { label: string; color: string }> = {
  fast: { label: "Fast", color: "text-red-400" },
  medium: { label: "Medium", color: "text-yellow-400" },
  slow: { label: "Slow", color: "text-green-400" },
};

export default function ContentDecayPage() {
  const { accessToken } = useAuthStore();
  const toast = useToastStore.getState;

  const [summary, setSummary] = useState<DecaySummary | null>(null);
  const [scores, setScores] = useState<DecayScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeBucket, setActiveBucket] = useState<FilterBucket>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await apiClient.get<ApiResponse<DecaySummary>>(
        "/decay/summary",
        accessToken
      );
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch {
      // Silent — summary is supplementary
    }
  }, [accessToken]);

  // Fetch scores list
  const fetchScores = useCallback(
    async (p: number = 1, minScore: number = 0) => {
      if (!accessToken) return;
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
        });
        if (minScore > 0) params.set("min_score", String(minScore));
        const res = await apiClient.get<PaginatedResponse<DecayScore>>(
          `/decay?${params.toString()}`,
          accessToken
        );
        if (res.success) {
          setScores(res.data);
          setTotal(res.pagination.total);
        }
      } catch {
        toast().addToast("Failed to load decay scores", "error");
      }
    },
    [accessToken]
  );

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchScores(1)]);
      setLoading(false);
    };
    init();
  }, [fetchSummary, fetchScores]);

  // Re-fetch when page changes
  useEffect(() => {
    if (!loading) {
      const minScore =
        activeBucket === "aging" ? 31 : activeBucket === "stale" ? 61 : 0;
      fetchScores(page, minScore);
    }
  }, [page]);

  // Handle bucket filter change
  const handleBucketChange = useCallback(
    (bucket: FilterBucket) => {
      setActiveBucket(bucket);
      setPage(1);
      const minScore =
        bucket === "aging" ? 31 : bucket === "stale" ? 61 : 0;
      fetchScores(1, minScore);
    },
    [fetchScores]
  );

  // Filter client-side for fresh (0-30) since API only supports min_score
  const filteredScores = useMemo(() => {
    if (activeBucket === "fresh") {
      return scores.filter((s) => s.decay_score <= 30);
    }
    if (activeBucket === "aging") {
      return scores.filter((s) => s.decay_score <= 60);
    }
    return scores;
  }, [scores, activeBucket]);

  // Trigger scan
  const handleScan = useCallback(async () => {
    if (!accessToken || scanning) return;
    setScanning(true);
    try {
      const res = await apiClient.post<
        ApiResponse<{ queued?: boolean; scanned?: number }>
      >("/decay/scan", {}, accessToken);
      if (res.success) {
        if (res.data?.queued) {
          toast().addToast("Decay scan queued — results will appear shortly", "info");
          // Poll for results after a delay
          setTimeout(async () => {
            await Promise.all([fetchSummary(), fetchScores(1)]);
            setScanning(false);
          }, 5000);
          return;
        }
        toast().addToast(
          `Scanned ${res.data?.scanned || 0} links`,
          "success"
        );
        await Promise.all([fetchSummary(), fetchScores(1)]);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Scan failed";
      toast().addToast(msg, "error");
    } finally {
      setScanning(false);
    }
  }, [accessToken, scanning, fetchSummary, fetchScores]);

  const totalPages = Math.ceil(total / LIMIT);
  const hasNoData = !loading && summary?.total === 0;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-paper-faint mb-1">Manage</p>
            <h1 className="font-display text-display-sm font-bold text-paper">
              Content Decay
            </h1>
            <p className="text-paper-dim text-sm mt-1 font-body">
              Track link staleness and identify content that may need revisiting.
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className={cn(
              "btn-primary !py-2 !px-5 !text-xs inline-flex items-center gap-2",
              scanning && "opacity-60 cursor-wait"
            )}
          >
            {scanning ? (
              <>
                <ScanSpinner />
                Scanning...
              </>
            ) : (
              <>
                <ScanIcon />
                {summary?.total ? "Re-scan" : "Run Scan"}
              </>
            )}
          </button>
        </div>
        {summary?.last_scan && (
          <p className="text-micro text-paper-faint mt-2">
            Last scan: {new Date(summary.last_scan).toLocaleString()}
          </p>
        )}
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 animate-fade-in">
          <ScanSpinnerLarge />
          <p className="text-paper-dim text-sm mt-6 font-body">
            Loading decay data...
          </p>
        </div>
      )}

      {/* Empty state — no scan run yet */}
      {hasNoData && !scanning && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 animate-fade-in">
          <div className="w-8 h-px bg-ink-400 mb-8" />
          <p className="editorial-label text-paper-faint mb-6">
            Content Decay
          </p>
          <h2 className="font-display text-display-sm font-bold text-paper mb-3">
            No decay data yet
          </h2>
          <p className="text-sm text-paper-dim max-w-sm leading-relaxed">
            Click &quot;Run Scan&quot; to analyze the staleness of your saved links.
            Links are scored 0–100 based on age, category, and reading status.
          </p>
          <div className="w-8 h-px bg-ink-400 mt-8" />
        </div>
      )}

      {/* Dashboard */}
      {!loading && summary && summary.total > 0 && (
        <div className="animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {/* Total */}
            <button
              onClick={() => handleBucketChange("all")}
              className={cn(
                "border border-ink-300 bg-ink-50 px-4 py-3 text-left transition-all",
                activeBucket === "all"
                  ? "border-accent/40 ring-1 ring-accent/30"
                  : "hover:border-ink-400"
              )}
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <p className="editorial-label text-paper-faint mb-1">Total</p>
              <p className="font-display text-xl font-bold text-paper">
                {summary.total}
              </p>
              <p className="text-micro text-paper-faint mt-1">
                avg {summary.avg_score}
              </p>
            </button>

            {/* Fresh / Aging / Stale */}
            {(["fresh", "aging", "stale"] as const).map((bucket) => (
              <button
                key={bucket}
                onClick={() => handleBucketChange(bucket)}
                className={cn(
                  "border border-ink-300 bg-ink-50 px-4 py-3 text-left transition-all",
                  activeBucket === bucket
                    ? "border-accent/40 ring-1 ring-accent/30"
                    : "hover:border-ink-400"
                )}
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                <p className="editorial-label text-paper-faint mb-1">
                  {BUCKET_META[bucket].label}
                </p>
                <p
                  className={cn(
                    "font-display text-xl font-bold",
                    BUCKET_META[bucket].color
                  )}
                >
                  {summary[bucket]}
                </p>
                <p className="text-micro text-paper-faint mt-1">
                  score {BUCKET_META[bucket].range}
                </p>
              </button>
            ))}
          </div>

          {/* Decay Distribution Bar */}
          {summary.total > 0 && (
            <div
              className="border border-ink-300 bg-ink-50 p-4 mb-6"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <p className="editorial-label text-paper-faint mb-3">
                Distribution
              </p>
              <div
                className="flex h-3 overflow-hidden"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {summary.fresh > 0 && (
                  <div
                    className="bg-green-400/70 transition-all duration-500"
                    style={{
                      width: `${(summary.fresh / summary.total) * 100}%`,
                    }}
                    title={`Fresh: ${summary.fresh}`}
                  />
                )}
                {summary.aging > 0 && (
                  <div
                    className="bg-yellow-400/70 transition-all duration-500"
                    style={{
                      width: `${(summary.aging / summary.total) * 100}%`,
                    }}
                    title={`Aging: ${summary.aging}`}
                  />
                )}
                {summary.stale > 0 && (
                  <div
                    className="bg-red-400/70 transition-all duration-500"
                    style={{
                      width: `${(summary.stale / summary.total) * 100}%`,
                    }}
                    title={`Stale: ${summary.stale}`}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2.5">
                {(["fresh", "aging", "stale"] as const).map((b) => (
                  <div key={b} className="flex items-center gap-1.5">
                    <div
                      className={cn("w-2 h-2", {
                        "bg-green-400": b === "fresh",
                        "bg-yellow-400": b === "aging",
                        "bg-red-400": b === "stale",
                      })}
                      style={{ borderRadius: "1px" }}
                    />
                    <span className="text-micro text-paper-faint">
                      {BUCKET_META[b].label} ({summary[b]})
                    </span>
                  </div>
                ))}
              </div>

              {/* Decay Rate Breakdown */}
              <div className="mt-4 pt-3 border-t border-ink-300/50">
                <p className="editorial-label text-paper-faint mb-2">
                  Decay Rate
                </p>
                <div className="flex items-center gap-4">
                  {(["fast", "medium", "slow"] as const).map((rate) => (
                    <div key={rate} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-micro font-medium",
                          RATE_META[rate].color
                        )}
                      >
                        {RATE_META[rate].label}
                      </span>
                      <span className="text-micro text-paper-faint">
                        {summary.by_rate[rate]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scores List */}
          {filteredScores.length === 0 ? (
            <p className="text-paper-dim text-sm text-center py-10">
              No links in this category.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredScores.map((score) => (
                <DecayRow key={score.link_id} score={score} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && activeBucket === "all" && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs text-paper-muted border border-ink-300 hover:border-ink-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                Prev
              </button>
              <span className="text-micro text-paper-faint tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs text-paper-muted border border-ink-300 hover:border-ink-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

// ============================================================
// Decay Score Row
// ============================================================

function DecayRow({ score }: { score: DecayScore }) {
  const link = score.link;
  const bucket: "fresh" | "aging" | "stale" =
    score.decay_score <= 30
      ? "fresh"
      : score.decay_score <= 60
        ? "aging"
        : "stale";
  const meta = BUCKET_META[bucket];
  const rate = RATE_META[score.decay_rate] || RATE_META.medium;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border border-ink-300 bg-ink-50 hover:border-ink-400 transition-all"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {/* Score badge */}
      <div className="shrink-0 flex flex-col items-center w-12">
        <span
          className={cn(
            "text-sm font-display font-bold tabular-nums",
            meta.color
          )}
        >
          {score.decay_score}
        </span>
        <span className="text-micro text-paper-faint">{meta.label}</span>
      </div>

      {/* Score bar */}
      <div className="shrink-0 w-16 hidden sm:block">
        <div
          className="h-1.5 bg-ink-300 overflow-hidden"
          style={{ borderRadius: "1px" }}
        >
          <div
            className={cn("h-full transition-all duration-300", {
              "bg-green-400": bucket === "fresh",
              "bg-yellow-400": bucket === "aging",
              "bg-red-400": bucket === "stale",
            })}
            style={{ width: `${score.decay_score}%` }}
          />
        </div>
      </div>

      {/* Link info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {link?.favicon_url && (
          <img
            src={link.favicon_url}
            alt=""
            className="w-4 h-4 shrink-0 opacity-70"
            style={{ borderRadius: "2px" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {!link?.favicon_url && link?.emoji && (
          <span className="shrink-0 text-sm">{link.emoji}</span>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={link?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-body font-medium text-paper hover:text-accent-hover transition-colors truncate block"
          >
            {link?.title || link?.domain || link?.url || "Unknown"}
          </a>
          <div className="flex items-center gap-2 mt-0.5">
            {link?.domain && (
              <span className="text-micro text-paper-faint truncate">
                {link.domain}
              </span>
            )}
            {link?.category && (
              <span
                className="text-micro px-1.5 py-0.5 bg-ink-200 text-paper-muted"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {link.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Decay rate */}
      <span
        className={cn(
          "shrink-0 text-micro font-medium hidden md:block",
          rate.color
        )}
      >
        {rate.label} decay
      </span>

      {/* Age */}
      <span className="shrink-0 text-micro text-paper-faint tabular-nums hidden lg:block">
        {score.age_days}d old
      </span>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================

function ScanIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ScanSpinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ScanSpinnerLarge() {
  return (
    <svg
      className="w-10 h-10 animate-spin text-accent"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
