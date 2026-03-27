// ============================================================
// Content Categories — Predefined link categories
// ============================================================

export const LINK_CATEGORIES = [
  { value: "video", label: "Video", emoji: "🎬" },
  { value: "article", label: "Article", emoji: "📄" },
  { value: "recipe", label: "Recipe", emoji: "🍳" },
  { value: "product", label: "Product", emoji: "🛒" },
  { value: "tutorial", label: "Tutorial", emoji: "📚" },
  { value: "social", label: "Social", emoji: "💬" },
  { value: "tool", label: "Tool", emoji: "🔧" },
  { value: "news", label: "News", emoji: "📰" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "podcast", label: "Podcast", emoji: "🎙️" },
  { value: "other", label: "Other", emoji: "🔗" },
] as const;

export type CategoryValue = (typeof LINK_CATEGORIES)[number]["value"];
