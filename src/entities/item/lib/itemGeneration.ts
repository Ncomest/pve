import type { ItemRarity, ItemSlot, ItemStats } from "@/entities/item/model";

const rng = () => Math.random();

type ProcBaseKey =
  | "hp"
  | "power"
  | "armor"
  | "chanceCrit"
  | "evasion"
  | "speed"
  | "accuracy"
  | "critDefense"
  | "lifesteal";

type ProcBaseStats = Partial<Record<ProcBaseKey, number>>;

/** Базовые «единицы» для масштабирования линий статов на оружии. */
export const PROC_BASE_WEAPON: ProcBaseStats = {
  power: 5,
  chanceCrit: 25,
  evasion: 25,
  speed: 25,
  accuracy: 25,
  critDefense: 25,
  lifesteal: 25,
};

/** Базовые «единицы» для масштабирования линий статов на броне. */
export const PROC_BASE_ARMOR: ProcBaseStats = {
  hp: 5,
  armor: 25,
  chanceCrit: 25,
  evasion: 25,
  speed: 25,
  accuracy: 25,
  critDefense: 25,
  lifesteal: 25,
};

/** Базовые «единицы» для масштабирования линий статов на ювелирке. */
export const PROC_BASE_JEWELRY: ProcBaseStats = {
  hp: 15,
  chanceCrit: 25,
  evasion: 25,
  speed: 25,
  accuracy: 25,
  critDefense: 25,
  lifesteal: 25,
};

/** Веса редкости: белая 75%, зелёная 12%, синяя 8%, эпическая 3%, уникальная 2%. */
const RARITY_WEIGHTS: { rarity: ItemRarity; weight: number }[] = [
  { rarity: "common", weight: 75 },
  { rarity: "uncommon", weight: 12 },
  { rarity: "rare", weight: 8 },
  { rarity: "epic", weight: 3 },
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
export function generateBaseStatsForRarity(
  rarity: ItemRarity,
  slot?: ItemSlot,
): ItemStats {
  const out: ItemStats = {};
  const isWeapon = slot === "weapon";
  const isJewelry =
    slot === "ring" || slot === "necklace" || slot === "earring";
  const canRollArmor =
    slot === "helmet" ||
    slot === "chest" ||
    slot === "belt" ||
    slot === "pants" ||
    slot === "boots" ||
    slot === "shield";
  const procBase = isWeapon
    ? PROC_BASE_WEAPON
    : isJewelry
      ? PROC_BASE_JEWELRY
      : PROC_BASE_ARMOR;

  const rollStatValue = (key: ProcBaseKey) => {
    const { min: minPercent, max: maxPercent } = RARITY_STRENGTH_RANGE[rarity];
    const percent =
      (minPercent + Math.random() * (maxPercent - minPercent)) / 100;
    const baseValue = procBase[key] ?? 0;
    // Не округляем до целого слишком рано, иначе на высоком itemLevel
    // получаются «ступеньки» (кратно множителю уровня).
    const result = Math.max(1, roundToTwo(baseValue * percent));
    return result;
  };

  // Логика выбора статов для разных редкостей
  if (rarity === "common") {
    if (isWeapon) {
      out.power = rollStatValue("power");
    } else if (canRollArmor) {
      out.armor = rollStatValue("armor");
      out.hp = rollStatValue("hp");
    } else if (isJewelry) {
      out.hp = rollStatValue("hp");
    }

    return out;
  }

  if (rarity === "uncommon") {
    if (isWeapon) {
      out.power = rollStatValue("power");

      if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
      else out.lifesteal = rollStatValue("lifesteal");
    } else if (canRollArmor) {
      out.armor = rollStatValue("armor");
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.critDefense = rollStatValue("critDefense");
      else out.evasion = rollStatValue("evasion");
    } else if (isJewelry) {
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
      else out.speed = rollStatValue("speed");
    }

    return out;
  }

  if (rarity === "rare") {
    if (isWeapon) {
      out.power = rollStatValue("power");

      if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
      else out.lifesteal = rollStatValue("lifesteal");

      out.chanceCrit = rollStatValue("chanceCrit");
    } else if (canRollArmor) {
      out.armor = rollStatValue("armor");
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.critDefense = rollStatValue("critDefense");
      else out.evasion = rollStatValue("evasion");

      if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
      else out.speed = rollStatValue("speed");
    } else if (isJewelry) {
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
      else out.speed = rollStatValue("speed");

      if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
      else out.lifesteal = rollStatValue("lifesteal");
    }

    return out;
  }

  if (rarity === "epic") {
    if (isWeapon) {
      out.power = rollStatValue("power");

      if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
      else out.lifesteal = rollStatValue("lifesteal");

      out.chanceCrit = rollStatValue("chanceCrit");
      out.speed = rollStatValue("speed");
    } else if (canRollArmor) {
      out.armor = rollStatValue("armor");
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.critDefense = rollStatValue("critDefense");
      else out.evasion = rollStatValue("evasion");

      if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
      else out.speed = rollStatValue("speed");

      out.accuracy = rollStatValue("accuracy");
    } else if (isJewelry) {
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
      else out.speed = rollStatValue("speed");

      if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
      else out.lifesteal = rollStatValue("lifesteal");

      out.evasion = rollStatValue("evasion");
    }

    return out;
  }

  if (rarity === "unique") {
    if (isWeapon) {
      out.power = rollStatValue("power");

      if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
      else out.lifesteal = rollStatValue("lifesteal");

      out.chanceCrit = rollStatValue("chanceCrit");
      out.speed = rollStatValue("speed");

      if (pick(0, 1) === 0) out.evasion = rollStatValue("evasion");
      else out.critDefense = rollStatValue("critDefense");
    } else if (canRollArmor) {
      out.armor = rollStatValue("armor");
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.critDefense = rollStatValue("critDefense");
      else out.evasion = rollStatValue("evasion");

      if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
      else out.speed = rollStatValue("speed");

      out.accuracy = rollStatValue("accuracy");
      out.lifesteal = rollStatValue("lifesteal");
    } else if (isJewelry) {
      out.hp = rollStatValue("hp");

      if (pick(0, 1) === 0) out.chanceCrit = rollStatValue("chanceCrit");
      else out.speed = rollStatValue("speed");

      if (pick(0, 1) === 0) out.accuracy = rollStatValue("accuracy");
      else out.lifesteal = rollStatValue("lifesteal");

      out.evasion = rollStatValue("evasion");
      out.critDefense = rollStatValue("critDefense");
    }

    return out;
  }

  return out;
}
/** Случайная редкость по весам 75/12/8/3/2. */
export function rollItemRarity(): ItemRarity {
  const total = RARITY_WEIGHTS.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return "common";
}
