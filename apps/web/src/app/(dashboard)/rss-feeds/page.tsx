"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { ApiResponse, RssFeed, RssFeedItem } from "@linkvault/shared";

// ============================================================
// RSS Feeds — Manage subscribed RSS feeds
// ============================================================

export default function RssFeedsPage() {
  const { accessToken } = useAuthStore();
  const { collections } = useCollectionStore();
  const { addToast } = useToastStore();

  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUrl, setAddUrl] = useState("");
  const [addCollectionId, setAddCollectionId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [expandedFeedId, setExpandedFeedId] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<RssFeedItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [checkingFeedId, setCheckingFeedId] = useState<string | null>(null);

  const fetchFeeds = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<RssFeed[]>>(
        "/rss-feeds",
        accessToken
      );
      setFeeds(res.data || []);
    } catch {
      addToast("Failed to load feeds", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, addToast]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  async function handleAdd() {
    if (!addUrl.trim() || !accessToken) return;

    // Client-side URL validation
    try {
      const parsed = new URL(addUrl.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        addToast("Please enter an http or https URL", "error");
        return;
      }
    } catch {
      addToast("Please enter a valid URL", "error");
      return;
    }

    setAdding(true);
    try {
      const res = await apiClient.post<ApiResponse<RssFeed>>(
        "/rss-feeds",
        {
          feed_url: addUrl.trim(),
          collection_id: addCollectionId || null,
        },
        accessToken
      );
      setFeeds((prev) => [res.data, ...prev]);
      setAddUrl("");
      setAddCollectionId("");
      addToast("Feed added", "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to add feed";
      addToast(msg, "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(feedId: string) {
    if (!accessToken) return;
    try {
      await apiClient.delete<ApiResponse<null>>(
        `/rss-feeds/${feedId}`,
        accessToken
      );
      setFeeds((prev) => prev.filter((f) => f.id !== feedId));
      if (expandedFeedId === feedId) setExpandedFeedId(null);
      addToast("Feed removed", "success");
    } catch {
      addToast("Failed to delete feed", "error");
    }
  }

  async function handleToggleActive(feed: RssFeed) {
    if (!accessToken) return;
    try {
      const res = await apiClient.patch<ApiResponse<RssFeed>>(
        `/rss-feeds/${feed.id}`,
        { is_active: !feed.is_active },
        accessToken
      );
      setFeeds((prev) =>
        prev.map((f) => (f.id === feed.id ? res.data : f))
      );
    } catch {
      addToast("Failed to update feed", "error");
    }
  }

  async function handleCheckFeed(feedId: string) {
    if (!accessToken) return;
    setCheckingFeedId(feedId);
    try {
      const res = await apiClient.post<
        ApiResponse<{ new_items: number; total_items: number }>
      >(`/rss-feeds/${feedId}/check`, {}, accessToken);
      const { new_items } = res.data;
      addToast(
        new_items > 0
          ? `Found ${new_items} new article${new_items > 1 ? "s" : ""} and saved to your links`
          : "No new articles found",
        new_items > 0 ? "success" : "info"
      );
      // Refresh feeds to update last_checked_at
      fetchFeeds();
    } catch {
      addToast("Failed to check feed", "error");
    } finally {
      setCheckingFeedId(null);
    }
  }

  async function handleExpandFeed(feedId: string) {
    if (expandedFeedId === feedId) {
      setExpandedFeedId(null);
      return;
    }
    setExpandedFeedId(feedId);
    if (!accessToken) return;
    setItemsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<RssFeedItem[]>>(
        `/rss-feeds/${feedId}/items`,
        accessToken
      );
      setFeedItems(res.data || []);
    } catch {
      addToast("Failed to load feed items", "error");
    } finally {
      setItemsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-display-sm text-paper font-bold tracking-tight">
          RSS Feeds
        </h1>
        <p className="text-sm text-paper-dim font-body mt-1">
          Subscribe to RSS feeds and auto-save new articles as links
        </p>
      </div>

      {/* Add Feed */}
      <div
        className="border border-ink-300 bg-ink-50 p-5 mb-6"
        style={{ borderRadius: "var(--radius-md)" }}
      >
        <h2 className="font-display text-heading text-paper font-semibold tracking-tight mb-3">
          Add Feed
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="https://example.com or https://example.com/feed.xml"
            className="flex-1 bg-ink-200 border border-ink-300 px-3 py-2 text-sm text-paper placeholder:text-paper-faint font-body focus:outline-none focus:border-accent/50 transition-colors"
            style={{ borderRadius: "var(--radius-sm)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <select
            value={addCollectionId}
            onChange={(e) => setAddCollectionId(e.target.value)}
            className="bg-ink-200 border border-ink-300 px-3 py-2 text-sm text-paper font-body focus:outline-none focus:border-accent/50 transition-colors"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!addUrl.trim() || adding}
            className={cn(
              "px-4 py-2 text-sm font-body font-medium transition-all duration-200 shrink-0",
              addUrl.trim()
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-ink-300 text-paper-faint cursor-not-allowed"
            )}
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            {adding ? "Adding..." : "Add Feed"}
          </button>
        </div>
        <p className="text-xs text-paper-faint mt-2 font-body">
          Paste a feed URL or any website URL — we'll auto-discover the RSS feed.
        </p>
      </div>

      {/* Feeds List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-ink-500 border-t-accent rounded-full animate-spin" />
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="w-16 h-16 bg-ink-200 flex items-center justify-center mx-auto mb-4"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <svg className="w-8 h-8 text-paper-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </div>
          <p className="text-paper-dim font-body">No feeds yet</p>
          <p className="text-caption text-paper-faint mt-1">
            Add an RSS feed URL above to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed, i) => (
            <div
              key={feed.id}
              className="border border-ink-300 bg-ink-50 overflow-hidden animate-fade-in-up"
              style={{
                borderRadius: "var(--radius-sm)",
                animationDelay: `${i * 50}ms`,
                animationFillMode: "backwards",
              }}
            >
              {/* Feed header */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Status dot */}
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    feed.is_active ? "bg-success" : "bg-ink-600"
                  )}
                  title={feed.is_active ? "Active" : "Paused"}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleExpandFeed(feed.id)}
                    className="font-body font-medium text-sm text-paper hover:text-accent-hover transition-colors text-left truncate block w-full"
                  >
                    {feed.title || feed.feed_url}
                  </button>
                  <p className="text-micro text-paper-faint truncate mt-0.5">
                    {feed.feed_url}
                  </p>
                  {feed.last_checked_at && (
                    <p className="text-micro text-paper-faint mt-0.5">
                      Last checked {formatDate(feed.last_checked_at)}
                    </p>
                  )}
                  {feed.last_error && (
                    <p className="text-micro text-danger mt-0.5">
                      {feed.last_error}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCheckFeed(feed.id)}
                    disabled={checkingFeedId === feed.id}
                    className="px-3 py-1.5 text-xs font-body bg-ink-200 text-paper-muted hover:bg-ink-300 hover:text-paper transition-all"
                    style={{ borderRadius: "var(--radius-sm)" }}
                    title="Check for new articles"
                  >
                    {checkingFeedId === feed.id ? (
                      <span className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border border-paper-faint border-t-accent rounded-full animate-spin" />
                        Checking
                      </span>
                    ) : (
                      "Check now"
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleActive(feed)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-body transition-all",
                      feed.is_active
                        ? "bg-ink-200 text-paper-dim hover:bg-ink-300"
                        : "bg-accent-subtle text-accent hover:bg-accent-muted"
                    )}
                    style={{ borderRadius: "var(--radius-sm)" }}
                  >
                    {feed.is_active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="p-1.5 text-paper-faint hover:text-danger hover:bg-danger-subtle transition-colors"
                    style={{ borderRadius: "var(--radius-sm)" }}
                    title="Delete feed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded: feed items */}
              {expandedFeedId === feed.id && (
                <div className="border-t border-ink-300/60 bg-ink-100/30">
                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-4 h-4 border-2 border-ink-500 border-t-accent rounded-full animate-spin" />
                    </div>
                  ) : feedItems.length === 0 ? (
                    <p className="text-center text-caption text-paper-faint py-6">
                      No items found. Try clicking &quot;Check now&quot; to fetch articles.
                    </p>
                  ) : (
                    <div className="divide-y divide-ink-300/30 max-h-80 overflow-y-auto">
                      {feedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-ink-100/50 transition-colors"
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              item.is_saved ? "bg-success" : "bg-ink-500"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-paper hover:text-accent-hover transition-colors truncate block font-body"
                            >
                              {item.title || item.url}
                            </a>
                            {item.published_at && (
                              <span className="text-micro text-paper-faint">
                                {formatDate(item.published_at)}
                              </span>
                            )}
                          </div>
                          {item.is_saved && (
                            <span className="text-micro text-success font-medium shrink-0">
                              Saved
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
