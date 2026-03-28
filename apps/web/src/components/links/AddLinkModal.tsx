"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useLinkStore } from "@/stores/linkStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useUIStore } from "@/stores/uiStore";
import { useToast } from "@/stores/toastStore";
import { useAI } from "@/hooks/useAI";
import { apiClient, ApiError } from "@/lib/api";
import { isValidUrl, LIMITS } from "@linkvault/shared";
import type { Link, ApiResponse } from "@linkvault/shared";

// ============================================================
// AddLinkModal — Editorial modal with AI processing steps
// Uses modal-backdrop/panel/header/title classes + editorial inputs
// ============================================================

type AIStep = "idle" | "saving" | "analyzing" | "done" | "error";
type ErrorKind = "save" | "ai";

export function AddLinkModal() {
  const { isAddLinkModalOpen, setAddLinkModalOpen } = useUIStore();
  const { accessToken } = useAuthStore();
  const { addLink, updateLink } = useLinkStore();
  const { collections } = useCollectionStore();
  const toast = useToast();
  const {
    suggestTags,
    tagSuggestions,
    tagSuggestionsLoading,
    clearTagSuggestions,
    reset: resetAI,
  } = useAI();

  const [url, setUrl] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStep, setAiStep] = useState<AIStep>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>("save");
  const [savedLink, setSavedLink] = useState<Link | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isAddLinkModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset state on close
      setUrl("");
      setCollectionId(null);
      setError(null);
      setAiStep("idle");
      setErrorKind("save");
      setIsSubmitting(false);
      setSavedLink(null);
      resetAI();
    }
  }, [isAddLinkModalOpen, resetAI]);

  // Close on Escape
  useEffect(() => {
    if (!isAddLinkModalOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAddLinkModalOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isAddLinkModalOpen, setAddLinkModalOpen]);

  if (!isAddLinkModalOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }

    if (!isValidUrl(trimmed)) {
      setError("Please enter a valid URL (e.g. https://example.com).");
      return;
    }

    setIsSubmitting(true);
    setAiStep("saving");

    const analyzeTimer = setTimeout(() => setAiStep("analyzing"), 800);

    try {
      const body: { url: string; collection_id?: string } = { url: trimmed };
      if (collectionId) {
        body.collection_id = collectionId;
      }

      const response = await apiClient.post<ApiResponse<Link>>(
        "/links",
        body,
        accessToken!
      );

      clearTimeout(analyzeTimer);

      if (response.success && response.data) {
        addLink(response.data);
        setSavedLink(response.data);
        setAiStep("done");
        toast.success("Link saved");
        // Don't auto-close — let user see the result and optionally suggest tags
      }
    } catch (err) {
      clearTimeout(analyzeTimer);
      const msg = err instanceof ApiError ? err.message : "Failed to save link. Please try again.";
      setError(msg);
      setErrorKind("save");
      setAiStep("error");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSuggestMoreTags() {
    if (!savedLink) return;
    await suggestTags(savedLink.url, {
      title: savedLink.title || undefined,
      description: savedLink.description || undefined,
      existingTags: savedLink.tags.length > 0 ? savedLink.tags : undefined,
    });
  }

  async function handleAddSuggestedTag(tag: string) {
    if (!savedLink || !accessToken) return;
    const currentTags = savedLink.tags || [];
    if (currentTags.includes(tag)) return;
    if (currentTags.length >= LIMITS.MAX_TAGS_PER_LINK) {
      toast.error(`Maximum ${LIMITS.MAX_TAGS_PER_LINK} tags allowed`);
      return;
    }

    const newTags = [...currentTags, tag];

    try {
      const response = await apiClient.patch<ApiResponse<Link>>(
        `/links/${savedLink.id}`,
        { tags: newTags },
        accessToken
      );

      if (response.success && response.data) {
        updateLink(savedLink.id, response.data);
        setSavedLink(response.data);
        toast.success(`Tag "${tag}" added`);
      }
    } catch {
      toast.error("Failed to add tag");
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) {
      setAddLinkModalOpen(false);
    }
  }

  // Filter out tags already on the saved link
  const existingTagsLower = new Set((savedLink?.tags || []).map((t) => t.toLowerCase()));
  const visibleSuggestions = tagSuggestions.filter(
    (t) => !existingTagsLower.has(t.toLowerCase())
  );

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="modal-backdrop"
    >
      <div className="modal-panel max-w-lg">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Add Link</h2>
          <button
            onClick={() => setAddLinkModalOpen(false)}
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
          {/* URL Input */}
          <div>
            <label htmlFor="add-link-url" className="editorial-label text-paper-dim mb-2 block">
              URL
            </label>
            <input
              ref={inputRef}
              id="add-link-url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting || aiStep === "done"}
              className="input-editorial font-mono text-sm"
            />
          </div>

          {/* Collection Picker */}
          <div>
            <label htmlFor="add-link-collection" className="editorial-label text-paper-dim mb-2 block">
              Collection <span className="text-paper-faint font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <select
              id="add-link-collection"
              value={collectionId || ""}
              onChange={(e) => setCollectionId(e.target.value || null)}
              disabled={isSubmitting || aiStep === "done"}
              className="input-editorial appearance-none cursor-pointer"
            >
              <option value="">No collection</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.emoji} {col.name}
                </option>
              ))}
            </select>
          </div>

          {/* AI Processing Status */}
          <AIStatusIndicator
            step={aiStep}
            errorKind={errorKind}
            savedLink={savedLink}
            tagSuggestions={visibleSuggestions}
            tagSuggestionsLoading={tagSuggestionsLoading}
            onSuggestTags={handleSuggestMoreTags}
            onAddTag={handleAddSuggestedTag}
          />

          {/* Error */}
          {error && (
            <p className="text-sm text-danger font-body">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddLinkModalOpen(false)}
              className="btn-ghost"
            >
              {aiStep === "done" ? "Done" : "Cancel"}
            </button>
            {aiStep !== "done" && (
              <button
                type="submit"
                disabled={isSubmitting || !url.trim()}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner />
                    Saving...
                  </>
                ) : (
                  "Save Link"
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// AI Status Indicator — Editorial multi-step progress
// Gold accent for AI, warm surfaces, clean typography
// ============================================================

interface AIStatusProps {
  step: AIStep;
  errorKind: ErrorKind;
  savedLink: Link | null;
  tagSuggestions: string[];
  tagSuggestionsLoading: boolean;
  onSuggestTags: () => void;
  onAddTag: (tag: string) => void;
}

function AIStatusIndicator({
  step,
  errorKind,
  savedLink,
  tagSuggestions,
  tagSuggestionsLoading,
  onSuggestTags,
  onAddTag,
}: AIStatusProps) {
  if (step === "idle") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-gold-subtle border border-gold/10"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <svg className="w-3.5 h-3.5 text-gold" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1.323l.954.416a1 1 0 01-.954 1.822L10 6.155l-1 .406a1 1 0 01-.954-1.822L9 4.323V3a1 1 0 011-1z" />
        </svg>
        <span className="text-xs text-paper-dim font-body">
          AI will auto-generate title, description, tags & category
        </span>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-danger-subtle border border-danger/10"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <svg className="w-3.5 h-3.5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="text-xs text-danger font-body">
          {errorKind === "ai"
            ? "AI analysis failed. The link was saved with basic metadata."
            : "Failed to save link. Please check the URL and try again."}
        </span>
      </div>
    );
  }

  return (
    <div
      className="bg-ink-100 border border-ink-300 overflow-hidden"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      {/* Progress Steps */}
      <div className="px-3 py-2.5 space-y-1.5">
        <StepRow
          label="Saving link"
          status={step === "saving" ? "active" : "done"}
        />
        <StepRow
          label="AI analyzing content"
          status={
            step === "saving" ? "pending" :
            step === "analyzing" ? "active" : "done"
          }
        />
        <StepRow
          label="Generating metadata"
          status={step === "done" ? "done" : "pending"}
        />
      </div>

      {/* Result Preview — shown when done */}
      {step === "done" && savedLink && (
        <div className="px-3 py-2.5 border-t border-ink-300 bg-success-subtle space-y-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium text-success font-body">Saved with AI metadata</span>
          </div>
          {savedLink.title && (
            <p className="text-xs text-paper-muted truncate font-body">
              <span className="text-paper-dim">Title:</span> {savedLink.title}
            </p>
          )}
          {savedLink.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-paper-dim font-body">Tags:</span>
              {savedLink.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-micro font-medium bg-accent-subtle text-accent"
                  style={{ borderRadius: "2px" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* AI Tag Suggestions */}
          <div className="pt-1 border-t border-ink-300/50">
            {tagSuggestions.length > 0 ? (
              <div>
                <p className="text-micro text-gold mb-1.5 font-body font-medium">
                  More tag suggestions — click to add
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tagSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onAddTag(tag)}
                      className="px-2 py-0.5 text-xs font-body font-medium bg-gold-subtle text-gold border border-gold/20 hover:bg-gold-muted hover:border-gold/40 transition-colors cursor-pointer"
                      style={{ borderRadius: "var(--radius-sm)" }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSuggestTags}
                disabled={tagSuggestionsLoading}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium font-body bg-gold-subtle text-gold hover:bg-gold-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {tagSuggestionsLoading ? (
                  <>
                    <TagSpinner />
                    Suggesting tags...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Suggest more tags with AI
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-2">
      {status === "pending" && (
        <div className="w-3.5 h-3.5 border border-ink-400" style={{ borderRadius: "50%" }} />
      )}
      {status === "active" && (
        <LoadingSpinner />
      )}
      {status === "done" && (
        <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span className={`text-xs font-body ${
        status === "pending" ? "text-paper-faint" :
        status === "active" ? "text-paper" :
        "text-paper-muted"
      }`}>
        {label}
      </span>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
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
