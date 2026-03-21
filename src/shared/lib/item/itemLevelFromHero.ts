/** Уровень вещи при дропе/крафте от уровня героя (как в docs/item-level-and-loot.md). */
export function itemLevelFromHeroLevel(heroLevel: number): number {
  const h = Math.max(1, heroLevel);
  return 1 + h * 3;
}
