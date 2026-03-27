// ============================================================
// Frontend-specific type extensions
// ============================================================

export type { ViewMode } from "@/lib/constants";

/** Toast notification type */
export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}
