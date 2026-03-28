"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { apiClient, ApiError } from "@/lib/api";
import type { ApiResponse } from "@linkvault/shared";

// ============================================================
// Analytics Page — Usage statistics dashboard
// ============================================================

interface AnalyticsData {
  total_links: number;
  total_pinned: number;
  total_unread: number;
  categories: Record<string, number>;
  top_domains: Array<{ domain: string; count: number }>;
  top_tags: Array<{ tag: string; count: number }>;
  activity: Array<{ date: string; count: number }>;
  collections: Array<{ name: string; count: number }>;
}

export default function AnalyticsPage() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ApiResponse<AnalyticsData>>(
        "/analytics",
        accessToken
      );
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="mb-8">
          <div className="h-4 w-32 bg-ink-300 mb-2" style={{ borderRadius: "var(--radius-sm)" }} />
          <div className="h-7 w-48 bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-ink-300" style={{ borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-ink-300" style={{ borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-caption text-danger mb-4">{error}</p>
        <button onClick={fetchAnalytics} className="btn-primary !py-2 !px-5 !text-xs">
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.total_links === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="editorial-label text-paper-faint mb-1">Insights</p>
          <h1 className="font-display text-display-sm text-paper">Analytics</h1>
        </div>
        <div className="border border-ink-300 bg-ink-50 py-16 px-6 text-center" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="text-sm text-paper-muted mb-1">No data yet</p>
          <p className="text-xs text-paper-faint">Save some links to see your analytics</p>
        </div>
      </div>
    );
  }

  const maxActivity = Math.max(...data.activity.map((a) => a.count), 1);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="editorial-label text-paper-faint mb-1">Insights</p>
        <h1 className="font-display text-display-sm text-paper">Analytics</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Links" value={data.total_links} />
        <StatCard label="Pinned" value={data.total_pinned} />
        <StatCard label="Unread" value={data.total_unread} />
      </div>

      <div className="h-px bg-ink-300 mb-8" />

      {/* Activity Chart (last 30 days) */}
      <div className="mb-8">
        <p className="editorial-label text-paper-faint mb-4">Activity (last 30 days)</p>
        <div className="border border-ink-300 bg-ink-50 p-4" style={{ borderRadius: "var(--radius-md)" }}>
          <div className="flex items-end gap-px h-32">
            {data.activity.map((day) => {
              const height = day.count > 0 ? Math.max((day.count / maxActivity) * 100, 4) : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                >
                  <div
                    className={`w-full transition-colors ${day.count > 0 ? "bg-accent hover:bg-accent/80" : "bg-ink-200"}`}
                    style={{
                      height: `${height}%`,
                      minHeight: day.count > 0 ? "3px" : "1px",
                      borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                    }}
                  />
                  {/* Tooltip */}
                  {day.count > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                      <div className="bg-ink border border-ink-300 px-2 py-1 text-micro text-paper whitespace-nowrap" style={{ borderRadius: "var(--radius-sm)" }}>
                        {day.date}: {day.count}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-micro text-paper-faint">{data.activity[0]?.date.slice(5)}</span>
            <span className="text-micro text-paper-faint">{data.activity[data.activity.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* Two-column grid for breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Categories */}
        <div className="border border-ink-300 bg-ink-50 p-5" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="editorial-label text-paper-faint mb-4">Categories</p>
          <div className="space-y-2.5">
            {Object.entries(data.categories)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <BarRow
                  key={cat}
                  label={cat}
                  count={count}
                  total={data.total_links}
                />
              ))}
          </div>
        </div>

        {/* Collections */}
        <div className="border border-ink-300 bg-ink-50 p-5" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="editorial-label text-paper-faint mb-4">Collections</p>
          {data.collections.length > 0 ? (
            <div className="space-y-2.5">
              {data.collections.map((col) => (
                <BarRow
                  key={col.name}
                  label={col.name}
                  count={col.count}
                  total={data.total_links}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-paper-faint">No collections</p>
          )}
        </div>

        {/* Top Domains */}
        <div className="border border-ink-300 bg-ink-50 p-5" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="editorial-label text-paper-faint mb-4">Top Domains</p>
          <div className="space-y-2.5">
            {data.top_domains.map((d) => (
              <BarRow
                key={d.domain}
                label={d.domain}
                count={d.count}
                total={data.total_links}
              />
            ))}
            {data.top_domains.length === 0 && (
              <p className="text-xs text-paper-faint">No data</p>
            )}
          </div>
        </div>

        {/* Top Tags */}
        <div className="border border-ink-300 bg-ink-50 p-5" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="editorial-label text-paper-faint mb-4">Top Tags</p>
          {data.top_tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.top_tags.map((t) => (
                <span
                  key={t.tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-ink-300 text-paper-muted"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  {t.tag}
                  <span className="text-paper-faint">({t.count})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-paper-faint">No tags</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Stat Card — Large number with label
// ============================================================

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="border border-ink-300 bg-ink-50 px-5 py-4"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      <p className="text-micro text-paper-faint uppercase tracking-editorial mb-1">{label}</p>
      <p className="font-display text-display-sm text-paper">{value.toLocaleString()}</p>
    </div>
  );
}

// ============================================================
// Bar Row — Horizontal bar with label and count
// ============================================================

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-paper-muted truncate">{label}</span>
        <span className="text-micro text-paper-faint ml-2 shrink-0">{count}</span>
      </div>
      <div className="h-1.5 bg-ink-200 w-full" style={{ borderRadius: "var(--radius-sm)" }}>
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${Math.max(pct, 1)}%`,
            borderRadius: "var(--radius-sm)",
          }}
        />
      </div>
    </div>
  );
}
