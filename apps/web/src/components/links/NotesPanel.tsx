"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { ApiResponse, LinkNote } from "@linkvault/shared";

// ============================================================
// NotesPanel — Slide-out panel for link notes/annotations
// ============================================================

interface NotesPanelProps {
  linkId: string;
  linkTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onNotesCountChange?: (linkId: string, delta: number) => void;
}

export function NotesPanel({
  linkId,
  linkTitle,
  isOpen,
  onClose,
  onNotesCountChange,
}: NotesPanelProps) {
  const { accessToken } = useAuthStore();
  const { addToast } = useToastStore();
  const [notes, setNotes] = useState<LinkNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const fetchNotes = useCallback(async () => {
    if (!accessToken || !linkId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<LinkNote[]>>(
        `/links/${linkId}/notes`,
        accessToken
      );
      setNotes(res.data || []);
    } catch {
      addToast("Failed to load notes", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, linkId, addToast]);

  useEffect(() => {
    if (isOpen && linkId) {
      fetchNotes();
    }
  }, [isOpen, linkId, fetchNotes]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setNewNote("");
      setEditingId(null);
      setEditContent("");
    }
  }, [isOpen]);

  async function handleCreate() {
    if (!newNote.trim() || !accessToken) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post<ApiResponse<LinkNote>>(
        `/links/${linkId}/notes`,
        { content: newNote.trim() },
        accessToken
      );
      setNotes((prev) => [res.data, ...prev]);
      setNewNote("");
      onNotesCountChange?.(linkId, 1);
      addToast("Note added", "success");
    } catch {
      addToast("Failed to add note", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(noteId: string) {
    if (!editContent.trim() || !accessToken) return;
    try {
      const res = await apiClient.patch<ApiResponse<LinkNote>>(
        `/links/${linkId}/notes/${noteId}`,
        { content: editContent.trim() },
        accessToken
      );
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? res.data : n))
      );
      setEditingId(null);
      setEditContent("");
      addToast("Note updated", "success");
    } catch {
      addToast("Failed to update note", "error");
    }
  }

  async function handleDelete(noteId: string) {
    if (!accessToken) return;
    try {
      await apiClient.delete<ApiResponse<null>>(
        `/links/${linkId}/notes/${noteId}`,
        accessToken
      );
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      onNotesCountChange?.(linkId, -1);
      addToast("Note deleted", "success");
    } catch {
      addToast("Failed to delete note", "error");
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-ink-50 border-l border-ink-300 z-[61] flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-300">
          <div className="min-w-0">
            <h2 className="font-display text-heading text-paper font-semibold tracking-tight">
              Notes
            </h2>
            <p className="text-caption text-paper-dim mt-0.5 truncate">
              {linkTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-paper-dim hover:text-paper hover:bg-ink-200 transition-colors"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New note input */}
        <div className="px-5 py-4 border-b border-ink-300/60">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="w-full bg-ink-200 border border-ink-300 px-3 py-2.5 text-sm text-paper placeholder:text-paper-faint font-body resize-none focus:outline-none focus:border-accent/50 transition-colors"
            style={{ borderRadius: "var(--radius-sm)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleCreate();
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-micro text-paper-faint">
              Ctrl+Enter to save
            </span>
            <button
              onClick={handleCreate}
              disabled={!newNote.trim() || submitting}
              className={cn(
                "px-3 py-1.5 text-xs font-body font-medium transition-all duration-200",
                newNote.trim()
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-ink-300 text-paper-faint cursor-not-allowed"
              )}
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {submitting ? "Saving..." : "Add Note"}
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-ink-500 border-t-accent rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 bg-ink-200 flex items-center justify-center mb-3" style={{ borderRadius: "var(--radius-md)" }}>
                <svg className="w-6 h-6 text-paper-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-sm text-paper-dim font-body">No notes yet</p>
              <p className="text-caption text-paper-faint mt-1">
                Add your thoughts, annotations, or reminders
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-300/40">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="px-5 py-4 group hover:bg-ink-100/50 transition-colors"
                >
                  {editingId === note.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full bg-ink-200 border border-accent/30 px-3 py-2 text-sm text-paper font-body resize-none focus:outline-none focus:border-accent/50 transition-colors"
                        style={{ borderRadius: "var(--radius-sm)" }}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleUpdate(note.id)}
                          disabled={!editContent.trim()}
                          className="px-3 py-1 text-xs font-body bg-accent text-white hover:bg-accent-hover transition-colors"
                          style={{ borderRadius: "var(--radius-sm)" }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditContent(""); }}
                          className="px-3 py-1 text-xs font-body text-paper-dim hover:text-paper transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-paper font-body leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-micro text-paper-faint tabular-nums">
                          {formatDate(note.created_at)}
                          {note.updated_at !== note.created_at && " (edited)"}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingId(note.id);
                              setEditContent(note.content);
                            }}
                            className="p-1 text-paper-faint hover:text-paper hover:bg-ink-200 transition-colors"
                            style={{ borderRadius: "var(--radius-sm)" }}
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 text-paper-faint hover:text-danger hover:bg-danger-subtle transition-colors"
                            style={{ borderRadius: "var(--radius-sm)" }}
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
