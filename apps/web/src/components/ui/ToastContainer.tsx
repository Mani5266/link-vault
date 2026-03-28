"use client";

import { useToastStore } from "@/stores/toastStore";
import type { ToastVariant, ToastAction } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

// ============================================================
// ToastContainer — Editorial toast notifications
// Warm tones, hairline borders, sharp corners
// ============================================================

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none md:bottom-6 md:right-6">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          action={toast.action}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// ============================================================
// ToastItem — Individual toast notification
// ============================================================

function ToastItem({
  message,
  variant,
  action,
  onDismiss,
}: {
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 px-4 py-3 border animate-slide-up font-body shadow-toast",
        variant === "success" && "bg-ink-50 border-success/20 text-success",
        variant === "error" && "bg-ink-50 border-danger/20 text-danger",
        variant === "info" && "bg-ink-50 border-accent/20 text-accent"
      )}
      style={{ borderRadius: "var(--radius-md)" }}
    >
      {/* Icon */}
      <span className="shrink-0">
        {variant === "success" && <SuccessIcon />}
        {variant === "error" && <ErrorIcon />}
        {variant === "info" && <InfoIcon />}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm font-medium">{message}</p>

      {/* Action button (e.g. Undo) */}
      {action && (
        <button
          onClick={() => { action.onClick(); onDismiss(); }}
          className="shrink-0 px-2 py-0.5 text-xs font-semibold uppercase tracking-editorial text-paper hover:text-white bg-ink-300 hover:bg-ink-400 transition-all duration-200 hover:scale-105"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          {action.label}
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 hover:bg-ink-200 transition-all duration-200 opacity-60 hover:opacity-100"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================

function SuccessIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
