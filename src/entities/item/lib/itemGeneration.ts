import type { ItemRarity, ItemStats } from "@/entities/item/model";

const rng = () => Math.random();

/** Базовые «единицы» для масштабирования линий статов (см. docs/balance-items). */
export const PROC_BASE: ItemStats = {
  hp: 5,
  power: 1,
  armor: 15,
  chanceCrit: 15,
  evasion: 15,
  speed: 15,
  accuracy: 15,
  critDefense: 15,
  lifesteal: 15,
};

/** Веса редкости: белая 72%, зелёная 15%, синяя 7%, эпическая 4%, уникальная 2%. */
const RARITY_WEIGHTS: { rarity: ItemRarity; weight: number }[] = [
  { rarity: "common", weight: 72 },
  { rarity: "uncommon", weight: 15 },
  { rarity: "rare", weight: 7 },
  { rarity: "epic", weight: 4 },
  { rarity: "unique", weight: 2 },
];

/** Доля силы ролла от «базового дропа» (min..max включительно в процентах). */
const RARITY_STRENGTH_RANGE: Record<ItemRarity, { min: number; max: number }> =
  {
    common: { min: 70, max: 80 },
    uncommon: { min: 75, max: 90 },
    rare: { min: 80, max: 90 },
    epic: { min: 80, max: 100 },
    unique: { min: 95, max: 100 },
  };

function pick<T>(a: T, b: T): T {
  return rng() < 0.5 ? a : b;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
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
    // Не округляем до целого слишком рано, иначе на высоком itemLevel
    // получаются «ступеньки» (кратно множителю уровня).
    const result = Math.max(1, roundToTwo(baseValue * percent));
    return result;
  };

  // Логика выбора статов для разных редкостей
  if (rarity === "common") {
    if (pick(0, 1) === 0) out.power = rollStatValue("power");
    else out.armor = rollStatValue("armor");

    if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
    else out.hp = rollStatValue("hp");

    if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
    else out.speed = rollStatValue("speed");

    return out;
  }

  if (rarity === "uncommon") {
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

  if (rarity === "rare") {
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

  if (rarity === "epic") {
    if (pick(0, 1) === 0) out.power = rollStatValue("power");
    else out.armor = rollStatValue("armor");

    if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
    else out.hp = rollStatValue("hp");

    if (pick(0, 1) === 0) out.critDefense = rollStatValue("critDefense");
    else out.evasion = rollStatValue("evasion");

    out.chanceCrit = rollStatValue("chanceCrit");
    out.speed = rollStatValue("speed");
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
