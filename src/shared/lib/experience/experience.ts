/**
 * Опыт для перехода с уровня n на уровень n+1.
 * Формула: 100 + 20 × (n - 1)
 */
export function expNeededForLevel(level: number): number {
  if (level < 1) return 100;
  return 100 + 20 * (level - 1);
}

/**
 * Опыт за победу над монстром уровня m.
 * Формула: 10 × m
 */
export function expGainedFromMonster(monsterLevel: number): number {
  return 10 * Math.max(0, monsterLevel);
}
