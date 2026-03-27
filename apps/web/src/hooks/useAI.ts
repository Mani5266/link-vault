"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useLinkStore } from "@/stores/linkStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import type {
  Link,
  AISummaryResponse,
  AITagSuggestionResponse,
  AISemanticSearchResult,
  AIDigestResponse,
  ApiResponse,
} from "@linkvault/shared";

// ============================================================
// useAI — Standalone AI summarization + re-analyze + tag suggestions
// ============================================================

export type AIStatus = "idle" | "processing" | "success" | "error";

interface UseAIReturn {
  status: AIStatus;
  error: string | null;
  /** Call POST /api/v1/ai/summarize for a preview (does NOT save) */
  summarize: (url: string, collectionName?: string) => Promise<AISummaryResponse | null>;
  /** Re-analyze an existing link: calls AI then PATCHes the link */
  reAnalyze: (link: Link, collectionName?: string) => Promise<Link | null>;
  /** Suggest tags for a URL based on its content */
  suggestTags: (url: string, options?: {
    title?: string;
    description?: string;
    existingTags?: string[];
  }) => Promise<string[]>;
  tagSuggestions: string[];
  tagSuggestionsLoading: boolean;
  clearTagSuggestions: () => void;
  /** Semantic search — interprets a natural language query into structured filters */
  semanticSearch: (query: string) => Promise<AISemanticSearchResult | null>;
  /** Generate a weekly AI digest of recently saved links */
  generateDigest: (days?: number) => Promise<AIDigestResponse | null>;
  reset: () => void;
}

export function useAI(): UseAIReturn {
  const { accessToken } = useAuthStore();
  const { updateLink } = useLinkStore();

  const [status, setStatus] = useState<AIStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagSuggestionsLoading, setTagSuggestionsLoading] = useState(false);

  const summarize = useCallback(
    async (url: string, collectionName?: string): Promise<AISummaryResponse | null> => {
      if (!accessToken) return null;

      setStatus("processing");
      setError(null);

      try {
        const body: { url: string; collection_name?: string } = { url };
        if (collectionName) body.collection_name = collectionName;

        const response = await apiClient.post<ApiResponse<AISummaryResponse>>(
          "/ai/summarize",
          body,
          accessToken
        );

        if (response.success && response.data) {
          setStatus("success");
          return response.data;
        }

        setStatus("error");
        setError("AI returned an unexpected response.");
        return null;
      } catch (err) {
        setStatus("error");
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("AI analysis failed.");
        }
        return null;
      }
    },
    [accessToken]
  );

  const reAnalyze = useCallback(
    async (link: Link, collectionName?: string): Promise<Link | null> => {
      if (!accessToken) return null;

      setStatus("processing");
      setError(null);

      try {
        // Step 1: Get AI summary
        const body: { url: string; collection_name?: string } = { url: link.url };
        if (collectionName) body.collection_name = collectionName;

        const aiResponse = await apiClient.post<ApiResponse<AISummaryResponse>>(
          "/ai/summarize",
          body,
          accessToken
        );

        if (!aiResponse.success || !aiResponse.data) {
          setStatus("error");
          setError("AI returned an unexpected response.");
          return null;
        }

        const aiData = aiResponse.data;

        // Step 2: Update the link with AI data
        const updateResponse = await apiClient.patch<ApiResponse<Link>>(
          `/links/${link.id}`,
          {
            title: aiData.title,
            description: aiData.description,
            tags: aiData.tags,
            category: aiData.category,
            emoji: aiData.emoji,
          },
          accessToken
        );

        if (updateResponse.success && updateResponse.data) {
          updateLink(link.id, updateResponse.data);
          setStatus("success");
          useToastStore.getState().addToast("AI analysis complete", "success");
          return updateResponse.data;
        }

        setStatus("error");
        setError("Failed to update link with AI data.");
        useToastStore.getState().addToast("Failed to update link with AI data", "error");
        return null;
      } catch (err) {
        setStatus("error");
        if (err instanceof ApiError) {
          setError(err.message);
          useToastStore.getState().addToast(err.message, "error");
        } else {
          setError("Re-analysis failed.");
          useToastStore.getState().addToast("Re-analysis failed", "error");
        }
        return null;
      }
    },
    [accessToken, updateLink]
  );

  const suggestTags = useCallback(
    async (
      url: string,
      options?: { title?: string; description?: string; existingTags?: string[] }
    ): Promise<string[]> => {
      if (!accessToken) return [];

      setTagSuggestionsLoading(true);
      setTagSuggestions([]);

      try {
        const body: {
          url: string;
          title?: string;
          description?: string;
          existing_tags?: string[];
        } = { url };

        if (options?.title) body.title = options.title;
        if (options?.description) body.description = options.description;
        if (options?.existingTags && options.existingTags.length > 0) {
          body.existing_tags = options.existingTags;
        }

        const response = await apiClient.post<ApiResponse<AITagSuggestionResponse>>(
          "/ai/suggest-tags",
          body,
          accessToken
        );

        if (response.success && response.data) {
          setTagSuggestions(response.data.suggestions);
          return response.data.suggestions;
        }

        return [];
      } catch (err) {
        if (err instanceof ApiError) {
          useToastStore.getState().addToast(err.message, "error");
        } else {
          useToastStore.getState().addToast("Tag suggestion failed", "error");
        }
        return [];
      } finally {
        setTagSuggestionsLoading(false);
      }
    },
    [accessToken]
  );

  const clearTagSuggestions = useCallback(() => {
    setTagSuggestions([]);
  }, []);

  const semanticSearch = useCallback(
    async (query: string): Promise<AISemanticSearchResult | null> => {
      if (!accessToken || !query.trim()) return null;

      try {
        const response = await apiClient.post<ApiResponse<AISemanticSearchResult>>(
          "/ai/semantic-search",
          { query: query.trim() },
          accessToken
        );

        if (response.success && response.data) {
          return response.data;
        }

        return null;
      } catch (err) {
        if (err instanceof ApiError) {
          useToastStore.getState().addToast(err.message, "error");
        } else {
          useToastStore.getState().addToast("AI search failed", "error");
        }
        return null;
      }
    },
    [accessToken]
  );

  const generateDigest = useCallback(
    async (days: number = 7): Promise<AIDigestResponse | null> => {
      if (!accessToken) return null;

      try {
        const response = await apiClient.post<ApiResponse<AIDigestResponse>>(
          "/ai/digest",
          { days },
          accessToken
        );

        if (response.success && response.data) {
          return response.data;
        }

        return null;
      } catch (err) {
        if (err instanceof ApiError) {
          useToastStore.getState().addToast(err.message, "error");
        } else {
          useToastStore.getState().addToast("Digest generation failed", "error");
        }
        return null;
      }
    },
    [accessToken]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTagSuggestions([]);
    setTagSuggestionsLoading(false);
  }, []);

  return {
    status,
    error,
    summarize,
    reAnalyze,
    suggestTags,
    tagSuggestions,
    tagSuggestionsLoading,
    clearTagSuggestions,
    semanticSearch,
    generateDigest,
    reset,
  };
}
