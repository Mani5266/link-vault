"use client";

import { useEffect } from "react";
import { useLinkStore } from "@/stores/linkStore";
import { SHORTCUTS, type ShortcutDef } from "@/hooks/useKeyboardShortcuts";

// ============================================================
// KeyboardShortcutsModal — Editorial help dialog
// Press ? to toggle. Lists all keyboard shortcuts by category.
// ============================================================

const CATEGORY_LABELS: Record<ShortcutDef["category"], string> = {
  navigation: "Navigation",
  actions: "Actions",
  selection: "Selection",
  general: "General",
};

const CATEGORY_ORDER: ShortcutDef["category"][] = [
  "navigation",
  "actions",
  "selection",
  "general",
];

export function KeyboardShortcutsModal() {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useLinkStore();

  // Close on Escape
  useEffect(() => {
    if (!isShortcutsModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShortcutsModalOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isShortcutsModalOpen, setShortcutsModalOpen]);

  if (!isShortcutsModalOpen) return null;

  // Group shortcuts by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    shortcuts: SHORTCUTS.filter((s) => s.category === cat),
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={() => setShortcutsModalOpen(false)}
      />

      {/* Panel */}
      <div className="modal-panel max-w-lg w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-300">
          <div>
            <p className="editorial-label text-paper-faint mb-0.5">Reference</p>
            <h2 className="font-display text-heading font-bold text-paper">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1.5 text-paper-faint hover:text-paper-muted transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {grouped.map(({ category, label, shortcuts }) => (
            <div key={category}>
              <h3 className="editorial-label text-accent mb-3">{label}</h3>
              <div className="space-y-1.5">
                {shortcuts.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-paper-muted font-body">
                      {s.description}
                    </span>
                    <ShortcutKey label={s.label} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-ink-300">
          <p className="text-caption text-paper-faint font-body">
            Shortcuts are disabled when typing in inputs or when a modal is open.
          </p>
        </div>
      </div>
    </>
  );
}

/** Renders a keyboard key badge in editorial style */
function ShortcutKey({ label }: { label: string }) {
  // Handle compound keys like "Shift+A" or "G then H"
  if (label.includes("+")) {
    const parts = label.split("+");
    return (
      <span className="flex items-center gap-1">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-paper-faint text-micro">+</span>}
            <KeyBadge>{part}</KeyBadge>
          </span>
        ))}
      </span>
    );
  }

  if (label.includes(" then ")) {
    const parts = label.split(" then ");
    return (
      <span className="flex items-center gap-1">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-paper-faint text-micro">then</span>}
            <KeyBadge>{part}</KeyBadge>
          </span>
        ))}
      </span>
    );
  }

  return <KeyBadge>{label}</KeyBadge>;
}

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-micro font-mono font-medium text-paper-muted bg-ink-200 border border-ink-400 shadow-sm"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {children}
    </kbd>
  );
}
