"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ApiResponse,
  LinkHealthResult,
  LinkHealthStatus,
} from "@linkvault/shared";

// ============================================================
// Link Health — On-demand scan for broken/dead links
// ============================================================

type FilterTab = "all" | LinkHealthStatus;

const STATUS_META: Record<
  LinkHealthStatus,
  { label: string; color: string; bgColor: string }
> = {
  healthy: {
    label: "Healthy",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  redirect: {
    label: "Redirect",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
  broken: {
    label: "Broken",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
  timeout: {
    label: "Timeout",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
  },
  error: {
    label: "Error",
    color: "text-red-300",
    bgColor: "bg-red-300/10",
  },
};

export default function LinkHealthPage() {
  const { accessToken } = useAuthStore();
  const toast = useToastStore.getState;

  const [results, setResults] = useState<LinkHealthResult[] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const handleScan = useCallback(async () => {
    if (!accessToken || isScanning) return;
    setIsScanning(true);
    setResults(null);
    setActiveTab("all");

    try {
      const response = await apiClient.post<ApiResponse<LinkHealthResult[]>>(
        "/link-health/scan",
        {},
        accessToken
      );
      if (response.success && response.data) {
        setResults(response.data);
        const broken = response.data.filter(
          (r) => r.status === "broken" || r.status === "error" || r.status === "timeout"
        ).length;
        if (broken > 0) {
          toast().addToast(
            `Found ${broken} problematic link${broken === 1 ? "" : "s"}`,
            "error"
          );
        } else {
          toast().addToast("All links are healthy", "success");
        }
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to scan links";
      toast().addToast(msg, "error");
    } finally {
      setIsScanning(false);
    }
  }, [accessToken, isScanning]);

  // Group counts
  const counts = useMemo(() => {
    if (!results) return null;
    const map: Record<LinkHealthStatus | "all", number> = {
      all: results.length,
      healthy: 0,
      redirect: 0,
      broken: 0,
      timeout: 0,
      error: 0,
    };
    for (const r of results) {
      map[r.status]++;
    }
    return map;
  }, [results]);

  // Filtered results
  const filtered = useMemo(() => {
    if (!results) return [];
    if (activeTab === "all") return results;
    return results.filter((r) => r.status === activeTab);
  }, [results, activeTab]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-paper-faint mb-1">Manage</p>
            <h1 className="font-display text-display-sm font-bold text-paper">
              Link Health
            </h1>
            <p className="text-paper-dim text-sm mt-1 font-body">
              Check your saved links for broken or dead URLs.
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className={cn(
              "btn-primary !py-2 !px-5 !text-xs",
              isScanning && "opacity-60 cursor-wait"
            )}
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <ScanSpinner />
                Scanning...
              </span>
            ) : (
              <>
                <ScanIcon />
                {results ? "Re-scan" : "Scan Links"}
              </>
            )}
          </button>
        </div>
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* No scan yet */}
      {!results && !isScanning && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 animate-fade-in">
          <div className="w-8 h-px bg-ink-400 mb-8" />
          <p className="editorial-label text-paper-faint mb-6">Health Check</p>
          <h2 className="font-display text-display-sm font-bold text-paper mb-3">
            Ready to scan
          </h2>
          <p className="text-sm text-paper-dim max-w-sm leading-relaxed">
            Click &quot;Scan Links&quot; to check all your saved links for broken URLs,
            redirects, and connectivity issues.
          </p>
          <div className="w-8 h-px bg-ink-400 mt-8" />
        </div>
      )}

      {/* Scanning in progress */}
      {isScanning && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 animate-fade-in">
          <ScanSpinnerLarge />
          <p className="text-paper-dim text-sm mt-6 font-body">
            Checking all your links... This may take a moment.
          </p>
        </div>
      )}

      {/* Results */}
      {results && !isScanning && (
        <div className="animate-fade-in">
          {/* Summary cards */}
          {counts && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <SummaryCard
                label="Total"
                count={counts.all}
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
              />
              {(
                Object.keys(STATUS_META) as LinkHealthStatus[]
              ).map((status) => (
                <SummaryCard
                  key={status}
                  label={STATUS_META[status].label}
                  count={counts[status]}
                  color={STATUS_META[status].color}
                  active={activeTab === status}
                  onClick={() => setActiveTab(status)}
                />
              ))}
            </div>
          )}

          {/* Results list */}
          {filtered.length === 0 ? (
            <p className="text-paper-dim text-sm text-center py-10">
              No links with this status.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((result) => (
                <HealthResultRow key={result.link_id} result={result} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Summary Card
// ============================================================

function SummaryCard({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border border-ink-300 bg-ink-50 px-4 py-3 text-left transition-all",
        active && "border-accent/40 ring-1 ring-accent/30",
        !active && "hover:border-ink-400"
      )}
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      <p className="editorial-label text-paper-faint mb-1">{label}</p>
      <p className={cn("font-display text-xl font-bold", color || "text-paper")}>
        {count}
      </p>
    </button>
  );
}

// ============================================================
// Health Result Row
// ============================================================

function HealthResultRow({ result }: { result: LinkHealthResult }) {
  const meta = STATUS_META[result.status];

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border border-ink-300 bg-ink-50 hover:border-ink-400 transition-all"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {/* Status badge */}
      <span
        className={cn(
          "shrink-0 inline-flex items-center px-2 py-0.5 text-micro font-medium uppercase tracking-editorial",
          meta.color,
          meta.bgColor
        )}
        style={{ borderRadius: "2px" }}
      >
        {meta.label}
        {result.http_code && (
          <span className="ml-1 opacity-70">{result.http_code}</span>
        )}
      </span>

      {/* Favicon + title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {result.favicon_url && (
          <img
            src={result.favicon_url}
            alt=""
            className="w-4 h-4 shrink-0 opacity-70"
            style={{ borderRadius: "2px" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-body font-medium text-paper hover:text-accent-hover transition-colors truncate block"
          >
            {result.title || result.domain || result.url}
          </a>
          <p className="text-micro text-paper-faint truncate">{result.url}</p>
        </div>
      </div>

      {/* Error message */}
      {result.error && (
        <span className="text-micro text-red-400 shrink-0 max-w-[200px] truncate hidden sm:block">
          {result.error}
        </span>
      )}

      {/* Response time */}
      <span className="text-micro text-paper-faint shrink-0 tabular-nums hidden md:block">
        {result.response_time_ms}ms
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
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ScanSpinner() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
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
