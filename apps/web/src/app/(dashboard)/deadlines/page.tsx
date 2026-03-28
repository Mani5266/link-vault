"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useLinks } from "@/hooks/useLinks";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import type { Link, ApiResponse } from "@linkvault/shared";

// ============================================================
// Deadlines — Links with AI-detected or manually set deadlines
// Grouped: Overdue, Today, This Week, Upcoming, Expired
// ============================================================

type DeadlineGroup = "overdue" | "today" | "this-week" | "upcoming" | "expired";

interface GroupedLink {
  group: DeadlineGroup;
  link: Link;
}

function getDeadlineGroup(deadlineAt: string): DeadlineGroup {
  const now = new Date();
  const deadline = new Date(deadlineAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  if (deadline < todayStart) return "overdue";
  if (deadline < todayEnd) return "today";
  if (deadline < weekEnd) return "this-week";
  return "upcoming";
}

const GROUP_CONFIG: Record<
  DeadlineGroup,
  { label: string; color: string; dotColor: string; order: number }
> = {
  overdue: {
    label: "Overdue",
    color: "text-danger",
    dotColor: "bg-danger",
    order: 0,
  },
  today: {
    label: "Today",
    color: "text-accent",
    dotColor: "bg-accent",
    order: 1,
  },
  "this-week": {
    label: "This Week",
    color: "text-gold",
    dotColor: "bg-gold",
    order: 2,
  },
  upcoming: {
    label: "Upcoming",
    color: "text-paper-dim",
    dotColor: "bg-paper-dim",
    order: 3,
  },
  expired: {
    label: "Expired",
    color: "text-paper-faint",
    dotColor: "bg-paper-faint",
    order: 4,
  },
};

export default function DeadlinesPage() {
  const { accessToken } = useAuthStore();
  const { addToast } = useToastStore();

  const {
    links,
    isLoading,
    isLoadingMore,
    filters,
    setFilters,
    loadMore,
    goToPage,
    hasMore,
    total,
    totalPages,
    currentPage,
    refetch,
  } = useLinks();

  // Filter to deadline links only
  useEffect(() => {
    setFilters({
      has_deadline: true,
      sort_by: "created_at",
      sort_dir: "asc",
      page: 1,
    });
  }, [setFilters]);

  // Group links by deadline proximity
  const grouped = useMemo(() => {
    const groups: Record<DeadlineGroup, Link[]> = {
      overdue: [],
      today: [],
      "this-week": [],
      upcoming: [],
      expired: [],
    };

    for (const link of links) {
      if (!link.deadline_at) continue;
      const group = getDeadlineGroup(link.deadline_at);
      groups[group].push(link);
    }

    // Sort within each group by deadline date
    for (const key of Object.keys(groups) as DeadlineGroup[]) {
      groups[key].sort((a, b) => {
        const da = new Date(a.deadline_at!).getTime();
        const db = new Date(b.deadline_at!).getTime();
        return da - db;
      });
    }

    return groups;
  }, [links]);

  const handleClearDeadline = useCallback(
    async (link: Link) => {
      if (!accessToken) return;
      try {
        await apiClient.patch<ApiResponse<Link>>(
          `/links/${link.id}`,
          { deadline_at: null, deadline_label: null },
          accessToken
        );
        addToast("Deadline removed", "success");
        refetch();
      } catch {
        addToast("Failed to remove deadline", "error");
      }
    },
    [accessToken, addToast, refetch]
  );

  const groupOrder: DeadlineGroup[] = [
    "overdue",
    "today",
    "this-week",
    "upcoming",
  ];

  const hasAnyLinks = groupOrder.some((g) => grouped[g].length > 0);

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div>
          <p className="editorial-label text-paper-faint mb-1">Manage</p>
          <h1 className="font-display text-display-sm font-bold text-paper">
            Deadlines
          </h1>
          <p className="text-paper-dim text-sm mt-1 font-body">
            {!isLoading && total > 0
              ? `${total} link${total === 1 ? "" : "s"} with deadlines`
              : null}
          </p>
        </div>
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-ink-500 border-t-accent rounded-full animate-spin" />
        </div>
      ) : !hasAnyLinks ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-fade-in-up">
          <div className="w-8 h-px bg-ink-400 mb-8" />
          <p className="editorial-label text-paper-faint mb-6">Deadlines</p>
          <span className="text-4xl mb-4">&#x23F0;</span>
          <h2 className="font-display text-display-sm font-bold text-paper mb-3">
            No deadlines yet
          </h2>
          <p className="text-sm text-paper-dim max-w-sm leading-relaxed">
            When you save links with time-sensitive content, AI will
            automatically detect deadlines. You can also set deadlines manually
            from the edit modal.
          </p>
          <div className="w-8 h-px bg-ink-400 mt-8" />
        </div>
      ) : (
        <div className="space-y-8">
          {groupOrder.map((groupKey) => {
            const items = grouped[groupKey];
            if (items.length === 0) return null;
            const config = GROUP_CONFIG[groupKey];

            return (
              <div key={groupKey}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-2 h-2 rounded-full ${config.dotColor}`}
                  />
                  <h3
                    className={`editorial-label ${config.color}`}
                  >
                    {config.label}
                  </h3>
                  <span className="text-xs text-paper-faint font-body">
                    ({items.length})
                  </span>
                </div>

                {/* Links */}
                <div className="space-y-2">
                  {items.map((link, i) => (
                    <DeadlineLinkRow
                      key={link.id}
                      link={link}
                      groupKey={groupKey}
                      index={i}
                      onClearDeadline={handleClearDeadline}
                    />
                  ))}
                </div>
              </div>
            );
          })}

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

// ============================================================
// DeadlineLinkRow — Individual link with deadline info
// ============================================================

function DeadlineLinkRow({
  link,
  groupKey,
  index,
  onClearDeadline,
}: {
  link: Link;
  groupKey: DeadlineGroup;
  index: number;
  onClearDeadline: (link: Link) => void;
}) {
  const config = GROUP_CONFIG[groupKey];
  const deadlineDate = new Date(link.deadline_at!);

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 bg-ink-50 border border-ink-300 hover:border-ink-400 transition-all duration-200 animate-fade-in-up"
      style={{
        borderRadius: "var(--radius-sm)",
        animationDelay: `${index * 30}ms`,
        animationFillMode: "backwards",
      }}
    >
      {/* Emoji */}
      {link.emoji && (
        <span className="text-lg shrink-0">{link.emoji}</span>
      )}

      {/* Link info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-paper truncate">
            {link.title || link.url}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-paper-faint truncate">
            {link.domain || link.url}
          </p>
          {link.deadline_label && (
            <>
              <span className="text-paper-faint">·</span>
              <span className={`text-xs font-medium ${config.color}`}>
                {link.deadline_label}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Deadline date */}
      <div className="text-right shrink-0">
        <p className={`text-xs font-medium font-body ${config.color}`}>
          {formatDeadlineDate(deadlineDate)}
        </p>
        <p className="text-micro text-paper-faint font-body mt-0.5">
          {formatRelativeDeadline(deadlineDate)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs font-body font-medium text-paper-muted hover:text-paper bg-ink-100 hover:bg-ink-200 border border-ink-300 transition-all duration-200"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          Open
        </a>
        <button
          onClick={() => onClearDeadline(link)}
          className="px-3 py-1.5 text-xs font-body font-medium text-paper-faint hover:text-danger hover:bg-danger-subtle border border-transparent hover:border-danger/30 transition-all duration-200"
          style={{ borderRadius: "var(--radius-sm)" }}
          title="Remove deadline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Date formatting helpers
// ============================================================

function formatDeadlineDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatRelativeDeadline(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return "1 day overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `${diffDays} days left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
  return `${Math.ceil(diffDays / 30)} months left`;
}
