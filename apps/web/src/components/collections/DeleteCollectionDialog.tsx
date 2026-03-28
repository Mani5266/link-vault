"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useToast } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import type { Collection, ApiResponse } from "@linkvault/shared";

// ============================================================
// DeleteCollectionDialog — Editorial delete confirmation
// ============================================================

interface DeleteCollectionDialogProps {
  collection: Collection | null;
  onClose: () => void;
}

export function DeleteCollectionDialog({
  collection,
  onClose,
}: DeleteCollectionDialogProps) {
  const { accessToken } = useAuthStore();
  const { removeCollection, collections } = useCollectionStore();
  const toast = useToast();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Count child collections
  const childCount = collection
    ? collections.filter((c) => c.parent_id === collection.id).length
    : 0;

  // Reset state when collection changes
  useEffect(() => {
    if (collection) {
      setIsDeleting(false);
      setError(null);
    }
  }, [collection]);

  // Close on Escape
  useEffect(() => {
    if (!collection) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [collection, onClose]);

  if (!collection) return null;

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleConfirm() {
    if (!collection || !accessToken) return;

    try {
      setError(null);
      setIsDeleting(true);

      await apiClient.delete<ApiResponse<null>>(
        `/collections/${collection.id}`,
        accessToken
      );

      removeCollection(collection.id);
      toast.success(`"${collection.name}" deleted`);
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to delete collection.";
      setError(msg);
      setIsDeleting(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 animate-fade-in"
      style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm mx-4 border border-ink-300 bg-ink-50 shadow-lg animate-slide-up"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        {/* Icon */}
        <div className="flex justify-center pt-6">
          <div
            className="w-12 h-12 bg-danger-subtle flex items-center justify-center"
            style={{ borderRadius: "50%" }}
          >
            <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-2 text-center">
          <h3 className="font-display font-bold text-heading text-paper mb-2">Delete Collection</h3>
          <p className="text-sm text-paper-dim leading-relaxed font-body">
            Are you sure you want to delete{" "}
            <span className="text-paper font-medium">
              {collection.emoji} &quot;{collection.name}&quot;
            </span>
            ?{childCount > 0 && (
              <span className="text-danger font-medium">
                {" "}This will also delete {childCount} sub-collection{childCount !== 1 ? "s" : ""}.
              </span>
            )}{" "}
            Links will become uncategorized. This action cannot be undone.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6">
            <p className="text-sm text-danger text-center font-body">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 p-6">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 btn-ghost justify-center border border-ink-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 btn-danger justify-center"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
