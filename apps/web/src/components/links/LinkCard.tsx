"use client";

import { useState, useRef, useEffect, memo } from "react";
import type { Link, ReadingStatus } from "@linkvault/shared";
import { LINK_CATEGORIES } from "@linkvault/shared";
import { formatDate, truncate, copyToClipboard, cn } from "@/lib/utils";
import { AIBadge } from "@/components/ai/AIBadge";

// ============================================================
// LinkCard — Grid (card) and List (row) variants
// Editorial design: hairline borders, warm tones, accent-top hover
// ============================================================

/** Only allow http/https favicon URLs to prevent javascript: or data: injection */
function getSafeFaviconUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
    return null;
  } catch {
    return null;
  }
}

interface LinkCardProps {
  link: Link;
  viewMode: "grid" | "list";
  isSelected?: boolean;
  isSelectionMode?: boolean;
  isFocused?: boolean;
  dataIndex?: number;
  onEdit?: (link: Link) => void;
  onDelete?: (link: Link) => void;
  onTogglePin?: (link: Link) => void;
  onMoveToCollection?: (link: Link) => void;
  onReAnalyze?: (link: Link) => void;
  onToggleSelect?: (link: Link) => void;
  onToggleReadingStatus?: (link: Link, status: ReadingStatus | null) => void;
  onViewNotes?: (link: Link) => void;
}

export const LinkCard = memo(function LinkCard({
  link,
  viewMode,
  isSelected = false,
  isSelectionMode = false,
  isFocused = false,
  dataIndex,
  onEdit,
  onDelete,
  onTogglePin,
  onMoveToCollection,
  onReAnalyze,
  onToggleSelect,
  onToggleReadingStatus,
  onViewNotes,
}: LinkCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
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

  const categoryMeta = link.category
    ? LINK_CATEGORIES.find((c) => c.value === link.category)
    : null;

  const displayEmoji = link.emoji || categoryMeta?.emoji || "";
  const displayTitle = link.title || link.domain || link.url;
  const displayDescription = link.description;

  async function handleCopy() {
    const ok = await copyToClipboard(link.url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (viewMode === "list") {
    return <ListRow
      link={link}
      displayEmoji={displayEmoji}
      displayTitle={displayTitle}
      displayDescription={displayDescription}
      categoryMeta={categoryMeta}
      copied={copied}
      menuOpen={menuOpen}
      menuRef={menuRef}
      isSelected={isSelected}
      isSelectionMode={isSelectionMode}
      isFocused={isFocused}
      dataIndex={dataIndex}
      summaryExpanded={summaryExpanded}
      onToggleSummary={() => setSummaryExpanded(!summaryExpanded)}
      onCopy={handleCopy}
      onMenuToggle={() => setMenuOpen(!menuOpen)}
      onMenuClose={() => setMenuOpen(false)}
      onEdit={onEdit}
      onDelete={onDelete}
      onTogglePin={onTogglePin}
      onMoveToCollection={onMoveToCollection}
      onReAnalyze={onReAnalyze}
      onToggleSelect={onToggleSelect}
      onToggleReadingStatus={onToggleReadingStatus}
      onViewNotes={onViewNotes}
    />;
  }

  return (
    <GridCard
      link={link}
      displayEmoji={displayEmoji}
      displayTitle={displayTitle}
      displayDescription={displayDescription}
      categoryMeta={categoryMeta}
      copied={copied}
      menuOpen={menuOpen}
      menuRef={menuRef}
      isSelected={isSelected}
      isSelectionMode={isSelectionMode}
      isFocused={isFocused}
      dataIndex={dataIndex}
      summaryExpanded={summaryExpanded}
      onToggleSummary={() => setSummaryExpanded(!summaryExpanded)}
      onCopy={handleCopy}
      onMenuToggle={() => setMenuOpen(!menuOpen)}
      onMenuClose={() => setMenuOpen(false)}
      onEdit={onEdit}
      onDelete={onDelete}
      onTogglePin={onTogglePin}
      onMoveToCollection={onMoveToCollection}
      onReAnalyze={onReAnalyze}
      onToggleSelect={onToggleSelect}
      onToggleReadingStatus={onToggleReadingStatus}
      onViewNotes={onViewNotes}
    />
  );
});

// ============================================================
// Shared props for both variants
// ============================================================

interface VariantProps {
  link: Link;
  displayEmoji: string;
  displayTitle: string;
  displayDescription: string | null;
  categoryMeta: { value: string; label: string; emoji: string } | null | undefined;
  copied: boolean;
  menuOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  isSelectionMode: boolean;
  isFocused: boolean;
  dataIndex?: number;
  summaryExpanded: boolean;
  onToggleSummary: () => void;
  onCopy: () => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onEdit?: (link: Link) => void;
  onDelete?: (link: Link) => void;
  onTogglePin?: (link: Link) => void;
  onMoveToCollection?: (link: Link) => void;
  onReAnalyze?: (link: Link) => void;
  onToggleSelect?: (link: Link) => void;
  onToggleReadingStatus?: (link: Link, status: ReadingStatus | null) => void;
  onViewNotes?: (link: Link) => void;
}

// ============================================================
// Grid Card — Editorial newspaper-column feel
// ============================================================

function GridCard({
  link,
  displayEmoji,
  displayTitle,
  displayDescription,
  categoryMeta,
  copied,
  menuOpen,
  menuRef,
  isSelected,
  isSelectionMode,
  isFocused,
  dataIndex,
  summaryExpanded,
  onToggleSummary,
  onCopy,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
  onTogglePin,
  onMoveToCollection,
  onReAnalyze,
  onToggleSelect,
  onToggleReadingStatus,
  onViewNotes,
}: VariantProps) {
  return (
    <article
      data-link-index={dataIndex}
      className={cn(
        "card-accent-top group relative flex flex-col border border-ink-300 bg-ink-50 hover:border-ink-400 hover:shadow-card-hover transition-all duration-300 hover-lift shadow-card",
        link.is_pinned && "border-accent/20 bg-accent-subtle",
        isSelected && "border-accent/40 bg-accent-subtle ring-1 ring-accent/30",
        isFocused && "ring-1 ring-accent border-accent/50"
      )}
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <button
          onClick={() => onToggleSelect?.(link)}
          className="absolute top-3 left-3 z-20"
          aria-label={isSelected ? "Deselect link" : "Select link"}
        >
          <div
            className={cn(
              "w-4.5 h-4.5 border flex items-center justify-center transition-colors",
              isSelected
                ? "bg-accent border-accent"
                : "border-ink-500 hover:border-paper-dim"
            )}
            style={{ borderRadius: "2px" }}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
      )}

      {/* Pin indicator */}
      {link.is_pinned && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </div>
      )}

      {/* Card Header — domain + AI badge + menu */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Favicon or emoji */}
          {getSafeFaviconUrl(link.favicon_url) ? (
            <img
              src={getSafeFaviconUrl(link.favicon_url)!}
              alt=""
              className="w-4 h-4 shrink-0 opacity-70"
              style={{ borderRadius: "2px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <span className={cn("text-sm shrink-0", getSafeFaviconUrl(link.favicon_url) && "hidden")}>
            {displayEmoji}
          </span>
          <span className="mono-domain truncate">{link.domain}</span>
          <AIBadge
            processed={link.ai_processed}
            isProcessing={link.processing_status === "pending" || link.processing_status === "processing"}
          />
        </div>

        {/* Context menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={onMenuToggle}
            className="p-1 opacity-0 group-hover:opacity-100 text-paper-dim hover:text-paper-muted hover:bg-ink-200 transition-all duration-200"
            style={{ borderRadius: "var(--radius-sm)" }}
            aria-label="Link actions"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <ContextMenu
              link={link}
              copied={copied}
              anchorRef={menuRef}
              onCopy={onCopy}
              onClose={onMenuClose}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onMoveToCollection={onMoveToCollection}
              onReAnalyze={onReAnalyze}
              onToggleReadingStatus={onToggleReadingStatus}
              onViewNotes={onViewNotes}
            />
          )}
        </div>
      </div>

      {/* Processing indicator bar */}
      {(link.processing_status === "pending" || link.processing_status === "processing") && (
        <div className="px-4 pb-2">
          <div className="h-0.5 bg-ink-300 overflow-hidden" style={{ borderRadius: "1px" }}>
            <div className="h-full bg-gold animate-processing-bar" />
          </div>
        </div>
      )}

      {/* Title */}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 pb-1.5 font-body font-medium text-sm text-paper hover:text-accent-hover transition-colors duration-200 line-clamp-2 leading-snug"
      >
        {truncate(displayTitle, 80)}
      </a>

      {/* Description */}
      {displayDescription && (
        <p className="px-4 pb-2 text-caption text-paper-dim line-clamp-2">
          {truncate(displayDescription, 120)}
        </p>
      )}

      {/* AI Summary Panel — expandable */}
      {displayDescription && displayDescription.length > 60 && (
        <SummaryPanel
          description={displayDescription}
          expanded={summaryExpanded}
          onToggle={onToggleSummary}
          aiProcessed={link.ai_processed}
        />
      )}

      {/* Footer — tags + date, separated by hairline */}
      <div className="mt-auto px-4 py-3 border-t border-ink-300/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {categoryMeta && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-micro font-medium uppercase tracking-editorial bg-ink-200 text-paper-dim tag-pill"
            >
              {categoryMeta.emoji} {categoryMeta.label}
            </span>
          )}
          {link.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="shrink-0 px-2 py-0.5 text-micro font-medium bg-accent-subtle text-accent tag-pill"
            >
              {tag}
            </span>
          ))}
          {link.tags.length > 2 && (
            <span className="text-micro text-paper-faint shrink-0">
              +{link.tags.length - 2}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {link.notes_count > 0 && (
            <button
              onClick={() => onViewNotes?.(link)}
              className="flex items-center gap-1 text-micro text-paper-faint hover:text-accent transition-colors"
              title={`${link.notes_count} note${link.notes_count > 1 ? "s" : ""}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {link.notes_count}
            </button>
          )}
          <span className="text-micro text-paper-faint shrink-0 tabular-nums">
            {formatDate(link.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ============================================================
// List Row — Editorial table/index feel
// ============================================================

function ListRow({
  link,
  displayEmoji,
  displayTitle,
  displayDescription,
  categoryMeta,
  copied,
  menuOpen,
  menuRef,
  isSelected,
  isSelectionMode,
  isFocused,
  dataIndex,
  summaryExpanded,
  onToggleSummary,
  onCopy,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
  onTogglePin,
  onMoveToCollection,
  onReAnalyze,
  onToggleSelect,
  onToggleReadingStatus,
  onViewNotes,
}: VariantProps) {
  return (
    <article
      data-link-index={dataIndex}
      className={cn(
        "group relative border border-ink-300 bg-ink-50 hover:border-ink-400 hover:bg-ink-100 hover:shadow-card transition-all duration-250",
        link.is_pinned && "border-accent/20 bg-accent-subtle",
        isSelected && "border-accent/40 bg-accent-subtle ring-1 ring-accent/30",
        isFocused && "ring-1 ring-accent border-accent/50"
      )}
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Selection checkbox */}
        {isSelectionMode && (
          <button
            onClick={() => onToggleSelect?.(link)}
            className="shrink-0"
            aria-label={isSelected ? "Deselect link" : "Select link"}
          >
            <div
              className={cn(
                "w-4.5 h-4.5 border flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-accent border-accent"
                  : "border-ink-500 hover:border-paper-dim"
              )}
              style={{ borderRadius: "2px" }}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        )}

        {/* Favicon / emoji — compact square */}
        <div className="shrink-0 w-9 h-9 bg-ink-200 flex items-center justify-center" style={{ borderRadius: "var(--radius-sm)" }}>
          {getSafeFaviconUrl(link.favicon_url) ? (
            <img
              src={getSafeFaviconUrl(link.favicon_url)!}
              alt=""
              className="w-4 h-4 opacity-70"
              style={{ borderRadius: "2px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-base">{displayEmoji}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {link.is_pinned && (
              <svg className="w-3 h-3 text-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            )}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body font-medium text-sm text-paper hover:text-accent-hover transition-colors duration-200 truncate"
            >
              {truncate(displayTitle, 60)}
            </a>
            <span className="mono-domain shrink-0 hidden sm:inline">
              {link.domain}
            </span>
          </div>
          {displayDescription && (
            <p className="text-caption text-paper-dim truncate mt-0.5">
              {truncate(displayDescription, 100)}
            </p>
          )}
          {/* Tags row */}
          <div className="flex items-center gap-1.5 mt-1">
            <AIBadge
              processed={link.ai_processed}
              isProcessing={link.processing_status === "pending" || link.processing_status === "processing"}
            />
            {categoryMeta && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-micro font-medium uppercase tracking-editorial bg-ink-200 text-paper-dim tag-pill"
              >
                {categoryMeta.emoji} {categoryMeta.label}
              </span>
            )}
            {link.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-micro font-medium bg-accent-subtle text-accent tag-pill"
              >
                {tag}
              </span>
            ))}
            {link.tags.length > 3 && (
              <span className="text-micro text-paper-faint">
                +{link.tags.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Date */}
        <span className="text-caption text-paper-faint shrink-0 hidden md:block tabular-nums">
          {formatDate(link.created_at)}
        </span>

        {/* Context menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={onMenuToggle}
            className="p-1.5 opacity-0 group-hover:opacity-100 text-paper-dim hover:text-paper-muted hover:bg-ink-200 transition-all duration-200"
            style={{ borderRadius: "var(--radius-sm)" }}
            aria-label="Link actions"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <ContextMenu
              link={link}
              copied={copied}
              anchorRef={menuRef}
              onCopy={onCopy}
              onClose={onMenuClose}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onMoveToCollection={onMoveToCollection}
              onReAnalyze={onReAnalyze}
              onToggleReadingStatus={onToggleReadingStatus}
              onViewNotes={onViewNotes}
            />
          )}
        </div>
      </div>

      {/* AI Summary Panel — expandable (list view) */}
      {displayDescription && displayDescription.length > 60 && (
        <SummaryPanel
          description={displayDescription}
          expanded={summaryExpanded}
          onToggle={onToggleSummary}
          aiProcessed={link.ai_processed}
        />
      )}
    </article>
  );
}

// ============================================================
// AI Summary Panel — Expandable full description
// Gold/AI-themed panel with toggle button
// ============================================================

function SummaryPanel({
  description,
  expanded,
  onToggle,
  aiProcessed,
}: {
  description: string;
  expanded: boolean;
  onToggle: () => void;
  aiProcessed: boolean;
}) {
  return (
    <div className="px-4 pb-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-micro font-medium font-body text-gold hover:text-gold-hover transition-all duration-200"
      >
        <svg
          className={cn("w-3 h-3 transition-transform duration-250", expanded && "rotate-90")}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {expanded ? "Hide summary" : (aiProcessed ? "AI Summary" : "Full summary")}
      </button>
      {expanded && (
        <div
          className="mt-1.5 px-3 py-2.5 bg-gold-subtle/40 border border-gold/10 animate-fade-in"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          {aiProcessed && (
            <p className="text-micro text-gold font-medium uppercase tracking-editorial mb-1">
              AI-Generated Summary
            </p>
          )}
          <p className="text-caption text-paper-dim leading-relaxed font-body">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Context Menu — Editorial dropdown
// ============================================================

function ContextMenu({
  link,
  copied,
  onCopy,
  onClose,
  onEdit,
  onDelete,
  onTogglePin,
  onMoveToCollection,
  onReAnalyze,
  onToggleReadingStatus,
  onViewNotes,
}: {
  link: Link;
  copied: boolean;
  anchorRef?: React.RefObject<HTMLDivElement>;
  onCopy: () => void;
  onClose: () => void;
  onEdit?: (link: Link) => void;
  onDelete?: (link: Link) => void;
  onTogglePin?: (link: Link) => void;
  onMoveToCollection?: (link: Link) => void;
  onReAnalyze?: (link: Link) => void;
  onToggleReadingStatus?: (link: Link, status: ReadingStatus | null) => void;
  onViewNotes?: (link: Link) => void;
}) {
  function action(fn?: (link: Link) => void) {
    return () => {
      fn?.(link);
      onClose();
    };
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 w-48 bg-ink-50 z-[100] py-1 animate-scale-in context-menu max-h-[70vh] overflow-y-auto shadow-lg border border-ink-300"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      <MenuButton onClick={() => { onCopy(); }}>
        {copied ? "Copied!" : "Copy URL"}
      </MenuButton>
      <MenuButton onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}>
        Open in new tab
      </MenuButton>
      <div className="h-px bg-ink-300 mx-2 my-1" />
      <MenuButton onClick={action(onReAnalyze)}>
        Re-analyze with AI
      </MenuButton>
      <MenuButton onClick={action(onTogglePin)}>
        {link.is_pinned ? "Unpin" : "Pin to top"}
      </MenuButton>
      {link.reading_status === "unread" ? (
        <MenuButton onClick={() => { onToggleReadingStatus?.(link, "read"); onClose(); }}>
          Mark as read
        </MenuButton>
      ) : link.reading_status === "read" ? (
        <MenuButton onClick={() => { onToggleReadingStatus?.(link, null); onClose(); }}>
          Remove from queue
        </MenuButton>
      ) : (
        <MenuButton onClick={() => { onToggleReadingStatus?.(link, "unread"); onClose(); }}>
          Add to reading queue
        </MenuButton>
      )}
      <MenuButton onClick={action(onMoveToCollection)}>
        Move to collection
      </MenuButton>
      <MenuButton onClick={action(onViewNotes)}>
        Notes{link.notes_count > 0 ? ` (${link.notes_count})` : ""}
      </MenuButton>
      <MenuButton onClick={action(onEdit)}>Edit details</MenuButton>
      <div className="h-px bg-ink-300 mx-2 my-1" />
      <MenuButton onClick={action(onDelete)} variant="danger">
        Delete
      </MenuButton>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-1.5 text-xs font-body transition-all duration-150",
        variant === "danger"
          ? "text-danger hover:bg-danger-subtle"
          : "text-paper-muted hover:bg-ink-200 hover:text-paper hover:pl-4"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// Icons
// ============================================================

function DotsIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}
