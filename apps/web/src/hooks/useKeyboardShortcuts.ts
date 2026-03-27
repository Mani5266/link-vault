"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { useLinkStore } from "@/stores/linkStore";

// ============================================================
// useKeyboardShortcuts — Global keyboard shortcut engine
// Vim-inspired navigation with modifier key combos
// ============================================================

/** Unique ID for the search input so we can focus it programmatically */
export const SEARCH_INPUT_ID = "linkvault-search-input";

export interface ShortcutDef {
  key: string;
  label: string;
  description: string;
  category: "navigation" | "actions" | "selection" | "general";
}

/** All registered shortcuts for the help modal */
export const SHORTCUTS: ShortcutDef[] = [
  // Navigation
  { key: "J", label: "J", description: "Move focus to next link", category: "navigation" },
  { key: "K", label: "K", description: "Move focus to previous link", category: "navigation" },
  { key: "G H", label: "G then H", description: "Go to Home (All Links)", category: "navigation" },
  { key: "G S", label: "G then S", description: "Go to Settings", category: "navigation" },

  // Actions
  { key: "/", label: "/", description: "Focus search bar", category: "actions" },
  { key: "N", label: "N", description: "Add new link", category: "actions" },
  { key: "O", label: "O", description: "Open focused link in new tab", category: "actions" },
  { key: "E", label: "E", description: "Edit focused link", category: "actions" },
  { key: "Delete", label: "Del", description: "Delete focused link", category: "actions" },
  { key: "P", label: "P", description: "Pin / unpin focused link", category: "actions" },
  { key: "V", label: "V", description: "Toggle grid / list view", category: "actions" },

  // Selection
  { key: "X", label: "X", description: "Toggle select focused link", category: "selection" },
  { key: "Shift+A", label: "Shift+A", description: "Select all / deselect all", category: "selection" },
  { key: "Escape", label: "Esc", description: "Clear selection / close modal / blur", category: "selection" },

  // General
  { key: "?", label: "?", description: "Show keyboard shortcuts", category: "general" },
];

interface UseKeyboardShortcutsOptions {
  /** Links currently visible in the list (in display order) */
  links: { id: string; url: string }[];
  /** Callbacks for link actions */
  onEdit?: (linkId: string) => void;
  onDelete?: (linkId: string) => void;
  onTogglePin?: (linkId: string) => void;
  onToggleSelect?: (linkId: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkMoveOpen?: () => void;
  /** Whether this page has links (dashboard pages, not settings) */
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  links,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleSelect,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const router = useRouter();
  const {
    isAddLinkModalOpen,
    editingLink,
    deletingLink,
    movingLink,
    setAddLinkModalOpen,
    viewMode,
    setViewMode,
  } = useUIStore();

  const {
    focusedIndex,
    setFocusedIndex,
    selectedIds,
    isSelectionMode,
    selectAll,
    clearSelection,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
  } = useLinkStore();

  // Track "G" prefix for two-key combos
  const gPrefixRef = useRef(false);
  const gTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if any modal is open
  const isAnyModalOpen = isAddLinkModalOpen || editingLink !== null || deletingLink !== null || movingLink !== null;

  // Clamp focusedIndex when links array changes
  useEffect(() => {
    if (focusedIndex >= links.length && links.length > 0) {
      setFocusedIndex(links.length - 1);
    } else if (links.length === 0 && focusedIndex !== -1) {
      setFocusedIndex(-1);
    }
  }, [links.length, focusedIndex, setFocusedIndex]);

  // Check if focus is in an input/textarea/contenteditable
  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  }, []);

  // Get the focused link object
  const getFocusedLink = useCallback(() => {
    if (focusedIndex < 0 || focusedIndex >= links.length) return null;
    return links[focusedIndex];
  }, [focusedIndex, links]);

  // Scroll the focused card into view
  const scrollFocusedIntoView = useCallback((index: number) => {
    // Use requestAnimationFrame to ensure the DOM has updated
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-link-index="${index}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept when shortcuts modal is the only thing — let Escape close it
      // But don't process other shortcuts when modals are open
      if (isAnyModalOpen) return;

      // Let the shortcuts modal Escape handler work
      if (isShortcutsModalOpen && e.key !== "Escape") return;

      // Don't intercept when typing in inputs (except for Escape and /)
      if (isInputFocused() && e.key !== "Escape" && e.key !== "/") return;

      const key = e.key;
      const shift = e.shiftKey;
      const ctrl = e.ctrlKey || e.metaKey;

      // ── Two-key "G" prefix combos ──
      if (gPrefixRef.current) {
        gPrefixRef.current = false;
        if (gTimeoutRef.current) {
          clearTimeout(gTimeoutRef.current);
          gTimeoutRef.current = null;
        }

        if (key === "h" || key === "H") {
          e.preventDefault();
          router.push("/");
          return;
        }
        if (key === "s" || key === "S") {
          e.preventDefault();
          router.push("/settings");
          return;
        }
        // Invalid second key — fall through
        return;
      }

      // ── "G" prefix start ──
      if ((key === "g" || key === "G") && !shift && !ctrl && !isInputFocused()) {
        e.preventDefault();
        gPrefixRef.current = true;
        // Timeout: if no second key within 500ms, cancel
        gTimeoutRef.current = setTimeout(() => {
          gPrefixRef.current = false;
        }, 500);
        return;
      }

      // ── Escape ──
      if (key === "Escape") {
        // Close shortcuts modal first
        if (isShortcutsModalOpen) {
          e.preventDefault();
          setShortcutsModalOpen(false);
          return;
        }
        // Blur search input if focused
        if (isInputFocused()) {
          (document.activeElement as HTMLElement)?.blur();
          e.preventDefault();
          return;
        }
        // Clear selection if in selection mode
        if (isSelectionMode) {
          clearSelection();
          e.preventDefault();
          return;
        }
        // Clear focus
        if (focusedIndex >= 0) {
          setFocusedIndex(-1);
          e.preventDefault();
          return;
        }
        return;
      }

      // ── Don't process further if typing in an input ──
      if (isInputFocused()) return;

      // ── ? — Show shortcuts help ──
      if (key === "?" || (shift && key === "/")) {
        e.preventDefault();
        setShortcutsModalOpen(!isShortcutsModalOpen);
        return;
      }

      // ── / — Focus search ──
      if (key === "/" && !ctrl && !shift) {
        e.preventDefault();
        const searchInput = document.getElementById(SEARCH_INPUT_ID);
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // ── N — Add new link ──
      if (key === "n" || key === "N") {
        if (!shift && !ctrl) {
          e.preventDefault();
          setAddLinkModalOpen(true);
          return;
        }
      }

      // ── V — Toggle view mode ──
      if ((key === "v" || key === "V") && !shift && !ctrl) {
        e.preventDefault();
        setViewMode(viewMode === "grid" ? "list" : "grid");
        return;
      }

      // ── J — Move focus down ──
      if ((key === "j" || key === "J") && !ctrl && !shift) {
        e.preventDefault();
        if (links.length === 0) return;
        const next = focusedIndex < links.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(next);
        scrollFocusedIntoView(next);
        return;
      }

      // ── K — Move focus up ──
      if ((key === "k" || key === "K") && !ctrl && !shift) {
        e.preventDefault();
        if (links.length === 0) return;
        const prev = focusedIndex > 0 ? focusedIndex - 1 : links.length - 1;
        setFocusedIndex(prev);
        scrollFocusedIntoView(prev);
        return;
      }

      // ── Actions on focused link ──
      const focused = getFocusedLink();

      // ── O — Open focused link ──
      if ((key === "o" || key === "O") && !ctrl && !shift) {
        if (focused) {
          e.preventDefault();
          window.open(focused.url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      // ── E — Edit focused link ──
      if ((key === "e" || key === "E") && !ctrl && !shift) {
        if (focused) {
          e.preventDefault();
          onEdit?.(focused.id);
        }
        return;
      }

      // ── Delete / Backspace — Delete focused link ──
      if (key === "Delete" || key === "Backspace") {
        if (!ctrl && !shift && focused) {
          e.preventDefault();
          onDelete?.(focused.id);
        }
        return;
      }

      // ── P — Pin/unpin focused link ──
      if ((key === "p" || key === "P") && !ctrl && !shift) {
        if (focused) {
          e.preventDefault();
          onTogglePin?.(focused.id);
        }
        return;
      }

      // ── X — Toggle select focused link ──
      if ((key === "x" || key === "X") && !ctrl && !shift) {
        if (focused) {
          e.preventDefault();
          onToggleSelect?.(focused.id);
        }
        return;
      }

      // ── Shift+A — Select all / Deselect all ──
      if (shift && (key === "a" || key === "A") && !ctrl) {
        e.preventDefault();
        if (selectedIds.length === links.length && links.length > 0) {
          clearSelection();
        } else {
          selectAll(links.map((l) => l.id));
        }
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (gTimeoutRef.current) {
        clearTimeout(gTimeoutRef.current);
      }
    };
  }, [
    enabled,
    isAnyModalOpen,
    isShortcutsModalOpen,
    isInputFocused,
    isSelectionMode,
    focusedIndex,
    links,
    viewMode,
    selectedIds,
    router,
    setAddLinkModalOpen,
    setViewMode,
    setFocusedIndex,
    setShortcutsModalOpen,
    clearSelection,
    selectAll,
    getFocusedLink,
    scrollFocusedIntoView,
    onEdit,
    onDelete,
    onTogglePin,
    onToggleSelect,
  ]);

  return {
    focusedIndex,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
  };
}
