// ============================================================
// Default Collections — Preset collections for new users
// ============================================================

export interface DefaultCollection {
  name: string;
  slug: string;
  emoji: string;
  color: string;
  position: number;
}

export const DEFAULT_COLLECTIONS: DefaultCollection[] = [
  {
    name: "Recipes",
    slug: "recipes",
    emoji: "🍳",
    color: "#f97316",
    position: 0,
  },
  {
    name: "Fitness",
    slug: "fitness",
    emoji: "💪",
    color: "#22c55e",
    position: 1,
  },
  {
    name: "Business",
    slug: "business",
    emoji: "💼",
    color: "#3b82f6",
    position: 2,
  },
  {
    name: "Tech",
    slug: "tech",
    emoji: "💻",
    color: "#8b5cf6",
    position: 3,
  },
  {
    name: "Shopping",
    slug: "shopping",
    emoji: "🛍️",
    color: "#ec4899",
    position: 4,
  },
  {
    name: "Entertainment",
    slug: "entertainment",
    emoji: "🎬",
    color: "#eab308",
    position: 5,
  },
];
