const RARITY_COLORS: Record<string, string> = {
  common: "rgba(156, 163, 175, 0.9)",
  rare: "rgba(96, 165, 250, 0.9)",
  epic: "rgba(168, 85, 247, 0.9)",
  legendary: "rgba(251, 191, 36, 0.9)",
};

export const rarityColor = (rarity: string): string =>
  RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
