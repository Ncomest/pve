import type { ItemRarity, ItemStats } from "@/entities/item/model";

const rng = () => Math.random();

/** Базовые «единицы» для масштабирования линий статов (см. docs/balance-items). */
export const PROC_BASE: ItemStats = {
  hp: 5,
  power: 2,
  armor: 50,
  chanceCrit: 50,
  evasion: 25,
  speed: 50,
  spirit: 50,
  accuracy: 50,
  critDefense: 50,
  lifesteal: 50,
};

/** Веса редкости: белая 90%, зелёная 4%, синяя 3%, эпическая 2%, уникальная 1%. */
const RARITY_WEIGHTS: { rarity: ItemRarity; weight: number }[] = [
  { rarity: "common", weight: 90 },
  { rarity: "uncommon", weight: 4 },
  { rarity: "rare", weight: 3 },
  { rarity: "epic", weight: 2 },
  { rarity: "unique", weight: 1 },
];

/** Доля силы ролла от «базового дропа» (min..max включительно в процентах). */
const RARITY_STRENGTH_RANGE: Record<ItemRarity, { min: number; max: number }> = {
  common: { min: 10, max: 20 },
  uncommon: { min: 21, max: 40 },
  rare: { min: 41, max: 60 },
  epic: { min: 61, max: 80 },
  unique: { min: 81, max: 100 },
};

function rollStrengthPercent(rarity: ItemRarity): number {
  const { min, max } = RARITY_STRENGTH_RANGE[rarity];
  return (min + rng() * (max - min)) / 100;
}

function pick<T>(a: T, b: T): T {
  return rng() < 0.5 ? a : b;
}

/**
 * Генерирует базовые статы предмета по редкости (до множителя уровня вещи).
 */
export function generateBaseStatsForRarity(rarity: ItemRarity): ItemStats {
  const S = rollStrengthPercent(rarity);
  const out: ItemStats = {};

  const scale = (key: keyof typeof PROC_BASE) =>
    Math.max(1, Math.round((PROC_BASE[key] ?? 0) * S));

  if (rarity === "common") {
    if (pick(0, 1) === 0) {
      out.power = scale("power");
    } else {
      out.armor = scale("armor");
    }
    if (pick(0, 1) === 0) {
      out.spirit = scale("spirit");
    } else {
      out.accuracy = scale("accuracy");
    }
    out.hp = scale("hp");
    return out;
  }

  if (rarity === "uncommon") {
    if (pick(0, 1) === 0) out.power = scale("power");
    else out.armor = scale("armor");
    if (pick(0, 1) === 0) out.spirit = scale("spirit");
    else out.accuracy = scale("accuracy");
    if (pick(0, 1) === 0) out.chanceCrit = scale("chanceCrit");
    else out.speed = scale("speed");
    out.hp = scale("hp");
    return out;
  }

  if (rarity === "rare") {
    if (pick(0, 1) === 0) out.power = scale("power");
    else out.armor = scale("armor");
    if (pick(0, 1) === 0) out.spirit = scale("spirit");
    else out.accuracy = scale("accuracy");
    if (pick(0, 1) === 0) out.chanceCrit = scale("chanceCrit");
    else out.speed = scale("speed");
    if (pick(0, 1) === 0) out.critDefense = scale("critDefense");
    else out.evasion = scale("evasion");
    out.hp = scale("hp");
    return out;
  }

  if (rarity === "epic") {
    if (pick(0, 1) === 0) out.power = scale("power");
    else out.armor = scale("armor");
    if (pick(0, 1) === 0) out.spirit = scale("spirit");
    else out.accuracy = scale("accuracy");
    if (pick(0, 1) === 0) out.chanceCrit = scale("chanceCrit");
    else out.speed = scale("speed");
    if (pick(0, 1) === 0) out.critDefense = scale("critDefense");
    else out.evasion = scale("evasion");
    out.lifesteal = scale("lifesteal");
    out.hp = scale("hp");
    return out;
  }

  // unique
  if (pick(0, 1) === 0) out.power = scale("power");
  else out.armor = scale("armor");
  if (pick(0, 1) === 0) out.spirit = scale("spirit");
  else out.accuracy = scale("accuracy");
  out.chanceCrit = scale("chanceCrit");
  out.speed = scale("speed");
  if (pick(0, 1) === 0) out.critDefense = scale("critDefense");
  else out.evasion = scale("evasion");
  out.lifesteal = scale("lifesteal");
  out.hp = scale("hp");
  return out;
}

/** Случайная редкость по весам 90/4/3/2/1. */
export function rollItemRarity(): ItemRarity {
  const total = RARITY_WEIGHTS.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return "common";
}
