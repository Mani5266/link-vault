"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useToast } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import type { Collection, ApiResponse } from "@linkvault/shared";

// Common emojis for collections
const EMOJI_OPTIONS = [
  "\u{1F4C1}", "\u{1F4C2}", "\u{1F4DA}", "\u{1F4D6}", "\u{1F4DD}", "\u{1F4CC}", "\u{1F4CE}", "\u{1F516}",
  "\u{1F4BC}", "\u{1F4B0}", "\u{1F4CA}", "\u{1F4C8}", "\u{1F3E0}", "\u{1F3E2}", "\u{1F3D7}\uFE0F", "\u{1F527}",
  "\u{1F4BB}", "\u{1F4F1}", "\u{1F5A5}\uFE0F", "\u2328\uFE0F", "\u{1F3AE}", "\u{1F3AF}", "\u{1F3A8}", "\u{1F3AC}",
  "\u{1F3B5}", "\u{1F3A7}", "\u{1F4F7}", "\u{1F3A5}", "\u{1F373}", "\u{1F355}", "\u{1F957}", "\u2615",
  "\u{1F4AA}", "\u{1F3C3}", "\u{1F9D8}", "\u26BD", "\u{1F3C0}", "\u{1F3BE}", "\u{1F697}", "\u2708\uFE0F",
  "\u{1F30D}", "\u{1F5FA}\uFE0F", "\u{1F4CD}", "\u{1F3D6}\uFE0F", "\u{1F6D2}", "\u{1F6CD}\uFE0F", "\u{1F381}", "\u{1F4A1}",
  "\u{1F52C}", "\u{1F9EA}", "\u{1F4D0}", "\u{1F511}", "\u2764\uFE0F", "\u2B50", "\u{1F525}", "\u2705",
  "\u{1F4F0}", "\u{1F5DE}\uFE0F", "\u{1F4AC}", "\u2709\uFE0F", "\u{1F9E0}", "\u{1F393}", "\u{1F4CB}", "\u{1F5C2}\uFE0F",
];

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCollectionModal({ isOpen, onClose }: AddCollectionModalProps) {
  const { accessToken } = useAuthStore();
  const { addCollection } = useCollectionStore();
  const toast = useToast();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("\u{1F4C1}");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setName("");
      setEmoji("\u{1F4C1}");
      setShowEmojiPicker(false);
      setError(null);
      setIsSubmitting(false);
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a collection name.");
      return;
    }

    if (!accessToken) {
      setError("Not authenticated.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const response = await apiClient.post<ApiResponse<Collection>>(
        "/collections",
        { name: trimmed, emoji },
        accessToken
      );

      if (response.success && response.data) {
        addCollection(response.data);
        toast.success(`"${trimmed}" collection created`);
        onClose();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to create collection.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="modal-backdrop !pt-[20vh]"
    >
      <div className="modal-panel max-w-md">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">New Collection</h2>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name + Emoji row */}
          <div>
            <label
              htmlFor="collection-name"
              className="editorial-label text-paper-dim mb-2 block"
            >
              Name
            </label>
            <div className="flex gap-2">
              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center justify-center w-11 h-11 bg-ink-50 border border-ink-300 hover:border-ink-400 text-xl transition-colors shrink-0"
                style={{ borderRadius: "var(--radius-sm)" }}
                title="Pick an emoji"
              >
                {emoji}
              </button>

              {/* Name Input */}
              <input
                ref={inputRef}
                id="collection-name"
                type="text"
                placeholder="e.g. Travel, Music, Work..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                maxLength={50}
                className="flex-1 input-editorial"
              />
            </div>
          </div>

          {/* Emoji Picker Grid */}
          {showEmojiPicker && (
            <div
              className="border border-ink-300 bg-ink-100 p-3"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <p className="editorial-label text-paper-faint mb-2">Pick an icon</p>
              <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setEmoji(e);
                      setShowEmojiPicker(false);
                    }}
                    className={`w-9 h-9 flex items-center justify-center text-lg hover:bg-ink-200 transition-colors ${
                      emoji === e
                        ? "bg-accent-subtle ring-1 ring-accent/30"
                        : ""
                    }`}
                    style={{ borderRadius: "var(--radius-sm)" }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-sm text-danger font-body">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Collection"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
