import { create } from "zustand";

// ============================================================
// Toast Store — Lightweight notification system
// ============================================================

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, duration?: number, action?: ToastAction) => string;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, variant = "success", duration = 3000, action?) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const toast: Toast = { id, message, variant, duration, action };

    set((state) => ({
      toasts: [...state.toasts, toast].slice(-5), // max 5 visible
    }));

    // Auto-dismiss
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// ============================================================
// useToast — Convenience hook with typed helper methods
// ============================================================

export function useToast() {
  const { addToast } = useToastStore();

  return {
    success: (message: string) => addToast(message, "success"),
    error: (message: string) => addToast(message, "error", 5000),
    info: (message: string) => addToast(message, "info"),
  };
}
