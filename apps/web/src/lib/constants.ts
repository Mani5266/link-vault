// ============================================================
// App Constants — Frontend-specific constants
// ============================================================

export const APP_NAME = "LinkVault";
export const APP_DESCRIPTION =
  "Your Personal AI-Powered Link Library";
export const APP_TAGLINE =
  "Paste any link. AI makes it memorable. Find anything instantly.";

export const VIEW_MODES = {
  GRID: "grid",
  LIST: "list",
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;
