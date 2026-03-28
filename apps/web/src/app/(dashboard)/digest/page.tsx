"use client";

import { useState, useCallback } from "react";
import { useAI } from "@/hooks/useAI";
import type { AIDigestResponse } from "@linkvault/shared";

export default function DigestPage() {
  const { generateDigest } = useAI();
  const [digest, setDigest] = useState<AIDigestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    const result = await generateDigest(days);
    if (result) {
      setDigest(result);
    }
    setLoading(false);
  }, [generateDigest, days]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-display-sm text-paper mb-2">
          Weekly Digest
        </h1>
        <p className="text-caption text-paper-muted">
          AI-generated summary of your recently saved links
        </p>
      </div>

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
          disabled={loading}
          className="btn-primary !py-2 !px-5 !text-xs inline-flex items-center gap-2"
        >
          {loading ? (
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
      {!digest && !loading && (
        <div className="border border-ink-300 bg-ink-50 py-16 px-6 text-center" style={{ borderRadius: "var(--radius-md)" }}>
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-gold/30 bg-gold/5" style={{ borderRadius: "var(--radius-md)" }}>
            <svg className="w-6 h-6 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <p className="text-sm text-paper-muted mb-1">No digest generated yet</p>
          <p className="text-xs text-paper-faint">
            Click "Generate Digest" to get an AI-powered summary of your recent links
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !digest && (
        <div className="space-y-6 animate-pulse">
          <div className="border border-ink-300 bg-ink-50 p-6" style={{ borderRadius: "var(--radius-md)" }}>
            <div className="h-3 w-24 bg-ink-300 mb-4" style={{ borderRadius: "var(--radius-sm)" }} />
            <div className="space-y-2">
              <div className="h-3 w-full bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
              <div className="h-3 w-4/5 bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
              <div className="h-3 w-3/5 bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
            </div>
          </div>
          <div className="border border-ink-300 bg-ink-50 p-6" style={{ borderRadius: "var(--radius-md)" }}>
            <div className="h-3 w-20 bg-ink-300 mb-4" style={{ borderRadius: "var(--radius-sm)" }} />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-ink-300" style={{ borderRadius: "var(--radius-sm)" }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Digest Content */}
      {digest && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="flex items-center gap-4 px-4 py-3 border border-ink-300 bg-ink-50" style={{ borderRadius: "var(--radius-md)" }}>
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
          <div className="card-accent-top border border-ink-300 bg-ink-50 p-6" style={{ borderRadius: "var(--radius-md)" }}>
            <p className="editorial-label text-gold mb-3">Summary</p>
            <p className="text-sm text-paper leading-relaxed">{digest.summary}</p>
          </div>

          {/* Themes */}
          {digest.themes.length > 0 && (
            <div className="border border-ink-300 bg-ink-50 p-6" style={{ borderRadius: "var(--radius-md)" }}>
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
            <div className="border border-ink-300 bg-ink-50 p-6" style={{ borderRadius: "var(--radius-md)" }}>
              <p className="editorial-label text-paper-faint mb-4">Highlights</p>
              <div className="space-y-4">
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
      )}
    </div>
  );
}
