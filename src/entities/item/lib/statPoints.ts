/**
 * Вес статов «в процентах»: перевод очков (с вещей) в доли для формул (0..1).
 *
 * Где менять: здесь задаются CRIT_POINTS_TO_FRACTION, EVASION_POINTS_TO_FRACTION,
 * SPEED_POINTS_TO_FRACTION и ARMOR_POINTS_TO_FRACTION.
 * Формула: N очков = X%  =>  коэффициент = (X / 100) / N.
 * Примеры:
 * - 50 очков крита = 0.25%  =>  0.0025 / 50
 * - 25 очков уклонения = 0.25%  =>  0.0025 / 25 = 0.0001
 * - 50 очков скорости = 0.25%  =>  0.0025 / 50
 * - 50 очков брони = 1%       =>  0.01 / 50
 *
 * См. также docs/balance-items.md и docs/player-character-stats.md.
 * Суммирование очков с экипировки и слияние с базой героя: `entities/character/lib/playerStatAggregation.ts`.
 */
export const CRIT_POINTS_TO_FRACTION = 0.0025 / 50; // 50 очков ≈ 0.25%
export const EVASION_POINTS_TO_FRACTION = 0.0001; // 25 очков ≈ 0.25%
export const SPEED_POINTS_TO_FRACTION = 0.0025 / 50; // 50 очков скорости ≈ 0.25%
export const ARMOR_POINTS_TO_FRACTION = 0.01 / 50; // 50 очков брони ≈ 1% снижения урона
/** 50 очков меткости ≈ 0.25% (как крит) */
export const ACCURACY_POINTS_TO_FRACTION = 0.0025 / 50;
/** 50 очков защиты от крита ≈ 0.25% */
export const CRIT_DEFENSE_POINTS_TO_FRACTION = 0.0025 / 50;
/** 50 очков самоисцеления ≈ 0.25% урона в лечение */
export const LIFESTEAL_POINTS_TO_FRACTION = 0.0025 / 50;

/** Переводит очки крита в долю (для статов персонажа/боя). */
export function critPointsToFraction(points: number): number {
  return Math.min(1, points * CRIT_POINTS_TO_FRACTION);
}

/** Переводит очки уклонения в долю (для статов персонажа/боя). */
export function evasionPointsToFraction(points: number): number {
  return Math.min(1, points * EVASION_POINTS_TO_FRACTION);
}

/** Переводит очки скорости в долю (0..1) для отображения в UI. */
export function speedPointsToFraction(points: number): number {
  return Math.min(1, points * SPEED_POINTS_TO_FRACTION);
}

/** Переводит очки брони в долю снижения урона (0..1). */
export function armorPointsToFraction(points: number): number {
  return Math.min(0.9, Math.max(0, points * ARMOR_POINTS_TO_FRACTION));
}

export function accuracyPointsToFraction(points: number): number {
  return Math.min(1, Math.max(0, points * ACCURACY_POINTS_TO_FRACTION));
}

export function critDefensePointsToFraction(points: number): number {
  return Math.min(1, Math.max(0, points * CRIT_DEFENSE_POINTS_TO_FRACTION));
}

export function lifestealPointsToFraction(points: number): number {
  return Math.min(1, Math.max(0, points * LIFESTEAL_POINTS_TO_FRACTION));
}
