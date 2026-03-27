"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { apiClient } from "@/lib/api";
import type { ApiResponse, Collection } from "@linkvault/shared";

/**
 * useSetup — Runs once after login to initialize the user's account.
 * Calls POST /api/v1/auth/setup to seed default collections if needed,
 * then loads the collections into the store.
 */
export function useSetup() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { setCollections, setLoading } = useCollectionStore();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || hasRun.current) return;

    hasRun.current = true;

    async function setup() {
      try {
        setLoading(true);

        // Call setup endpoint (idempotent — seeds defaults on first login)
        const response = await apiClient.post<ApiResponse<Collection[]>>(
          "/auth/setup",
          {},
          accessToken!
        );

        if (response.success && response.data) {
          setCollections(response.data);
        }
      } catch (error) {
        console.error("Account setup failed:", error);
        // Non-critical — app still works, just no collections loaded
      } finally {
        setLoading(false);
      }
    }

    setup();
  }, [isAuthenticated, accessToken, setCollections, setLoading]);
}
