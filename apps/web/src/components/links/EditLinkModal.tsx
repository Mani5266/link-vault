"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useLinkStore } from "@/stores/linkStore";
import { useAI } from "@/hooks/useAI";
import { useToast } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import { LINK_CATEGORIES } from "@linkvault/shared";
import { LIMITS } from "@linkvault/shared";
import type { Link, LinkUpdate, ApiResponse } from "@linkvault/shared";

// ============================================================
// EditLinkModal — Editorial edit form
// modal-* classes, input-editorial, editorial labels
// ============================================================

interface EditLinkModalProps {
  link: Link | null;
  onClose: () => void;
}

export function EditLinkModal({ link, onClose }: EditLinkModalProps) {
  const { accessToken } = useAuthStore();
  const { updateLink } = useLinkStore();
  const {
    summarize,
    status: aiStatus,
    error: aiError,
    reset: resetAI,
    suggestTags,
    tagSuggestions,
    tagSuggestionsLoading,
    clearTagSuggestions,
  } = useAI();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Populate fields when link changes
  useEffect(() => {
    if (link) {
      setTitle(link.title || "");
      setDescription(link.description || "");
      setTagsInput(link.tags.join(", "));
      setCategory(link.category || "");
      setEmoji(link.emoji || "");
      setError(null);
      setIsSubmitting(false);
      resetAI();
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [link, resetAI]);

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

  function parseTags(input: string): string[] {
    return input
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .slice(0, LIMITS.MAX_TAGS_PER_LINK);
  }

  async function handleReAnalyze() {
    if (!link) return;
    const result = await summarize(link.url);
    if (result) {
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.tags && result.tags.length > 0) setTagsInput(result.tags.join(", "));
      if (result.category) setCategory(result.category);
      if (result.emoji) setEmoji(result.emoji);
      toast.success("AI suggestions applied");
    } else {
      toast.error("AI analysis failed");
    }
  }

  async function handleSuggestTags() {
    if (!link) return;
    const currentTags = parseTags(tagsInput);
    await suggestTags(link.url, {
      title: title || undefined,
      description: description || undefined,
      existingTags: currentTags.length > 0 ? currentTags : undefined,
    });
  }

  function handleAddSuggestedTag(tag: string) {
    const currentTags = parseTags(tagsInput);
    if (currentTags.includes(tag)) return;
    if (currentTags.length >= LIMITS.MAX_TAGS_PER_LINK) {
      toast.error(`Maximum ${LIMITS.MAX_TAGS_PER_LINK} tags allowed`);
      return;
    }
    const newTags = [...currentTags, tag];
    setTagsInput(newTags.join(", "));
    // Remove from suggestions
    clearTagSuggestions();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !link) return;

    setError(null);
    setIsSubmitting(true);

    const updates: LinkUpdate = {};

    if (title !== (link.title || "")) updates.title = title;
    if (description !== (link.description || "")) updates.description = description;

    const newTags = parseTags(tagsInput);
    if (JSON.stringify(newTags) !== JSON.stringify(link.tags)) updates.tags = newTags;

    if (category !== (link.category || "")) updates.category = category as any;
    if (emoji !== (link.emoji || "")) updates.emoji = emoji;

    // Nothing changed
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    try {
      const response = await apiClient.patch<ApiResponse<Link>>(
        `/links/${link.id}`,
        updates,
        accessToken
      );

      if (response.success && response.data) {
        updateLink(link.id, response.data);
        toast.success("Changes saved");
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("Failed to update link.");
        toast.error("Failed to update link");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  // Filter out tags that are already in the input
  const currentTagsLower = new Set(parseTags(tagsInput).map((t) => t.toLowerCase()));
  const visibleSuggestions = tagSuggestions.filter(
    (t) => !currentTagsLower.has(t.toLowerCase())
  );

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="modal-backdrop !pt-[10vh]"
    >
      <div className="modal-panel max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="modal-header sticky top-0 bg-ink-50 z-10">
          <h2 className="modal-title">Edit Link</h2>
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

        {/* URL display (non-editable) */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="editorial-label text-paper-faint mb-1">URL</p>
              <p className="mono-domain text-sm truncate">{link.url}</p>
            </div>
            <button
              type="button"
              onClick={handleReAnalyze}
              disabled={aiStatus === "processing" || isSubmitting}
              className="shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-body bg-gold-subtle text-gold hover:bg-gold-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {aiStatus === "processing" ? (
                <>
                  <LoadingSpinner />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l.954.416a1 1 0 01-.954 1.822L10 6.155l-1 .406a1 1 0 01-.954-1.822L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                  Re-analyze with AI
                </>
              )}
            </button>
          </div>
          {aiStatus === "success" && (
            <p className="text-xs text-success mt-1.5 font-body">AI suggestions applied to fields below. Review and save.</p>
          )}
          {aiError && (
            <p className="text-xs text-danger mt-1.5 font-body">{aiError}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="editorial-label text-paper-dim mb-2 block">
              Title
            </label>
            <input
              ref={titleRef}
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={LIMITS.MAX_TITLE_LENGTH}
              disabled={isSubmitting}
              className="input-editorial"
              placeholder="Link title"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-description" className="editorial-label text-paper-dim mb-2 block">
              Description
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={LIMITS.MAX_DESCRIPTION_LENGTH}
              disabled={isSubmitting}
              rows={3}
              className="input-editorial resize-none"
              placeholder="Short description"
            />
            <p className="text-micro text-paper-faint mt-1 text-right tabular-nums">
              {description.length}/{LIMITS.MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="edit-tags" className="editorial-label text-paper-dim">
                Tags <span className="text-paper-faint font-normal normal-case tracking-normal">(comma-separated, max {LIMITS.MAX_TAGS_PER_LINK})</span>
              </label>
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={tagSuggestionsLoading || isSubmitting}
                className="flex items-center gap-1 px-2 py-1 text-micro font-medium font-body bg-gold-subtle text-gold hover:bg-gold-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {tagSuggestionsLoading ? (
                  <>
                    <TagSpinner />
                    Suggesting...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    AI Suggest
                  </>
                )}
              </button>
            </div>
            <input
              id="edit-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={isSubmitting}
              className="input-editorial"
              placeholder="react, tutorial, typescript"
            />

            {/* AI Tag Suggestions */}
            {visibleSuggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-micro text-gold mb-1.5 font-body font-medium">
                  AI Suggestions — click to add
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {visibleSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddSuggestedTag(tag)}
                      className="px-2 py-0.5 text-xs font-body font-medium bg-gold-subtle text-gold border border-gold/20 hover:bg-gold-muted hover:border-gold/40 transition-colors cursor-pointer"
                      style={{ borderRadius: "var(--radius-sm)" }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category + Emoji row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label htmlFor="edit-category" className="editorial-label text-paper-dim mb-2 block">
                Category
              </label>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
                className="input-editorial appearance-none cursor-pointer"
              >
                <option value="">None</option>
                {LINK_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Emoji */}
            <div>
              <label htmlFor="edit-emoji" className="editorial-label text-paper-dim mb-2 block">
                Emoji
              </label>
              <input
                id="edit-emoji"
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                disabled={isSubmitting}
                maxLength={4}
                className="input-editorial text-center text-lg"
                placeholder=""
              />
            </div>
          </div>

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
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
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

function TagSpinner() {
  return (
    <svg className="w-3 h-3 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
