"use client";

import { useState, useRef, useEffect } from "react";
import { useCollectionStore } from "@/stores/collectionStore";

// ============================================================
// BulkMoveModal — Editorial bulk move collection picker
// ============================================================

interface BulkMoveModalProps {
  isOpen: boolean;
  selectedCount: number;
  onMove: (collectionId: string | null) => void;
  onClose: () => void;
}

export function BulkMoveModal({
  isOpen,
  selectedCount,
  onMove,
  onClose,
}: BulkMoveModalProps) {
  const { collections } = useCollectionStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Reset selection on open
  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
          <h2 className="modal-title">
            Move {selectedCount} link{selectedCount === 1 ? "" : "s"}
          </h2>
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

        {/* Actions */}
        <div className="flex items-center gap-3 p-4 border-t border-ink-300">
          <button
            onClick={onClose}
            className="flex-1 btn-ghost justify-center"
          >
            Cancel
          </button>
          <button
            onClick={() => onMove(selectedId)}
            className="flex-1 btn-primary justify-center"
          >
            Move
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
