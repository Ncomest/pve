import type { ItemRarity, ItemStats } from "@/entities/item/model";

const rng = () => Math.random();

/** Базовые «единицы» для масштабирования линий статов (см. docs/balance-items). */
export const PROC_BASE: ItemStats = {
  hp: 10,
  power: 2,
  armor: 10,
  chanceCrit: 10,
  evasion: 10,
  speed: 10,
  accuracy: 10,
  critDefense: 10,
  lifesteal: 10,
};

/** Веса редкости: белая 90%, зелёная 4%, синяя 3%, эпическая 2%, уникальная 1%. */
const RARITY_WEIGHTS: { rarity: ItemRarity; weight: number }[] = [
  { rarity: "common", weight: 1 },
  { rarity: "uncommon", weight: 4 },
  { rarity: "rare", weight: 3 },
  { rarity: "epic", weight: 2 },
  { rarity: "unique", weight: 90 },
];

/** Доля силы ролла от «базового дропа» (min..max включительно в процентах). */
const RARITY_STRENGTH_RANGE: Record<ItemRarity, { min: number; max: number }> =
  {
    common: { min: 60, max: 80 },
    uncommon: { min: 70, max: 85 },
    rare: { min: 80, max: 90 },
    epic: { min: 90, max: 95 },
    unique: { min: 100, max: 100 },
  };

function pick<T>(a: T, b: T): T {
  return rng() < 0.5 ? a : b;
}

/**
 * Генерирует базовые статы предмета по редкости (до множителя уровня вещи).
 */
export function generateBaseStatsForRarity(rarity: ItemRarity): ItemStats {
  const out: ItemStats = {};

  const rollStatValue = (key: keyof typeof PROC_BASE) => {
    const { min: minPercent, max: maxPercent } = RARITY_STRENGTH_RANGE[rarity];
    const percent =
      (minPercent + Math.random() * (maxPercent - minPercent)) / 100;
    const baseValue = PROC_BASE[key] ?? 0;
    const result = Math.max(1, Math.round(baseValue * percent));
    return result;
  };

  // Логика выбора статов для разных редкостей
  if (rarity === "common") {
    if (pick(0, 1) === 0) out.power = rollStatValue("power");
    else out.armor = rollStatValue("armor");

    if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
    else out.hp = rollStatValue("hp");

    return out;
  }

  if (rarity === "uncommon") {
    if (pick(0, 1) === 0) out.power = rollStatValue("power");
    else out.armor = rollStatValue("armor");

    if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
    else out.hp = rollStatValue("hp");

    if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
    else out.speed = rollStatValue("speed");

    return out;
  }

  if (rarity === "rare") {
    if (pick(0, 1) === 0) out.power = rollStatValue("power");
    else out.armor = rollStatValue("armor");

    if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
    else out.hp = rollStatValue("hp");

    if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
    else out.speed = rollStatValue("speed");

    if (pick(0, 1) === 0) out.critDefense = rollStatValue("critDefense");
    else out.evasion = rollStatValue("evasion");

    return out;
  }

  if (rarity === "epic") {
    if (pick(0, 1) === 0) out.power = rollStatValue("power");
    else out.armor = rollStatValue("armor");

    if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
    else out.hp = rollStatValue("hp");

    if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
    else out.speed = rollStatValue("speed");

    if (pick(0, 1) === 0) out.critDefense = rollStatValue("critDefense");
    else out.evasion = rollStatValue("evasion");

    out.lifesteal = rollStatValue("lifesteal");

    return out;
  }

  // unique - все статы
  out.power = rollStatValue("power");
  out.armor = rollStatValue("armor");
  out.accuracy = rollStatValue("accuracy");
  out.hp = rollStatValue("hp");
  out.chanceCrit = rollStatValue("chanceCrit");
  out.speed = rollStatValue("speed");
  out.critDefense = rollStatValue("critDefense");
  out.evasion = rollStatValue("evasion");
  out.lifesteal = rollStatValue("lifesteal");

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
