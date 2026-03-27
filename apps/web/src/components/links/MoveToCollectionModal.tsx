"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useLinkStore } from "@/stores/linkStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useToast } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import type { Link, ApiResponse } from "@linkvault/shared";

// ============================================================
// MoveToCollectionModal — Editorial collection picker
// Warm surfaces, accent active state, editorial typography
// ============================================================

interface MoveToCollectionModalProps {
  link: Link | null;
  onClose: () => void;
}

export function MoveToCollectionModal({
  link,
  onClose,
}: MoveToCollectionModalProps) {
  const { accessToken } = useAuthStore();
  const { updateLink } = useLinkStore();
  const { collections } = useCollectionStore();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Init selected to current collection
  useEffect(() => {
    if (link) {
      setSelectedId(link.collection_id);
      setError(null);
      setIsSubmitting(false);
    }
  }, [link]);

  // Close on Escape
  useEffect(() => {
    if (!link) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [link, onClose]);

  if (!link) return null;

  async function handleMove() {
    if (!accessToken || !link) return;

    // No change
    if (selectedId === link.collection_id) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.patch<ApiResponse<Link>>(
        `/links/${link.id}`,
        { collection_id: selectedId },
        accessToken
      );

      if (response.success && response.data) {
        updateLink(link.id, response.data);
        const targetName = selectedId
          ? collections.find((c) => c.id === selectedId)?.name || "collection"
          : "No Collection";
        toast.success(`Moved to ${targetName}`);
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("Failed to move link.");
        toast.error("Failed to move link");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
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
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Move to Collection</h2>
          <button
            onClick={onClose}
            className="p-1 text-paper-dim hover:text-paper transition-colors"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Collection list */}
        <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto">
          {/* No collection option */}
          <CollectionOption
            emoji=""
            name="No Collection"
            selected={selectedId === null}
            onClick={() => setSelectedId(null)}
          />

          {collections.map((col) => (
            <CollectionOption
              key={col.id}
              emoji={col.emoji}
              name={col.name}
              linkCount={col.link_count}
              selected={selectedId === col.id}
              onClick={() => setSelectedId(col.id)}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="px-6 pb-2 text-sm text-danger font-body">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 p-4 border-t border-ink-300">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 btn-ghost justify-center"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={isSubmitting}
            className="flex-1 btn-primary justify-center"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                Moving...
              </>
            ) : (
              "Move"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CollectionOption({
  emoji,
  name,
  linkCount,
  selected,
  onClick,
}: {
  emoji: string;
  name: string;
  linkCount?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors font-body ${
        selected
          ? "bg-accent-subtle text-accent border border-accent/20"
          : "text-paper-muted hover:bg-ink-200 hover:text-paper"
      }`}
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      <span className="text-base">{emoji}</span>
      <span className="flex-1 text-left">{name}</span>
      {linkCount !== undefined && (
        <span className="text-micro text-paper-faint tabular-nums">{linkCount}</span>
      )}
      {selected && (
        <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
