"use client";

import { useState } from "react";
import { useLinkStore } from "@/stores/linkStore";
import { cn } from "@/lib/utils";

// ============================================================
// BulkActionBar — Editorial floating toolbar for multi-select
// Warm surfaces, hairline borders, uppercase labels
// ============================================================

interface BulkActionBarProps {
  linkIds: string[];
  onBulkDelete: (ids: string[]) => Promise<void> | void;
  onBulkMoveOpen: () => void;
}

export function BulkActionBar({
  linkIds,
  onBulkDelete,
  onBulkMoveOpen,
}: BulkActionBarProps) {
  const {
    selectedIds,
    isSelectionMode,
    selectAll,
    clearSelection,
    setSelectionMode,
  } = useLinkStore();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const count = selectedIds.length;
  const totalCount = linkIds.length;

  // Toggle button to enter/exit selection mode
  if (!isSelectionMode) {
    return (
      <button
        onClick={() => setSelectionMode(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-paper-dim hover:text-paper-muted hover:bg-ink-200 transition-colors font-body"
        style={{ borderRadius: "var(--radius-sm)" }}
        title="Select multiple links"
      >
        <CheckboxIcon />
        <span className="uppercase tracking-editorial text-micro font-medium">Select</span>
      </button>
    );
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsBusy(true);
    try {
      await onBulkDelete(selectedIds);
    } finally {
      setIsBusy(false);
      setConfirmDelete(false);
    }
  }

  function handleCancel() {
    clearSelection();
    setConfirmDelete(false);
  }

  const allSelected = count === totalCount && totalCount > 0;

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-ink-100 border border-ink-300 animate-fade-in flex-wrap"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      {/* Count display */}
      <span className="text-xs text-paper font-medium font-body">
        {isBusy ? (
          <span className="flex items-center gap-1.5">
            <BusySpinner />
            Working...
          </span>
        ) : (
          `${count} selected`
        )}
      </span>

      <div className="h-4 w-px bg-ink-400 hidden sm:block" />

      {/* Select All / Deselect All */}
      <button
        onClick={() => {
          if (allSelected) {
            clearSelection();
          } else {
            selectAll(linkIds);
          }
        }}
        className="text-xs px-2 py-1 text-paper-dim hover:text-paper transition-colors font-body"
      >
        {allSelected ? "Deselect" : <><span className="hidden sm:inline">Select all ({totalCount})</span><span className="sm:hidden">All</span></>}
      </button>

      <div className="h-4 w-px bg-ink-400 hidden sm:block" />

      {/* Move */}
      <button
        onClick={onBulkMoveOpen}
        disabled={count === 0 || isBusy}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-paper-muted hover:bg-ink-200 hover:text-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-body"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <MoveIcon />
        Move
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={count === 0 || isBusy}
        className={cn(
          "flex items-center gap-1 text-xs px-2.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-body",
          confirmDelete
            ? "bg-danger-subtle text-danger"
            : "text-danger hover:bg-danger-subtle"
        )}
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <TrashIcon />
        {confirmDelete ? "Confirm?" : "Delete"}
      </button>

      <div className="h-4 w-px bg-ink-400 hidden sm:block" />

      {/* Cancel */}
      <button
        onClick={handleCancel}
        className="text-xs px-2 py-1 text-paper-faint hover:text-paper-muted transition-colors font-body"
      >
        Cancel
      </button>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================

function CheckboxIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function BusySpinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
