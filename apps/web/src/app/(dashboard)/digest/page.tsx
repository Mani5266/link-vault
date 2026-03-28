"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import type { AIDigestResponse, DigestRecord, PaginatedResponse, ApiResponse } from "@linkvault/shared";

// ============================================================
// Digest Page — Generate + browse digest history
// ============================================================

export default function DigestPage() {
  const { accessToken } = useAuthStore();
  const toast = useToastStore.getState;

  // On-demand generation
  const [liveDigest, setLiveDigest] = useState<AIDigestResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [days, setDays] = useState(7);

  // History
  const [history, setHistory] = useState<DigestRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Tab
  const [tab, setTab] = useState<"generate" | "history">("generate");

  // Fetch digest history
  const fetchHistory = useCallback(async () => {
    if (!accessToken) return;
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<DigestRecord>>(
        "/digests?limit=20",
        accessToken
      );
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load digest history";
      toast().addToast(msg, "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (tab === "history") {
      fetchHistory();
    }
  }, [tab, fetchHistory]);

  // Generate digest (on-demand via existing AI endpoint for immediate result)
  const handleGenerate = useCallback(async () => {
    if (!accessToken) return;
    setGenerating(true);
    try {
      // Use the existing AI digest endpoint for immediate result
      const res = await apiClient.post<ApiResponse<AIDigestResponse>>(
        "/ai/digest",
        { days },
        accessToken
      );
      if (res.success && res.data) {
        setLiveDigest(res.data);

        // Also store it via the digests endpoint
        try {
          await apiClient.post<ApiResponse<unknown>>(
            "/digests/generate",
            { days },
            accessToken
          );
        } catch {
          // Non-critical: history storage failed but live digest is shown
        }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Digest generation failed";
      toast().addToast(msg, "error");
    } finally {
      setGenerating(false);
    }
  }, [accessToken, days]);

  // Delete a digest record
  const handleDelete = useCallback(async (id: string) => {
    if (!accessToken) return;
    try {
      await apiClient.delete(`/digests/${id}`, accessToken);
      setHistory((prev) => prev.filter((d) => d.id !== id));
      toast().addToast("Digest deleted", "success");
    } catch {
      toast().addToast("Failed to delete digest", "error");
    }
  }, [accessToken]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-display-sm text-paper mb-2">
          AI Digest
        </h1>
        <p className="text-caption text-paper-muted">
          AI-generated summaries of your recently saved links — auto-generated weekly
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-ink-300">
        <button
          onClick={() => setTab("generate")}
          className={`px-4 py-2.5 text-xs font-body font-medium transition-colors border-b-2 -mb-px ${
            tab === "generate"
              ? "text-gold border-gold"
              : "text-paper-muted border-transparent hover:text-paper-dim"
          }`}
        >
          Generate
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2.5 text-xs font-body font-medium transition-colors border-b-2 -mb-px ${
            tab === "history"
              ? "text-gold border-gold"
              : "text-paper-muted border-transparent hover:text-paper-dim"
          }`}
        >
          History
          {history.length > 0 && (
            <span className="ml-1.5 text-micro px-1.5 py-0.5 bg-ink-300 text-paper-faint" style={{ borderRadius: "var(--radius-sm)" }}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Generate Tab */}
      {tab === "generate" && (
        <>
          {/* Controls */}
          <div className="flex items-center gap-3 mb-8">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="input-editorial !w-auto !py-2 !px-3 !text-xs"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary !py-2 !px-5 !text-xs inline-flex items-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate Digest
                </>
              )}
            </button>
          </div>

          {/* Empty State */}
          {!liveDigest && !generating && (
            <div className="border border-ink-300 bg-ink-50 py-16 px-6 text-center" style={{ borderRadius: "var(--radius-md)" }}>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-gold/30 bg-gold/5" style={{ borderRadius: "var(--radius-md)" }}>
                <svg className="w-6 h-6 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <p className="text-sm text-paper-muted mb-1">No digest generated yet</p>
              <p className="text-xs text-paper-faint">
                Click &quot;Generate Digest&quot; to get an AI-powered summary of your recent links
              </p>
            </div>
          )}

          {/* Loading Skeleton */}
          {generating && !liveDigest && (
            <div className="space-y-6 animate-pulse">
              <div className="border border-ink-300 bg-ink-50 p-6" style={{ borderRadius: "var(--radius-md)" }}>
                <div className="h-3 w-24 bg-ink-300 mb-4" style={{ borderRadius: "var(--radius-sm)" }} />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
                  <div className="h-3 w-4/5 bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
                  <div className="h-3 w-3/5 bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
                </div>
              </div>
            </div>
          )}

          {/* Live Digest Content */}
          {liveDigest && <DigestContent digest={liveDigest} />}
        </>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <>
          {historyLoading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-ink-200 border border-ink-300" style={{ borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="border border-ink-300 bg-ink-50 py-12 px-6 text-center" style={{ borderRadius: "var(--radius-md)" }}>
              <p className="text-sm text-paper-muted mb-1">No digest history</p>
              <p className="text-xs text-paper-faint">
                Generated digests will appear here. Weekly digests are auto-generated every Monday.
              </p>
            </div>
          )}

          {!historyLoading && history.length > 0 && (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="border border-ink-300 bg-ink-50 overflow-hidden transition-all duration-200"
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  {/* Collapsed header */}
                  <button
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-ink-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-gold shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      <div className="text-left">
                        <p className="text-sm text-paper font-medium">
                          {new Date(record.period_start).toLocaleDateString()} &mdash; {new Date(record.period_end).toLocaleDateString()}
                        </p>
                        <p className="text-micro text-paper-faint mt-0.5">
                          {record.stats.total_links} links &middot; {record.themes.length} themes &middot; {record.period_days}d period
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-micro text-paper-faint">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                      <svg
                        className={`w-4 h-4 text-paper-faint transition-transform duration-200 ${expandedId === record.id ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expandedId === record.id && (
                    <div className="px-5 pb-5 border-t border-ink-300/50 animate-fade-in">
                      <div className="pt-4 space-y-4">
                        <DigestContent
                          digest={{
                            summary: record.summary,
                            highlights: record.highlights,
                            themes: record.themes,
                            stats: record.stats,
                          }}
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(record.id);
                            }}
                            className="text-micro text-danger hover:text-danger-hover transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Shared Digest Content Component
// ============================================================

function DigestContent({ digest }: { digest: AIDigestResponse }) {
  return (
    <div className="space-y-5">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 px-4 py-3 border border-ink-300 bg-ink-100/50" style={{ borderRadius: "var(--radius-md)" }}>
        <div className="flex items-center gap-2">
          <span className="text-micro text-paper-faint uppercase tracking-editorial">Links</span>
          <span className="text-sm font-medium text-paper">{digest.stats.total_links}</span>
        </div>
        <div className="w-px h-4 bg-ink-300" />
        <div className="flex items-center gap-2">
          <span className="text-micro text-paper-faint uppercase tracking-editorial">Period</span>
          <span className="text-sm text-paper-muted">
            {new Date(digest.stats.period_start).toLocaleDateString()} &mdash; {new Date(digest.stats.period_end).toLocaleDateString()}
          </span>
        </div>
        {Object.keys(digest.stats.categories).length > 0 && (
          <>
            <div className="w-px h-4 bg-ink-300" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(digest.stats.categories).map(([cat, count]) => (
                <span
                  key={cat}
                  className="text-micro px-1.5 py-0.5 bg-ink-200 text-paper-muted"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  {cat} ({count})
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Summary */}
      <div className="card-accent-top border border-ink-300 bg-ink-50 p-5" style={{ borderRadius: "var(--radius-md)" }}>
        <p className="editorial-label text-gold mb-2.5">Summary</p>
        <p className="text-sm text-paper leading-relaxed">{digest.summary}</p>
      </div>

      {/* Themes */}
      {digest.themes.length > 0 && (
        <div className="border border-ink-300 bg-ink-50 p-5" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="editorial-label text-paper-faint mb-3">Themes</p>
          <div className="flex flex-wrap gap-2">
            {digest.themes.map((theme) => (
              <span
                key={theme}
                className="inline-flex items-center px-3 py-1.5 text-xs border border-gold/20 text-gold bg-gold/5"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <div className="border border-ink-300 bg-ink-50 p-5" style={{ borderRadius: "var(--radius-md)" }}>
          <p className="editorial-label text-paper-faint mb-3">Highlights</p>
          <div className="space-y-3">
            {digest.highlights.map((highlight, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-micro font-mono text-paper-faint mt-0.5 shrink-0 w-5 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={highlight.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-paper hover:text-accent transition-colors block truncate"
                  >
                    {highlight.title}
                  </a>
                  <p className="text-xs text-paper-muted mt-0.5">{highlight.reason}</p>
                </div>
                <a
                  href={highlight.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1 text-paper-faint hover:text-paper-muted transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
