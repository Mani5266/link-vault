"use client";

import { memo } from "react";
import { LINK_CATEGORIES } from "@linkvault/shared";
import type { LinkSortField, SortDirection, LinkCategory } from "@linkvault/shared";

// ============================================================
// SortFilterBar — Editorial sort/filter controls
// Uppercase labels, hairline borders, warm accent active states
// ============================================================

interface SortFilterBarProps {
  sortBy: LinkSortField;
  sortDir: SortDirection;
  category?: LinkCategory;
  isPinned?: boolean;
  onSortChange: (sortBy: LinkSortField, sortDir: SortDirection) => void;
  onCategoryChange: (category: LinkCategory | undefined) => void;
  onPinnedChange: (pinned: boolean | undefined) => void;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "title:asc", label: "Title A-Z" },
  { value: "title:desc", label: "Title Z-A" },
  { value: "domain:asc", label: "Domain A-Z" },
  { value: "domain:desc", label: "Domain Z-A" },
  { value: "category:asc", label: "Category A-Z" },
];

export const SortFilterBar = memo(function SortFilterBar({
  sortBy,
  sortDir,
  category,
  isPinned,
  onSortChange,
  onCategoryChange,
  onPinnedChange,
}: SortFilterBarProps) {
  const currentSort = `${sortBy}:${sortDir}`;

  function handleSortSelect(value: string) {
    const [field, dir] = value.split(":") as [LinkSortField, SortDirection];
    onSortChange(field, dir);
  }

  const hasActiveFilters = category !== undefined || isPinned !== undefined;

  return (
    <div className="flex items-center gap-2 flex-wrap animate-fade-in">
      {/* Sort dropdown */}
      <div className="relative flex-shrink-0">
        <select
          value={currentSort}
          onChange={(e) => handleSortSelect(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 bg-ink-50 border border-ink-300 text-xs text-paper-muted hover:border-ink-400 hover:bg-ink-100 focus:border-accent focus:ring-0 outline-none transition-all duration-200 cursor-pointer font-body"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>

      {/* Category filter */}
      <div className="relative flex-shrink-0">
        <select
          value={category || ""}
          onChange={(e) => {
            const val = e.target.value;
            onCategoryChange(val ? (val as LinkCategory) : undefined);
          }}
          className="appearance-none pl-3 pr-7 py-1.5 bg-ink-50 border border-ink-300 text-xs text-paper-muted hover:border-ink-400 hover:bg-ink-100 focus:border-accent focus:ring-0 outline-none transition-all duration-200 cursor-pointer font-body"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          <option value="">All categories</option>
          {LINK_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.emoji} {cat.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>

      {/* Pinned filter */}
      <button
        onClick={() => {
          if (isPinned === undefined) {
            onPinnedChange(true);
          } else {
            onPinnedChange(undefined);
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-body border transition-all duration-200 ${
          isPinned
            ? "bg-accent-subtle border-accent/20 text-accent shadow-glow-accent"
            : "bg-ink-50 border-ink-300 text-paper-dim hover:border-ink-400 hover:text-paper-muted hover:bg-ink-100"
        }`}
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
        <span className="uppercase tracking-editorial text-micro font-medium">Pinned</span>
      </button>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            onCategoryChange(undefined);
            onPinnedChange(undefined);
          }}
          className="text-xs text-paper-faint hover:text-paper-muted px-2 py-1 transition-all duration-200 hover:bg-ink-100 font-body"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
});

function ChevronIcon() {
  return (
    <svg
      className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-paper-faint pointer-events-none"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
