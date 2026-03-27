"use client";

import { useRef, useEffect } from "react";
import type { Link } from "@linkvault/shared";

// ============================================================
// DeleteConfirmDialog — Editorial delete confirmation
// Warm danger tones, editorial typography, sharp corners
// ============================================================

interface DeleteConfirmDialogProps {
  link: Link | null;
  onConfirm: (link: Link) => void;
  onClose: () => void;
}

export function DeleteConfirmDialog({
  link,
  onConfirm,
  onClose,
}: DeleteConfirmDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

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

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleConfirm() {
    onConfirm(link!);
    onClose();
  }

  const displayTitle = link.title || link.domain || link.url;

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
          <h3 className="font-display font-bold text-heading text-paper mb-2">Delete Link</h3>
          <p className="text-sm text-paper-dim leading-relaxed font-body">
            Are you sure you want to delete{" "}
            <span className="text-paper font-medium">
              &quot;{displayTitle.length > 50 ? displayTitle.slice(0, 50) + "..." : displayTitle}&quot;
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6">
          <button
            onClick={onClose}
            className="flex-1 btn-ghost justify-center border border-ink-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 btn-danger justify-center"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
