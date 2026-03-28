// ============================================================
// App Constants — Frontend-specific constants
// ============================================================

export const VIEW_MODES = {
  GRID: "grid",
  LIST: "list",
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
