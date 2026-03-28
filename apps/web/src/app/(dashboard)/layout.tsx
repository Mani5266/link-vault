"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/layout/UserMenu";
import { AddLinkModal } from "@/components/links/AddLinkModal";
import { EditLinkModal } from "@/components/links/EditLinkModal";
import { DeleteConfirmDialog } from "@/components/links/DeleteConfirmDialog";
import { MoveToCollectionModal } from "@/components/links/MoveToCollectionModal";
import { AddCollectionModal } from "@/components/collections/AddCollectionModal";
import { EditCollectionModal } from "@/components/collections/EditCollectionModal";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { SEARCH_INPUT_ID } from "@/hooks/useKeyboardShortcuts";
import { useSetup } from "@/hooks/useSetup";
import { useLinks } from "@/hooks/useLinks";
import { useAI } from "@/hooks/useAI";
import { useUIStore } from "@/stores/uiStore";
import { useLinkStore } from "@/stores/linkStore";
import { useCollectionStore, buildCollectionTree } from "@/stores/collectionStore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_COLLECTIONS } from "@linkvault/shared";
import type { Collection } from "@linkvault/shared";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    setAddLinkModalOpen,
    editingLink,
    setEditingLink,
    deletingLink,
    setDeletingLink,
    movingLink,
    setMovingLink,
    isAISearchMode,
    setAISearchMode,
    aiSearchInterpretation,
    setAISearchInterpretation,
    aiSearchLoading,
    setAISearchLoading,
  } = useUIStore();
  const { collections, expandedIds, toggleExpanded } = useCollectionStore();
  const { setFilters } = useLinkStore();
  const { deleteLink } = useLinks();
  const { semanticSearch } = useAI();
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [addCollectionParentId, setAddCollectionParentId] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Seed default collections on first login (idempotent)
  useSetup();

  // Handle AI semantic search — triggered on Enter key
  const handleAISearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setAISearchLoading(true);
    setAISearchInterpretation(null);

    const result = await semanticSearch(searchQuery);

    if (result) {
      // Apply the AI-interpreted filters to the link store
      setAISearchInterpretation(result.interpretation);

      // Set the extracted keywords as the search query for text search
      if (result.keywords) {
        setSearchQuery(result.keywords);
      }

      // Apply structured filters
      const filterUpdates: Record<string, unknown> = {};
      if (result.category) filterUpdates.category = result.category;
      if (result.is_pinned !== undefined) filterUpdates.is_pinned = result.is_pinned;
      if (result.reading_status) filterUpdates.reading_status = result.reading_status;

      if (Object.keys(filterUpdates).length > 0) {
        setFilters(filterUpdates);
      }
    }

    setAISearchLoading(false);
  }, [searchQuery, semanticSearch, setSearchQuery, setFilters, setAISearchInterpretation, setAISearchLoading]);

  // Clear AI interpretation when toggling AI mode off or clearing search
  const handleToggleAIMode = useCallback(() => {
    const newMode = !isAISearchMode;
    setAISearchMode(newMode);
    if (!newMode) {
      setAISearchInterpretation(null);
    }
  }, [isAISearchMode, setAISearchMode, setAISearchInterpretation]);

  // Handle search input key down — Enter triggers AI search when in AI mode
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && isAISearchMode) {
        e.preventDefault();
        handleAISearch();
      }
    },
    [isAISearchMode, handleAISearch]
  );

  // Build collection tree for sidebar rendering
  const collectionTree = collections.length > 0
    ? buildCollectionTree(collections)
    : DEFAULT_COLLECTIONS.map((c) => ({ ...c, id: c.slug, user_id: "", is_default: true, position: c.position, parent_id: null, created_at: "", children: [] }));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — Desktop */}
      <aside className="hidden md:flex flex-col w-[260px] border-r border-ink-300 bg-ink shrink-0 animate-fade-in">
        {/* Logo / Masthead */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-ink-300">
          <span className="font-display font-bold text-sm tracking-[0.15em] uppercase text-paper">
            LinkVault
          </span>
          <div className="flex-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-subtle" />
        </div>

        {/* Collections Navigation — Table of Contents */}
        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <div className="mb-6">
            <p className="px-3 mb-3 editorial-label text-paper-faint">
              Collections
            </p>
            <SidebarItem
              emoji="/"
              label="All Links"
              href="/"
              active={pathname === "/"}
              isIndex
            />
            {collectionTree.map((node) => (
              <div key={node.slug}>
                <SidebarItem
                  emoji={node.emoji}
                  label={node.name}
                  href={`/collection/${node.slug}`}
                  active={pathname === `/collection/${node.slug}`}
                  collection={collections.find((c) => c.slug === node.slug) || null}
                  onEdit={(c) => setEditingCollection(c)}
                  onDelete={(c) => setDeletingCollection(c)}
                  onAddSubcollection={node.parent_id === null ? (c) => {
                    setAddCollectionParentId(c.id);
                    setIsAddCollectionOpen(true);
                  } : undefined}
                  hasChildren={node.children.length > 0}
                  isExpanded={expandedIds.includes(node.id)}
                  onToggleExpand={() => toggleExpanded(node.id)}
                />
                {/* Render children when expanded */}
                {node.children.length > 0 && expandedIds.includes(node.id) && (
                  <div className="ml-3 pl-2 border-l border-ink-300/50">
                    {node.children.map((child) => (
                      <SidebarItem
                        key={child.slug}
                        emoji={child.emoji}
                        label={child.name}
                        href={`/collection/${child.slug}`}
                        active={pathname === `/collection/${child.slug}`}
                        collection={collections.find((c) => c.slug === child.slug) || null}
                        onEdit={(c) => setEditingCollection(c)}
                        onDelete={(c) => setDeletingCollection(c)}
                        isChild
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Add New Collection */}
            <button
              onClick={() => { setAddCollectionParentId(null); setIsAddCollectionOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-caption text-paper-faint hover:text-paper-muted hover:bg-ink-100 transition-all duration-200 mt-2 group/add"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <svg className="w-3.5 h-3.5 ml-0.5 transition-transform duration-200 group-hover/add:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Collection</span>
            </button>
          </div>

          {/* Manage Section */}
          <div className="mb-6">
            <p className="px-3 mb-3 editorial-label text-paper-faint">
              Manage
            </p>
            <SidebarItem
              emoji="⭐"
              label="Favorites"
              href="/favorites"
              active={pathname === "/favorites"}
              isIndex
            />
            <SidebarItem
              emoji="🕐"
              label="Recent"
              href="/recent"
              active={pathname === "/recent"}
              isIndex
            />
            <SidebarItem
              emoji="🗑️"
              label="Trash"
              href="/trash"
              active={pathname === "/trash"}
              isIndex
            />
            <SidebarItem
              emoji="%"
              label="Analytics"
              href="/analytics"
              active={pathname === "/analytics"}
              isIndex
            />
          </div>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-ink-300">
          <UserMenu />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-ink-300 bg-ink shrink-0 glass-warm">
          {/* Mobile hamburger + logo */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 -ml-1 text-paper-muted hover:text-paper transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <span className="font-display font-bold text-sm tracking-[0.15em] uppercase text-paper">
              LinkVault
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative flex items-center gap-1.5">
              {/* AI Search Toggle */}
              <button
                onClick={handleToggleAIMode}
                className={`shrink-0 p-2 transition-all duration-250 ${
                  isAISearchMode
                    ? "text-gold bg-gold/10 border border-gold/30 shadow-glow-gold"
                    : "text-paper-faint hover:text-gold border border-transparent hover:border-gold/20"
                }`}
                style={{ borderRadius: "var(--radius-sm)" }}
                title={isAISearchMode ? "Switch to regular search" : "Switch to AI search"}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </button>

              {/* Search Input */}
              <div className="relative flex-1">
                <svg
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isAISearchMode ? "text-gold/60" : "text-paper-faint"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  id={SEARCH_INPUT_ID}
                  type="text"
                  placeholder={isAISearchMode ? "Ask AI... (press Enter)" : "Search links..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className={`w-full pl-10 pr-4 py-2 bg-ink-50 border text-sm text-paper placeholder:text-paper-faint outline-none transition-all duration-250 ${
                    isAISearchMode
                      ? "border-gold/30 focus:border-gold focus:shadow-glow-gold"
                      : "border-ink-300 focus:border-accent focus:shadow-glow-accent"
                  }`}
                  style={{ borderRadius: "var(--radius-sm)" }}
                />
                {/* Loading spinner for AI search */}
                {aiSearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gold animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
                {!aiSearchLoading && searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setAISearchInterpretation(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-faint hover:text-paper-muted transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {!aiSearchLoading && !searchQuery && !isAISearchMode && (
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 text-micro font-mono text-paper-faint border border-ink-400 bg-ink-200 pointer-events-none"
                    style={{ borderRadius: "var(--radius-sm)" }}
                  >
                    /
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Keyboard Shortcuts Help */}
            <button
              onClick={() => useLinkStore.getState().setShortcutsModalOpen(true)}
              className="p-2 text-paper-faint hover:text-paper-muted hover:bg-ink-200 transition-all duration-200 hidden sm:block"
              style={{ borderRadius: "var(--radius-sm)" }}
              title="Keyboard shortcuts (?)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </button>

            {/* View Toggle */}
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="p-2 text-paper-muted hover:text-paper hover:bg-ink-200 transition-all duration-200"
              style={{ borderRadius: "var(--radius-sm)" }}
              title={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
            >
              {viewMode === "grid" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
            </button>

            {/* Add Link Button */}
            <button
              onClick={() => setAddLinkModalOpen(true)}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Link</span>
            </button>
          </div>
        </header>

        {/* AI Search Interpretation Banner */}
        {aiSearchInterpretation && (
          <div className="px-4 md:px-6 py-2.5 bg-gold/5 border-b border-gold/20 flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 text-gold shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-xs text-gold flex-1">
              <span className="font-medium">AI:</span>{" "}
              {aiSearchInterpretation}
            </p>
            <button
              onClick={() => {
                setAISearchInterpretation(null);
                setSearchQuery("");
                useLinkStore.getState().resetFilters();
              }}
              className="text-gold/60 hover:text-gold transition-colors shrink-0"
              title="Clear AI search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[90]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-ink border-r border-ink-300 flex flex-col animate-slide-right overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-ink-300 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-sm tracking-[0.15em] uppercase text-paper">
                  LinkVault
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 text-paper-faint hover:text-paper-muted transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-5 px-3">
              <div className="mb-6">
                <p className="px-3 mb-3 editorial-label text-paper-faint">
                  Collections
                </p>
                <SidebarItem
                  emoji="/"
                  label="All Links"
                  href="/"
                  active={pathname === "/"}
                  isIndex
                />
                {collectionTree.map((node) => (
                  <div key={node.slug}>
                    <SidebarItem
                      emoji={node.emoji}
                      label={node.name}
                      href={`/collection/${node.slug}`}
                      active={pathname === `/collection/${node.slug}`}
                      collection={collections.find((c) => c.slug === node.slug) || null}
                      onEdit={(c) => { setMobileDrawerOpen(false); setEditingCollection(c); }}
                      onDelete={(c) => { setMobileDrawerOpen(false); setDeletingCollection(c); }}
                      onAddSubcollection={node.parent_id === null ? (c) => {
                        setMobileDrawerOpen(false);
                        setAddCollectionParentId(c.id);
                        setIsAddCollectionOpen(true);
                      } : undefined}
                      hasChildren={node.children.length > 0}
                      isExpanded={expandedIds.includes(node.id)}
                      onToggleExpand={() => toggleExpanded(node.id)}
                    />
                    {node.children.length > 0 && expandedIds.includes(node.id) && (
                      <div className="ml-3 pl-2 border-l border-ink-300/50">
                        {node.children.map((child) => (
                          <SidebarItem
                            key={child.slug}
                            emoji={child.emoji}
                            label={child.name}
                            href={`/collection/${child.slug}`}
                            active={pathname === `/collection/${child.slug}`}
                            collection={collections.find((c) => c.slug === child.slug) || null}
                            onEdit={(c) => { setMobileDrawerOpen(false); setEditingCollection(c); }}
                            onDelete={(c) => { setMobileDrawerOpen(false); setDeletingCollection(c); }}
                            isChild
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => { setMobileDrawerOpen(false); setAddCollectionParentId(null); setIsAddCollectionOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-caption text-paper-faint hover:text-paper-muted transition-colors mt-2"
                >
                  <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Collection</span>
                </button>
              </div>

              <div className="mb-6">
                <p className="px-3 mb-3 editorial-label text-paper-faint">
                  Manage
                </p>
                <SidebarItem emoji="⭐" label="Favorites" href="/favorites" active={pathname === "/favorites"} isIndex />
                <SidebarItem emoji="🕐" label="Recent" href="/recent" active={pathname === "/recent"} isIndex />
                <SidebarItem emoji="🗑️" label="Trash" href="/trash" active={pathname === "/trash"} isIndex />
                <SidebarItem emoji="%" label="Analytics" href="/analytics" active={pathname === "/analytics"} isIndex />
              </div>
            </nav>

            {/* User */}
            <div className="p-3 border-t border-ink-300 shrink-0">
              <UserMenu />
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-ink/95 backdrop-blur-lg border-t border-ink-300 flex items-center justify-around h-14 z-50">
        <MobileNavItem
          label="All"
          href="/"
          active={pathname === "/"}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          }
        />
        <button
          onClick={() => setAddLinkModalOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-accent"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-micro uppercase tracking-editorial">Add</span>
        </button>
        <MobileNavItem
          label="Settings"
          href="/settings"
          active={pathname === "/settings"}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </nav>

      {/* Modals */}
      <AddLinkModal />
      <EditLinkModal link={editingLink} onClose={() => setEditingLink(null)} />
      <DeleteConfirmDialog link={deletingLink} onConfirm={deleteLink} onClose={() => setDeletingLink(null)} />
      <MoveToCollectionModal link={movingLink} onClose={() => setMovingLink(null)} />
      <AddCollectionModal isOpen={isAddCollectionOpen} onClose={() => { setIsAddCollectionOpen(false); setAddCollectionParentId(null); }} parentId={addCollectionParentId} />
      <EditCollectionModal collection={editingCollection} onClose={() => setEditingCollection(null)} />
      <DeleteCollectionDialog
        collection={deletingCollection}
        onClose={() => {
          if (deletingCollection && pathname === `/collection/${deletingCollection.slug}`) {
            router.push("/");
          }
          setDeletingCollection(null);
        }}
      />
      <KeyboardShortcutsModal />
    </div>
  );
}

// ============================================================
// Sidebar Item — Editorial table-of-contents style
// ============================================================

function SidebarItem({
  emoji,
  label,
  href,
  active = false,
  isIndex = false,
  isChild = false,
  collection = null,
  onEdit,
  onDelete,
  onAddSubcollection,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
}: {
  emoji: string;
  label: string;
  href: string;
  active?: boolean;
  isIndex?: boolean;
  isChild?: boolean;
  collection?: Collection | null;
  onEdit?: (collection: Collection) => void;
  onDelete?: (collection: Collection) => void;
  onAddSubcollection?: (collection: Collection) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className={`relative group mb-px ${menuOpen ? "z-30" : ""}`}>
      <div className="flex items-center">
        {/* Expand/collapse chevron for parent collections with children */}
        {hasChildren && onToggleExpand ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleExpand();
            }}
            className="shrink-0 p-1 ml-0.5 text-paper-faint hover:text-paper-muted transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : !isIndex && !isChild ? (
          <div className="w-5 shrink-0" />
        ) : null}

        <Link
          href={href}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 ${
            isChild ? "py-1.5 text-xs" : ""
          } ${
            active
              ? "text-paper bg-ink-200 border-l-2 border-accent -ml-px pl-[11px] shadow-inner-glow"
              : "text-paper-muted hover:text-paper hover:bg-ink-100 hover:translate-x-0.5"
          }`}
          style={{ borderRadius: active ? 0 : "var(--radius-sm)" }}
        >
          <span className={`shrink-0 ${isIndex ? "font-mono text-xs text-paper-faint" : isChild ? "text-xs" : "text-sm"}`}>
            {isIndex ? "//" : emoji}
          </span>
          <span className="flex-1 text-left truncate">{label}</span>
        </Link>
      </div>

      {/* Three-dot menu — only for real collections */}
      {collection && onEdit && onDelete && (
        <div ref={menuRef} className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className={`p-1 text-paper-faint hover:text-paper-muted transition-colors ${
              menuOpen ? "text-paper-muted" : "opacity-0 group-hover:opacity-100"
            }`}
            style={{ borderRadius: "var(--radius-sm)" }}
            title="Collection options"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 border border-ink-300 bg-ink-100 z-50 py-1 animate-scale-in context-menu">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit(collection);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-paper-muted hover:text-paper hover:bg-ink-200 transition-all duration-150"
              >
                Edit
              </button>
              {onAddSubcollection && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onAddSubcollection(collection);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-paper-muted hover:text-paper hover:bg-ink-200 transition-all duration-150"
                >
                  Add Sub-collection
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(collection);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger-subtle transition-all duration-150"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Mobile Nav Item
// ============================================================

function MobileNavItem({
  label,
  href,
  active = false,
  icon,
}: {
  label: string;
  href: string;
  active?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-200 ${
        active ? "text-paper scale-105" : "text-paper-faint hover:text-paper-muted"
      }`}
    >
      {icon}
      <span className="text-micro uppercase tracking-editorial">{label}</span>
    </Link>
  );
}
