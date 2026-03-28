"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useLinkStore } from "@/stores/linkStore";
import { useUIStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";
import { useDebounce } from "@/hooks/useDebounce";
import { apiClient, ApiError } from "@/lib/api";
import type {
  Link,
  LinkFilters,
  PaginatedResponse,
  ApiResponse,
  ReadingStatus,
} from "@linkvault/shared";

// ============================================================
// useLinks — Fetches and manages links from the API
// Supports pagination with "load more" pattern
// ============================================================

interface UseLinksOptions {
  /** Filter by collection slug (resolved to ID from store) */
  collectionSlug?: string;
  /** Filter by collection ID directly */
  collectionId?: string | null;
}

export function useLinks(options: UseLinksOptions = {}) {
  const { accessToken } = useAuthStore();
  const {
    links,
    filters,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    setLinks,
    appendLinks,
    addLink,
    updateLink,
    removeLink,
    removeLinks,
    setFilters,
    setLoading,
    setLoadingMore,
    setError,
    setPagination,
    selectedIds,
    isSelectionMode,
    clearSelection,
  } = useLinkStore();
  const { searchQuery } = useUIStore();
  const toast = useToastStore.getState;
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Track previous filter/search/collection to detect changes that require reset
  const prevDepsRef = useRef<string>("");

  // Build query params for a given page
  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams();

      if (options.collectionId) {
        params.set("collection_id", options.collectionId);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (filters.sort_by) {
        params.set("sort_by", filters.sort_by);
      }
      if (filters.sort_dir) {
        params.set("sort_dir", filters.sort_dir);
      }
      if (filters.category) {
        params.set("category", filters.category);
      }
      if (filters.is_pinned !== undefined) {
        params.set("is_pinned", String(filters.is_pinned));
      }
      if (filters.reading_status) {
        params.set("reading_status", filters.reading_status);
      }
      params.set("page", String(page));
      if (filters.limit) {
        params.set("limit", String(filters.limit));
      }

      return params;
    },
    [
      options.collectionId,
      debouncedSearch,
      filters.sort_by,
      filters.sort_dir,
      filters.category,
      filters.is_pinned,
      filters.reading_status,
      filters.limit,
    ]
  );

  // Fetch page 1 — replaces all links
  const fetchLinks = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const params = buildParams(1);
      const qs = params.toString();
      const endpoint = `/links${qs ? `?${qs}` : ""}`;

      const response = await apiClient.get<PaginatedResponse<Link>>(
        endpoint,
        accessToken
      );

      if (response.success) {
        setLinks(response.data);

        const { total, total_pages } = response.pagination;
        setPagination({
          total,
          totalPages: total_pages,
          hasMore: 1 < total_pages,
        });

        // Reset page in filters to 1
        setFilters({ page: 1 });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load links.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    buildParams,
    setLinks,
    setPagination,
    setFilters,
    setLoading,
    setError,
  ]);

  // Load next page — appends to existing links
  const loadMore = useCallback(async () => {
    if (!accessToken || isLoadingMore || !pagination.hasMore) return;

    const nextPage = (filters.page || 1) + 1;

    setLoadingMore(true);

    try {
      const params = buildParams(nextPage);
      const qs = params.toString();
      const endpoint = `/links${qs ? `?${qs}` : ""}`;

      const response = await apiClient.get<PaginatedResponse<Link>>(
        endpoint,
        accessToken
      );

      if (response.success) {
        appendLinks(response.data);

        const { total, total_pages } = response.pagination;
        setPagination({
          total,
          totalPages: total_pages,
          hasMore: nextPage < total_pages,
        });

        // Advance page in filters so next loadMore fetches the correct page
        setFilters({ page: nextPage });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to load more links.";
      toast().addToast(msg, "error");
    } finally {
      setLoadingMore(false);
    }
  }, [
    accessToken,
    isLoadingMore,
    pagination.hasMore,
    filters.page,
    buildParams,
    appendLinks,
    setPagination,
    setFilters,
    setLoadingMore,
  ]);

  // Detect filter/search/collection changes and re-fetch from page 1
  const currentDeps = JSON.stringify({
    collectionId: options.collectionId,
    search: debouncedSearch,
    sort_by: filters.sort_by,
    sort_dir: filters.sort_dir,
    category: filters.category,
    is_pinned: filters.is_pinned,
    reading_status: filters.reading_status,
    limit: filters.limit,
  });

  useEffect(() => {
    // Always fetch; the dependency comparison ensures we only re-fetch
    // when the underlying filter/search/collection actually changed.
    fetchLinks();
    prevDepsRef.current = currentDeps;
  }, [currentDeps, accessToken]);

  // ---- Mutations ----

  const deleteLink = useCallback(
    async (link: Link) => {
      if (!accessToken) return;

      // Optimistically remove from UI immediately
      removeLink(link.id);
      setPagination({
        ...pagination,
        total: Math.max(0, pagination.total - 1),
      });

      // Set up delayed actual delete with undo
      let cancelled = false;
      const timeoutId = setTimeout(async () => {
        if (cancelled) return;
        try {
          await apiClient.delete(`/links/${link.id}`, accessToken);
        } catch (err) {
          // Delete failed — restore the link
          addLink(link);
          setPagination({
            ...pagination,
            total: pagination.total,
          });
          const msg =
            err instanceof ApiError ? err.message : "Failed to delete link";
          toast().addToast(msg, "error");
        }
      }, 5000);

      // Show toast with undo action
      toast().addToast("Link deleted", "success", 5000, {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timeoutId);
          // Restore the link in UI
          addLink(link);
          setPagination({
            ...pagination,
            total: pagination.total,
          });
        },
      });
    },
    [accessToken, removeLink, addLink, pagination, setPagination]
  );

  const togglePin = useCallback(
    async (link: Link) => {
      if (!accessToken) return;

      // Optimistic update
      const newPinned = !link.is_pinned;
      updateLink(link.id, { is_pinned: newPinned });
      toast().addToast(newPinned ? "Pinned to top" : "Unpinned", "success");

      try {
        const response = await apiClient.patch<ApiResponse<Link>>(
          `/links/${link.id}`,
          { is_pinned: newPinned },
          accessToken
        );
        if (response.success && response.data) {
          // Sync with server response (may have additional fields)
          updateLink(link.id, response.data);
        }
      } catch (err) {
        // Rollback
        updateLink(link.id, { is_pinned: link.is_pinned });
        const msg =
          err instanceof ApiError ? err.message : "Failed to toggle pin";
        toast().addToast(msg, "error");
      }
    },
    [accessToken, updateLink]
  );

  const toggleReadingStatus = useCallback(
    async (link: Link, status: ReadingStatus | null) => {
      if (!accessToken) return;

      // Optimistic update
      const prevStatus = link.reading_status;
      const prevReadAt = link.read_at;
      const readAt = status === "read" ? new Date().toISOString() : null;
      updateLink(link.id, { reading_status: status, read_at: readAt } as Partial<Link>);

      const msg =
        status === "unread"
          ? "Added to reading queue"
          : status === "read"
            ? "Marked as read"
            : "Removed from reading queue";
      toast().addToast(msg, "success");

      try {
        const body: Record<string, unknown> = {
          reading_status: status,
          read_at: readAt,
        };
        const response = await apiClient.patch<ApiResponse<Link>>(
          `/links/${link.id}`,
          body,
          accessToken
        );
        if (response.success && response.data) {
          updateLink(link.id, response.data);
        }
      } catch (err) {
        // Rollback
        updateLink(link.id, { reading_status: prevStatus, read_at: prevReadAt } as Partial<Link>);
        const errMsg =
          err instanceof ApiError
            ? err.message
            : "Failed to update reading status";
        toast().addToast(errMsg, "error");
      }
    },
    [accessToken, updateLink]
  );

  // ---- Bulk Mutations ----

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (!accessToken || ids.length === 0) return;
      try {
        await apiClient.post<ApiResponse<null>>(
          "/links/bulk-delete",
          { ids },
          accessToken
        );
        removeLinks(ids);
        clearSelection();
        // Decrement total count
        setPagination({
          ...pagination,
          total: Math.max(0, pagination.total - ids.length),
        });
        toast().addToast(
          `${ids.length} link${ids.length === 1 ? "" : "s"} deleted`,
          "success"
        );
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Failed to delete links";
        toast().addToast(msg, "error");
      }
    },
    [accessToken, removeLinks, clearSelection, pagination, setPagination]
  );

  const bulkMove = useCallback(
    async (ids: string[], collectionId: string | null) => {
      if (!accessToken || ids.length === 0) return;

      // Save previous collection IDs for rollback
      const prevCollections = new Map<string, string | null>();
      for (const id of ids) {
        const link = links.find((l) => l.id === id);
        if (link) prevCollections.set(id, link.collection_id);
      }

      // Optimistic update
      ids.forEach((id) => {
        updateLink(id, { collection_id: collectionId });
      });
      clearSelection();
      toast().addToast(
        `${ids.length} link${ids.length === 1 ? "" : "s"} moved`,
        "success"
      );

      try {
        await apiClient.patch<ApiResponse<null>>(
          "/links/bulk-move",
          { ids, collection_id: collectionId },
          accessToken
        );
      } catch (err) {
        // Rollback
        for (const [id, prevId] of prevCollections) {
          updateLink(id, { collection_id: prevId });
        }
        const msg =
          err instanceof ApiError ? err.message : "Failed to move links";
        toast().addToast(msg, "error");
      }
    },
    [accessToken, links, updateLink, clearSelection]
  );

  // Go to a specific page — replaces links (not append)
  const goToPage = useCallback(async (page: number) => {
    if (!accessToken || isLoading) return;

    setLoading(true);
    setError(null);

    try {
      const params = buildParams(page);
      const qs = params.toString();
      const endpoint = `/links${qs ? `?${qs}` : ""}`;

      const response = await apiClient.get<PaginatedResponse<Link>>(
        endpoint,
        accessToken
      );

      if (response.success) {
        setLinks(response.data);

        const { total, total_pages } = response.pagination;
        setPagination({
          total,
          totalPages: total_pages,
          hasMore: page < total_pages,
        });

        setFilters({ page });

        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load links.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    isLoading,
    buildParams,
    setLinks,
    setPagination,
    setFilters,
    setLoading,
    setError,
  ]);

  return {
    links,
    isLoading,
    isLoadingMore,
    error,
    filters,
    setFilters,
    refetch: fetchLinks,
    loadMore,
    goToPage,
    hasMore: pagination.hasMore,
    total: pagination.total,
    totalPages: pagination.totalPages,
    currentPage: filters.page || 1,
    deleteLink,
    togglePin,
    toggleReadingStatus,
    bulkDelete,
    bulkMove,
    selectedIds,
    isSelectionMode,
  };
}
