"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ApiResponse,
  SmartCollection,
  SmartCollectionInput,
  SmartCollectionRule,
  Link,
} from "@linkvault/shared";
import { LINK_CATEGORIES } from "@linkvault/shared";
import { LinkCard } from "@/components/links/LinkCard";
import { useUIStore } from "@/stores/uiStore";

// ============================================================
// Smart Collections — Rule-based auto-populated collections
// ============================================================

const FIELD_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "domain", label: "Domain" },
  { value: "tag", label: "Tag" },
  { value: "is_pinned", label: "Pinned" },
  { value: "reading_status", label: "Reading Status" },
] as const;

const OPERATOR_OPTIONS = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "not_equals", label: "does not equal" },
] as const;

export default function SmartCollectionsPage() {
  const { accessToken } = useAuthStore();
  const { viewMode, setEditingLink, setDeletingLink, setMovingLink } = useUIStore();
  const toast = useToastStore.getState;

  const [collections, setCollections] = useState<SmartCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("");
  const [formMatchMode, setFormMatchMode] = useState<"all" | "any">("all");
  const [formRules, setFormRules] = useState<SmartCollectionRule[]>([
    { field: "category", operator: "equals", value: "" },
  ]);

  // Viewing a collection's links
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewingLinks, setViewingLinks] = useState<Link[]>([]);
  const [viewingLoading, setViewingLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<SmartCollection[]>>(
        "/smart-collections",
        accessToken
      );
      if (res.success && res.data) setCollections(res.data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      toast().addToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const resetForm = () => {
    setFormName("");
    setFormEmoji("");
    setFormMatchMode("all");
    setFormRules([{ field: "category", operator: "equals", value: "" }]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!accessToken || !formName.trim() || formRules.some((r) => !r.value.trim())) {
      toast().addToast("Fill in all fields", "error");
      return;
    }
    try {
      const body: SmartCollectionInput = {
        name: formName.trim(),
        emoji: formEmoji || undefined,
        rules: formRules,
        match_mode: formMatchMode,
      };
      if (editingId) {
        await apiClient.patch<ApiResponse<SmartCollection>>(
          `/smart-collections/${editingId}`,
          body,
          accessToken
        );
        toast().addToast("Smart collection updated", "success");
      } else {
        await apiClient.post<ApiResponse<SmartCollection>>(
          "/smart-collections",
          body,
          accessToken
        );
        toast().addToast("Smart collection created", "success");
      }
      resetForm();
      fetchCollections();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save";
      toast().addToast(msg, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      await apiClient.delete(`/smart-collections/${id}`, accessToken);
      toast().addToast("Smart collection deleted", "success");
      if (viewingId === id) {
        setViewingId(null);
        setViewingLinks([]);
      }
      fetchCollections();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete";
      toast().addToast(msg, "error");
    }
  };

  const handleEdit = (sc: SmartCollection) => {
    setEditingId(sc.id);
    setFormName(sc.name);
    setFormEmoji(sc.emoji);
    setFormMatchMode(sc.match_mode);
    setFormRules(sc.rules.length > 0 ? sc.rules : [{ field: "category", operator: "equals", value: "" }]);
    setShowForm(true);
    setViewingId(null);
  };

  const handleView = async (sc: SmartCollection) => {
    if (!accessToken) return;
    if (viewingId === sc.id) {
      setViewingId(null);
      setViewingLinks([]);
      return;
    }
    setViewingId(sc.id);
    setViewingLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<{ links: Link[]; total: number }>>(
        `/smart-collections/${sc.id}/links`,
        accessToken
      );
      if (res.success && res.data) {
        setViewingLinks(res.data.links);
      }
    } catch (err) {
      toast().addToast("Failed to load links", "error");
    } finally {
      setViewingLoading(false);
    }
  };

  const addRule = () => {
    setFormRules([...formRules, { field: "category", operator: "equals", value: "" }]);
  };

  const removeRule = (idx: number) => {
    if (formRules.length <= 1) return;
    setFormRules(formRules.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, patch: Partial<SmartCollectionRule>) => {
    setFormRules(formRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-paper-faint mb-1">Manage</p>
            <h1 className="font-display text-display-sm font-bold text-paper">
              Smart Collections
            </h1>
            <p className="text-paper-dim text-sm mt-1 font-body">
              Auto-populated collections based on rules.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Smart Collection
            </button>
          )}
        </div>
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div
          className="border border-ink-300 bg-ink-50 p-5 mb-6 animate-fade-in"
          style={{ borderRadius: "var(--radius-md)" }}
        >
          <p className="editorial-label text-paper-faint mb-4">
            {editingId ? "Edit Smart Collection" : "New Smart Collection"}
          </p>

          {/* Name + Emoji */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Emoji"
              value={formEmoji}
              onChange={(e) => setFormEmoji(e.target.value)}
              className="input-editorial w-16 text-center"
              maxLength={4}
            />
            <input
              type="text"
              placeholder="Collection name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="input-editorial flex-1"
              maxLength={60}
            />
          </div>

          {/* Match mode */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-caption text-paper-dim">Match</span>
            <select
              value={formMatchMode}
              onChange={(e) => setFormMatchMode(e.target.value as "all" | "any")}
              className="input-editorial !py-1 !px-2 !text-xs w-auto"
            >
              <option value="all">ALL rules</option>
              <option value="any">ANY rule</option>
            </select>
          </div>

          {/* Rules */}
          <div className="flex flex-col gap-2 mb-4">
            {formRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(idx, { field: e.target.value as SmartCollectionRule["field"], value: "" })}
                  className="input-editorial !py-1.5 !px-2 !text-xs w-36"
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(idx, { operator: e.target.value as SmartCollectionRule["operator"] })}
                  className="input-editorial !py-1.5 !px-2 !text-xs w-36"
                >
                  {OPERATOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {rule.field === "category" ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                    className="input-editorial !py-1.5 !px-2 !text-xs flex-1"
                  >
                    <option value="">Select...</option>
                    {LINK_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                ) : rule.field === "is_pinned" ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                    className="input-editorial !py-1.5 !px-2 !text-xs flex-1"
                  >
                    <option value="">Select...</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : rule.field === "reading_status" ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                    className="input-editorial !py-1.5 !px-2 !text-xs flex-1"
                  >
                    <option value="">Select...</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={rule.field === "domain" ? "e.g. github.com" : "e.g. javascript"}
                    value={rule.value}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                    className="input-editorial !py-1.5 !text-xs flex-1"
                  />
                )}
                {formRules.length > 1 && (
                  <button
                    onClick={() => removeRule(idx)}
                    className="p-1 text-paper-faint hover:text-danger transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {formRules.length < 10 && (
            <button onClick={addRule} className="text-caption text-accent hover:text-accent-hover transition-colors mb-4">
              + Add rule
            </button>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-ink-300">
            <button onClick={handleSave} className="btn-primary !py-2 !px-5 !text-xs">
              {editingId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="btn-ghost !py-2 !px-4 !text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-ink-100 animate-pulse" style={{ borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      ) : collections.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 animate-fade-in">
          <div className="w-8 h-px bg-ink-400 mb-8" />
          <p className="editorial-label text-paper-faint mb-6">Smart Collections</p>
          <h2 className="font-display text-display-sm font-bold text-paper mb-3">
            No smart collections yet
          </h2>
          <p className="text-sm text-paper-dim max-w-sm leading-relaxed mb-8">
            Create rule-based collections that auto-populate with matching links.
          </p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary"
          >
            Create your first
          </button>
          <div className="w-8 h-px bg-ink-400 mt-8" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {collections.map((sc) => (
            <div key={sc.id}>
              <div
                className={cn(
                  "flex items-center gap-4 px-4 py-3 border border-ink-300 bg-ink-50 hover:border-ink-400 transition-all cursor-pointer",
                  viewingId === sc.id && "border-accent/40 ring-1 ring-accent/30"
                )}
                style={{ borderRadius: "var(--radius-sm)" }}
                onClick={() => handleView(sc)}
              >
                <span className="text-lg shrink-0">{sc.emoji || ""}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-paper truncate">
                    {sc.name}
                  </p>
                  <p className="text-micro text-paper-faint">
                    {sc.rules.length} rule{sc.rules.length !== 1 ? "s" : ""} &middot; match {sc.match_mode}
                    {sc.link_count !== undefined && ` \u00b7 ${sc.link_count} link${sc.link_count !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(sc)}
                    className="p-1.5 text-paper-faint hover:text-paper-muted transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(sc.id)}
                    className="p-1.5 text-paper-faint hover:text-danger transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded links view */}
              {viewingId === sc.id && (
                <div className="mt-2 ml-6 animate-fade-in">
                  {viewingLoading ? (
                    <p className="text-caption text-paper-faint py-4">Loading links...</p>
                  ) : viewingLinks.length === 0 ? (
                    <p className="text-caption text-paper-faint py-4">No links match these rules.</p>
                  ) : (
                    <div className={cn(
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                        : "flex flex-col gap-2"
                    )}>
                      {viewingLinks.map((link) => (
                        <LinkCard
                          key={link.id}
                          link={link}
                          viewMode={viewMode}
                          onEdit={setEditingLink}
                          onDelete={setDeletingLink}
                          onMoveToCollection={setMovingLink}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
