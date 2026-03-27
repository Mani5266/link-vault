"use client";

import { cn } from "@/lib/utils";

// ============================================================
// AIBadge — Editorial AI status indicator
// Gold tones for AI, uppercase micro text, sharp corners
// ============================================================

interface AIBadgeProps {
  /** Whether AI has processed this link */
  processed: boolean;
  /** Optional: is AI currently re-analyzing */
  isProcessing?: boolean;
  className?: string;
}

export function AIBadge({ processed, isProcessing, className }: AIBadgeProps) {
  if (isProcessing) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 text-micro font-medium uppercase tracking-editorial bg-gold-subtle text-gold",
          className
        )}
        style={{ borderRadius: "2px" }}
      >
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Analyzing
      </span>
    );
  }

  if (processed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 text-micro font-medium uppercase tracking-editorial bg-gold-subtle text-gold",
          className
        )}
        style={{ borderRadius: "2px" }}
        title="AI-enhanced metadata"
      >
        <SparkleIcon />
        AI
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-micro font-medium uppercase tracking-editorial bg-ink-200 text-paper-faint",
        className
      )}
      style={{ borderRadius: "2px" }}
      title="Not yet analyzed by AI"
    >
      <SparkleIcon />
      Basic
    </span>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a1 1 0 011 1v1.323l.954.416a1 1 0 01-.954 1.822L10 6.155l-1 .406a1 1 0 01-.954-1.822L9 4.323V3a1 1 0 011-1zm4.95 3.05a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM18 10a1 1 0 01-1 1h-1.323l-.416.954a1 1 0 01-1.822-.954L13.845 10l-.406-1a1 1 0 011.822-.954l.416.954H17a1 1 0 011 1zM5.05 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 18a1 1 0 01-1-1v-1.323l-.954-.416a1 1 0 01.954-1.822L10 13.845l1-.406a1 1 0 01.954 1.822l-.954.416V17a1 1 0 01-1 1z" />
    </svg>
  );
}
