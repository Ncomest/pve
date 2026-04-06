/**
 * Вес статов «в процентах»: перевод очков (с вещей) в доли для формул (0..1).
 *
 * Где менять: здесь задаются CRIT_POINTS_TO_FRACTION, EVASION_POINTS_TO_FRACTION,
 * SPEED_POINTS_TO_FRACTION и ARMOR_POINTS_TO_FRACTION.
 * Формула: N очков = X%  =>  коэффициент = (X / 100) / N.
 * Примеры:
 * - 10 очков крита = 0.25%  =>  0.0025 / 10
 * - 10 очков уклонения = 0.25%  =>  0.0025 / 10 = 0.0001
 * - 10 очков скорости = 0.25%  =>  0.0025 / 10
 * - 10 очков брони = 1%       =>  0.01 / 10
 *
 * См. также docs/balance-items.md и docs/player-character-stats.md.
 * Суммирование очков с экипировки и слияние с базой героя: `entities/character/lib/playerStatAggregation.ts`.
 */
export const CRIT_POINTS_TO_FRACTION = 0.0025 / 10; // 10 очков ≈ 0.25%
export const EVASION_POINTS_TO_FRACTION = 0.0025 / 10; // 10 очков ≈ 0.25%
export const SPEED_POINTS_TO_FRACTION = 0.0025 / 10; // 10 очков скорости ≈ 0.25%
export const ARMOR_POINTS_TO_FRACTION = 0.037 / 10; // 10 очков брони ≈ 1% снижения урона
/** 10 очков меткости ≈ 0.25% (как крит) */
export const ACCURACY_POINTS_TO_FRACTION = 0.0095 / 10;
/** 10 очков защиты от крита ≈ 0.25% */
export const CRIT_DEFENSE_POINTS_TO_FRACTION = 0.0025 / 10;
/** 10 очков самоисцеления ≈ 0.05% урона в лечение */
export const LIFESTEAL_POINTS_TO_FRACTION = 0.0005 / 10;

/** Переводит очки крита в долю (для статов персонажа/боя). */
// export function critPointsToFraction(points: number): number {
// return Math.min(1, points * CRIT_POINTS_TO_FRACTION);
// }

/** Переводит очки уклонения в долю (для статов персонажа/боя). */
// export function evasionPointsToFraction(points: number): number {
// return Math.min(1, points * EVASION_POINTS_TO_FRACTION);
// }

/** Переводит очки скорости в долю (0..1) для отображения в UI. */
// export function speedPointsToFraction(points: number): number {
//   return Math.min(1, points * SPEED_POINTS_TO_FRACTION);
// }

/** Переводит очки брони в долю снижения урона (0..1). */
// export function armorPointsToFraction(points: number): number {
//   return Math.min(0.5, Math.max(0, points * ARMOR_POINTS_TO_FRACTION));
// }

// export function accuracyPointsToFraction(points: number): number {
//   return Math.min(1, Math.max(0, points * ACCURACY_POINTS_TO_FRACTION));
// }

// export function critDefensePointsToFraction(points: number): number {
//   return Math.min(1, Math.max(0, points * CRIT_DEFENSE_POINTS_TO_FRACTION));
// }

// export function lifestealPointsToFraction(points: number): number {
//   return Math.min(1, Math.max(0, points * LIFESTEAL_POINTS_TO_FRACTION));
// }

// ========================
// В отдельном файле, например, level-scaling.ts

/**
 * Коэффициенты конвертации очков в проценты с демпингом от уровня
 * Чем выше уровень, тем меньше каждый очко стата даёт процентов
 */

export interface ScalingConfig {
  baseEfficiency: number; // базовая эффективность на 1 уровне
  falloffRate: number; // скорость падения эффективности
}

/** Получить эффективность конвертации для текущего уровня */
export function getConversionEfficiency(level: number): number {
  // Защита от некорректных значений
  if (!level || level < 1) return 1;

  // Новая формула: eff(L) = 1 / (1 + falloff * (L-1))
  // level 1: 1.0 (100% эффективности)
  // level 2: 1 / 1.4 = 0.714 (71%)
  // level 3: 1 / 1.8 = 0.555 (55%)
  // level 5: 1 / 2.6 = 0.384 (38%)
  // level 10: 1 / 4.6 = 0.217 (21%)
  // level 20: 1 / 8.6 = 0.116 (11%)

  const falloff = 0.4; // скорость падения (чем меньше, тем медленнее падает)
  const efficiency = 1 / (1 + falloff * (level - 1));

  // Гарантируем, что эффективность не падает ниже 5%
  return Math.max(0.05, Math.min(1, efficiency));
}

/** Конвертирует очки крита в процент с учётом уровня */
export function critPointsToFraction(points: number, level: number): number {
  const efficiency = getConversionEfficiency(level);
  // const baseConversion = 0.0025 / 10; // 10 очков = 0.25%
  return Math.min(1, points * CRIT_POINTS_TO_FRACTION * efficiency);
}

/** То же самое для остальных статов */
export function evasionPointsToFraction(points: number, level: number): number {
  const efficiency = getConversionEfficiency(level);
  // const baseConversion = 0.0025 / 10;
  return Math.min(1, points * EVASION_POINTS_TO_FRACTION * efficiency);
}

export function speedPointsToFraction(points: number, level: number): number {
  const efficiency = getConversionEfficiency(level);
  // const baseConversion = 0.0025 / 10;
  return Math.min(1, points * SPEED_POINTS_TO_FRACTION * efficiency);
}

export function accuracyPointsToFraction(
  points: number,
  level: number,
): number {
  const efficiency = getConversionEfficiency(level);
  // const baseConversion = 0.007 / 10;
  return Math.min(1, points * ACCURACY_POINTS_TO_FRACTION * efficiency);
}

export function critDefensePointsToFraction(
  points: number,
  level: number,
): number {
  const efficiency = getConversionEfficiency(level);
  // const baseConversion = 0.0025 / 10;
  return Math.min(1, points * CRIT_DEFENSE_POINTS_TO_FRACTION * efficiency);
}

export function lifestealPointsToFraction(
  points: number,
  level: number,
): number {
  const efficiency = getConversionEfficiency(level);
  // const baseConversion = 0.0005 / 10;
  return Math.min(1, points * LIFESTEAL_POINTS_TO_FRACTION * efficiency);
}

/** Броня конвертируется иначе */
export function armorPointsToFraction(points: number, level: number): number {
  const efficiency = getConversionEfficiency(level);
  // const baseConversion = 0.01 / 10; // 10 очков = 1%
  return Math.min(1, points * ARMOR_POINTS_TO_FRACTION * efficiency);
}
