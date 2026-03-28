"use client";

// ============================================================
// EmptyState — Editorial empty/search states
// Typographic authority, minimal decoration, warm accent CTA
// ============================================================

interface EmptyStateProps {
  /** Context: "all" for dashboard home, or a collection name */
  context?: "all" | string;
  /** Optional collection emoji */
  emoji?: string;
  /** If set, shows "no results" instead of "empty vault" */
  searchQuery?: string;
  /** Callback to open the Add Link modal */
  onAddLink?: () => void;
}

export function EmptyState({
  context = "all",
  emoji,
  searchQuery,
  onAddLink,
}: EmptyStateProps) {
  const isAll = context === "all";
  const isReadingQueueUnread = context === "reading-queue-unread";
  const isReadingQueueRead = context === "reading-queue-read";
  const isReadingQueue = isReadingQueueUnread || isReadingQueueRead;

  // Search-specific empty state
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 animate-fade-in-up">
        {/* Decorative line */}
        <div className="w-8 h-px bg-ink-400 mb-8" />

        <p className="editorial-label text-paper-faint mb-4">No results</p>

        <h2 className="font-display text-display-sm font-bold text-paper mb-3">
          Nothing found
        </h2>

        <p className="text-sm text-paper-dim max-w-xs leading-relaxed">
          No links matched{" "}
          <span className="text-paper font-medium">&quot;{searchQuery}&quot;</span>.
          Try a different search term or adjust your filters.
        </p>

        {/* Decorative line */}
        <div className="w-8 h-px bg-ink-400 mt-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-fade-in-up">
      {/* Decorative line */}
      <div className="w-8 h-px bg-ink-400 mb-8" />

      {/* Section label */}
      <p className="editorial-label text-paper-faint mb-6">
        {isAll ? "Your Vault" : isReadingQueue ? "Reading Queue" : context}
      </p>

      {/* Emoji — only for collections */}
      {!isAll && !isReadingQueue && (
        <span className="text-4xl mb-4">{emoji || ""}</span>
      )}

      <h2 className="font-display text-display-sm font-bold text-paper mb-3">
        {isAll
          ? "Start your collection"
          : isReadingQueueUnread
            ? "Nothing to read"
            : isReadingQueueRead
              ? "No read links yet"
              : "No links yet"}
      </h2>

      <p className="text-sm text-paper-dim max-w-sm mb-10 leading-relaxed">
        {isAll ? (
          <>
            Add your first link and let AI automatically generate a title,
            description, and tags for it.
          </>
        ) : isReadingQueueUnread ? (
          <>
            Your reading queue is empty. Use the context menu on any link
            to add it to your reading queue.
          </>
        ) : isReadingQueueRead ? (
          <>
            You haven&apos;t marked any links as read yet. Links you finish
            reading will appear here.
          </>
        ) : (
          <>
            Save a link and assign it to{" "}
            <span className="text-paper font-medium">{context}</span>{" "}
            to see it here.
          </>
        )}
      </p>

      {/* Onboarding tips — only on "All Links" empty state */}
      {isAll && (
        <div className="w-full max-w-md mb-10">
          <div className="grid gap-3">
            <OnboardingTip
              step="01"
              title="Paste any URL"
              description="AI will extract the title, summary, and tags automatically."
            />
            <OnboardingTip
              step="02"
              title="Organize into collections"
              description="Move links into collections from the right-click menu."
            />
            <OnboardingTip
              step="03"
              title="Use keyboard shortcuts"
              description="Press ? to see all shortcuts. Press N to quickly add a link."
            />
          </div>
        </div>
      )}

      {onAddLink && !isReadingQueue && (
        <button
          onClick={onAddLink}
          className="btn-primary"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {isAll ? "Add Your First Link" : "Add a Link"}
        </button>
      )}

      {/* Decorative line */}
      <div className="w-8 h-px bg-ink-400 mt-10" />
    </div>
  );
}

// ============================================================
// Onboarding Tip — Small editorial step card
// ============================================================

function OnboardingTip({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-ink-50 border border-ink-300 text-left hover:border-ink-400 hover:bg-ink-100 transition-all duration-200" style={{ borderRadius: "var(--radius-md)" }}>
      <span className="font-mono text-micro text-accent font-bold mt-0.5 shrink-0">
        {step}
      </span>
      <div>
        <p className="text-sm font-medium text-paper">{title}</p>
        <p className="text-xs text-paper-dim mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
