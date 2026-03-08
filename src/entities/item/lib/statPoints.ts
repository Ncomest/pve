/**
 * Вес статов «в процентах»: перевод очков (с вещей) в доли для формул (0..1).
 *
 * Где менять: здесь задаются CRIT_POINTS_TO_FRACTION и EVASION_POINTS_TO_FRACTION.
 * Формула: N очков = X%  =>  коэффициент = (X / 100) / N.
 * Примеры: 50 очков = 0.25%  =>  0.0025/50;  25 очков уклонения = 0.25%  =>  0.0001.
 * См. также docs/balance-items.md.
 */
export const CRIT_POINTS_TO_FRACTION = 0.0025 / 50; // 50 очков ≈ 0.25%
export const EVASION_POINTS_TO_FRACTION = 0.0001;  // 25 очков ≈ 0.25%

/** Переводит очки крита в долю (для статов персонажа/боя). */
export function critPointsToFraction(points: number): number {
  return Math.min(1, points * CRIT_POINTS_TO_FRACTION);
}

/** Переводит очки уклонения в долю (для статов персонажа/боя). */
export function evasionPointsToFraction(points: number): number {
  return Math.min(1, points * EVASION_POINTS_TO_FRACTION);
}
