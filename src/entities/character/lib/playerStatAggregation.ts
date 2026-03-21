/**
 * Единая точка: как база героя, уровень и экипировка складываются в боевые статы,
 * а также как скорость и броня переводятся при эликсирах «+X%».
 *
 * Где крутить баланс:
 * - коэффициенты «очки → доля» (крит, уклонение, скорость, броня, …): `entities/item/lib/statPoints.ts`;
 * - процедурные статы лута: `itemGeneration.ts` (PROC_BASE); id/имена слотов — `items-db.ts` без чисел в `baseStats`;
 * - рост статов от уровня вещи: `entities/item/lib/itemLevel.ts`;
 * - стартовые статы героя: `entities/character/model.ts` (`PLAYER_CHARACTER`);
 * - прирост HP/силы за уровень персонажа: константы `LEVEL_HP_PER_LEVEL`, `LEVEL_POWER_PER_LEVEL` ниже;
 * - потолок снижения кулдаунов от скорости: `MAX_COOLDOWN_REDUCTION_FROM_SPEED`.
 *
 * Подробнее: `docs/player-character-stats.md`.
 */

import type { Stats } from "@/entities/boss/model";
import type { ItemStats } from "@/entities/item/model";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import {
  critPointsToFraction,
  evasionPointsToFraction,
  accuracyPointsToFraction,
  critDefensePointsToFraction,
  lifestealPointsToFraction,
  speedPointsToFraction,
  armorPointsToFraction,
  SPEED_POINTS_TO_FRACTION,
  ARMOR_POINTS_TO_FRACTION,
} from "@/entities/item/lib/statPoints";

/** Прирост HP за каждый уровень персонажа выше 1 (см. `usePlayerProgress` / бой). */
export const LEVEL_HP_PER_LEVEL = 20;

/** Прирост силы атаки за каждый уровень персонажа выше 1. */
export const LEVEL_POWER_PER_LEVEL = 2;

/**
 * Максимальная доля сокращения времени кулдаунов от скорости (очки + временные баффы),
 * не считая множителя `speedFactor` как такового.
 */
export const MAX_COOLDOWN_REDUCTION_FROM_SPEED = 0.7;

/** Базовое значение стата скорости у героя без экипировки (опорная точка; очки с вещей идут сверху). */
export function playerSpeedBaseline(): number {
  return PLAYER_CHARACTER.stats.speed ?? 2;
}

/** Суммарные бонусы только с экипировки (как в Pinia `equipmentStats`). */
export interface EquipmentBonuses {
  hp: number;
  power: number;
  /** Доля 0..1 после перевода очков крита с вещей. */
  chanceCrit: number;
  /** Доля 0..1 после перевода очков уклонения с вещей. */
  evasion: number;
  /** Сумма очков скорости с предметов (к базовому stat скорости героя). */
  speed: number;
  armor: number;
  /** Доля 0..1 после перевода очков меткости. */
  accuracy: number;
  /** Доля 0..1 после перевода очков защиты от крита. */
  critDefense: number;
  /** Сумма очков духа (без перевода в долю). */
  spirit: number;
  /** Доля 0..1 после перевода очков самоисцеления. */
  lifesteal: number;
}

/**
 * Суммирует эффективные статы снятых предметов в бонусы для героя
 * (перевод очков → доли там, где нужно).
 */
export function aggregateEquipmentBonuses(partials: ItemStats[]): EquipmentBonuses {
  const stats: EquipmentBonuses = {
    hp: 0,
    power: 0,
    chanceCrit: 0,
    evasion: 0,
    speed: 0,
    armor: 0,
    accuracy: 0,
    critDefense: 0,
    spirit: 0,
    lifesteal: 0,
  };
  let critPoints = 0;
  let evasionPoints = 0;
  let accuracyPoints = 0;
  let critDefensePoints = 0;
  let lifestealPoints = 0;

  for (const effective of partials) {
    stats.hp += effective.hp ?? 0;
    stats.power += effective.power ?? 0;
    critPoints += effective.chanceCrit ?? 0;
    evasionPoints += effective.evasion ?? 0;
    stats.speed += effective.speed ?? 0;
    stats.armor += effective.armor ?? 0;
    accuracyPoints += effective.accuracy ?? 0;
    critDefensePoints += effective.critDefense ?? 0;
    stats.spirit += effective.spirit ?? 0;
    lifestealPoints += effective.lifesteal ?? 0;
  }

  stats.chanceCrit = critPointsToFraction(critPoints);
  stats.evasion = evasionPointsToFraction(evasionPoints);
  stats.accuracy = accuracyPointsToFraction(accuracyPoints);
  stats.critDefense = critDefensePointsToFraction(critDefensePoints);
  stats.lifesteal = lifestealPointsToFraction(lifestealPoints);

  return stats;
}

/** Суммы «очков» с предметов до перевода в доли (для UI: «200 очков → 1%»). */
export interface EquipmentRawPoints {
  crit: number;
  evasion: number;
  speed: number;
  armor: number;
  accuracy: number;
  critDefense: number;
  lifesteal: number;
  spirit: number;
}

export function aggregateEquipmentRawPoints(partials: ItemStats[]): EquipmentRawPoints {
  const out: EquipmentRawPoints = {
    crit: 0,
    evasion: 0,
    speed: 0,
    armor: 0,
    accuracy: 0,
    critDefense: 0,
    lifesteal: 0,
    spirit: 0,
  };
  for (const effective of partials) {
    out.crit += effective.chanceCrit ?? 0;
    out.evasion += effective.evasion ?? 0;
    out.speed += effective.speed ?? 0;
    out.armor += effective.armor ?? 0;
    out.accuracy += effective.accuracy ?? 0;
    out.critDefense += effective.critDefense ?? 0;
    out.lifesteal += effective.lifesteal ?? 0;
    out.spirit += effective.spirit ?? 0;
  }
  return out;
}

/**
 * Итоговые статы героя в бою: база из `PLAYER_CHARACTER` + прирост уровня + экипировка.
 */
export function buildPlayerCombatStats(
  base: Stats,
  equipment: EquipmentBonuses,
  level: number,
): Stats {
  const bonusHp = Math.max(0, level - 1) * LEVEL_HP_PER_LEVEL;
  const bonusPower = Math.max(0, level - 1) * LEVEL_POWER_PER_LEVEL;
  const baseline = playerSpeedBaseline();

  return {
    hp: base.maxHp + bonusHp + equipment.hp,
    maxHp: base.maxHp + bonusHp + equipment.hp,
    power: base.power + bonusPower + equipment.power,
    chanceCrit: Math.min(1, (base.chanceCrit ?? 0) + equipment.chanceCrit),
    evasion: Math.min(1, (base.evasion ?? 0) + equipment.evasion),
    speed: (base.speed ?? baseline) + equipment.speed,
    armor: (base.armor ?? 0) + equipment.armor,
    accuracy: Math.min(1, (base.accuracy ?? 0) + equipment.accuracy),
    critDefense: Math.min(1, (base.critDefense ?? 0) + equipment.critDefense),
    spirit: (base.spirit ?? 0) + equipment.spirit,
    lifesteal: Math.min(1, (base.lifesteal ?? 0) + equipment.lifesteal),
  };
}

/** Очки скорости с экипировки от полного значения стата скорости (база вычитается). */
export function speedGearPointsFromTotalSpeedStat(totalSpeed: number): number {
  return Math.max(0, totalSpeed - playerSpeedBaseline());
}

/**
 * Множитель длительности кулдаунов: 1 = без ускорения, меньше — быстрее перезарядка.
 * `extraCooldownReductionFraction` — доля 0..1 от временных эффектов (напр. способность «Молниеносная вспышка»).
 */
export function cooldownFactorFromSpeed(
  totalSpeedStat: number,
  extraCooldownReductionFraction: number,
): number {
  const speedPoints = speedGearPointsFromTotalSpeedStat(totalSpeedStat);
  const speedFromPoints = speedPointsToFraction(speedPoints);
  const totalReduction = Math.min(
    MAX_COOLDOWN_REDUCTION_FROM_SPEED,
    speedFromPoints + extraCooldownReductionFraction,
  );
  return 1 - totalReduction;
}

/**
 * Эликсир брони: прибавка к доле снижения урона, затем обратно в очки брони.
 */
export function applyElixirArmorPercentToArmorPoints(
  armorPoints: number,
  armorPercentBonus: number,
): number {
  const beforeReduction = armorPointsToFraction(armorPoints);
  const afterReduction = Math.min(0.9, beforeReduction + armorPercentBonus);
  return Math.round(afterReduction / ARMOR_POINTS_TO_FRACTION);
}

/**
 * Эликсир скорости: прибавка к доле сокращения кулдаунов, затем обратно в полный stat скорости.
 */
export function applyElixirSpeedPercentToSpeedTotal(
  speedTotalBeforeElixir: number,
  speedPercentBonus: number,
): number {
  const beforePoints = speedGearPointsFromTotalSpeedStat(speedTotalBeforeElixir);
  const beforeReduction = speedPointsToFraction(beforePoints);
  const afterReduction = Math.min(1, beforeReduction + speedPercentBonus);
  const afterPoints = afterReduction / SPEED_POINTS_TO_FRACTION;
  return afterPoints + playerSpeedBaseline();
}
