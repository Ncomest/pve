import type { ItemTemplate, EquipmentSlot } from "@/entities/item/model";

/**
 * База шаблонов вещей и их статов.
 *
 * Баланс: базовые значения статов меняются в константе BASE ниже.
 * Вес крита/уклонения (очки → %) — в lib/statPoints.ts.
 * Подробнее: см. docs/balance-items.md.
 */

type Rarity = ItemTemplate["rarity"];

const SLOTS: EquipmentSlot[] = [
  "helmet",
  "chest",
  "earring",
  "ring",
  "weapon",
  "shield",
  "belt",
  "pants",
  "boots",
  "necklace",
];

/** Базовые статы для шаблонов (у каждой вещи 3 стата из STAT_COMBOS). hp/power/speed/armor — числа как есть; chanceCrit и evasion — в очках (перевод в % в lib/statPoints.ts). */
const BASE = {
  hp: 5,
  power: 2,
  chanceCrit: 50,
  evasion: 25,
  speed: 50,
  armor: 50,
} as const;

/** Комбинации из 3 статов на вещь (менять при добавлении статов в BASE). */
const STAT_COMBOS: (keyof typeof BASE)[][] = [
  ["hp", "power", "chanceCrit"],
  ["hp", "power", "evasion"],
  ["hp", "power", "speed"],
  ["hp", "power", "armor"],
  ["hp", "chanceCrit", "evasion"],
  ["hp", "chanceCrit", "speed"],
  ["hp", "chanceCrit", "armor"],
  ["hp", "evasion", "speed"],
  ["hp", "evasion", "armor"],
  ["hp", "speed", "armor"],
];

const SLOT_NAMES_RU: Record<EquipmentSlot, string[]> = {
  helmet: [
    "Кожаный шлем",
    "Железный шлем",
    "Шлем стойкости",
    "Шлем удачи",
    "Шлем ветра",
    "Шлем защитника",
    "Шлем берсерка",
    "Шлем следопыта",
    "Шлем мага",
    "Королевский шлем",
  ],
  chest: [
    "Кожаная кираса",
    "Железная кираса",
    "Нагрудник стойкости",
    "Нагрудник удачи",
    "Нагрудник скорости",
    "Доспех защитника",
    "Доспех берсерка",
    "Доспех следопыта",
    "Доспех мага",
    "Драконья броня",
  ],
  earring: [
    "Бронзовая серьга",
    "Серебряная серьга",
    "Серьга стойкости",
    "Серьга удачи",
    "Серьга ветра",
    "Серьга защитника",
    "Серьга берсерка",
    "Серьга следопыта",
    "Изумрудная серьга",
    "Серьга мудреца",
  ],
  ring: [
    "Медное кольцо",
    "Серебряное кольцо",
    "Кольцо стойкости",
    "Кольцо удачи",
    "Кольцо ветра",
    "Кольцо защитника",
    "Кольцо берсерка",
    "Кольцо следопыта",
    "Кольцо мага",
    "Мистическое кольцо",
  ],
  weapon: [
    "Деревянный меч",
    "Железный меч",
    "Клинок стойкости",
    "Клинок удачи",
    "Клинок ветра",
    "Клинок защитника",
    "Клинок берсерка",
    "Клинок следопыта",
    "Клинок мага",
    "Легендарный клинок",
  ],
  shield: [
    "Деревянный щит",
    "Железный щит",
    "Щит стойкости",
    "Щит удачи",
    "Щит ветра",
    "Щит защитника",
    "Щит берсерка",
    "Щит следопыта",
    "Щит мага",
    "Драконий щит",
  ],
  belt: [
    "Кожаный пояс",
    "Железный пояс",
    "Пояс стойкости",
    "Пояс удачи",
    "Пояс ветра",
    "Пояс защитника",
    "Пояс берсерка",
    "Пояс следопыта",
    "Пояс мага",
    "Пояс из чешуи дракона",
  ],
  pants: [
    "Кожаные штаны",
    "Кольчужные штаны",
    "Штаны стойкости",
    "Штаны удачи",
    "Штаны ветра",
    "Штаны защитника",
    "Штаны берсерка",
    "Штаны следопыта",
    "Штаны мага",
    "Штаны тени",
  ],
  boots: [
    "Кожаные ботинки",
    "Железные сапоги",
    "Ботинки стойкости",
    "Ботинки удачи",
    "Сапоги ветра",
    "Ботинки защитника",
    "Ботинки берсерка",
    "Ботинки следопыта",
    "Ботинки мага",
    "Сапоги мудреца",
  ],
  necklace: [
    "Костяное ожерелье",
    "Серебряная цепочка",
    "Ожерелье стойкости",
    "Ожерелье удачи",
    "Ожерелье ветра",
    "Ожерелье защитника",
    "Ожерелье берсерка",
    "Ожерелье следопыта",
    "Ожерелье мага",
    "Амулет мудреца",
  ],
};

function buildBaseStats(combo: (keyof typeof BASE)[]): ItemTemplate["baseStats"] {
  const baseStats: ItemTemplate["baseStats"] = {};
  for (const key of combo) {
    const v = BASE[key];
    baseStats[key] = v;
  }
  return baseStats;
}

function buildTemplates(): Record<string, ItemTemplate> {
  const out: Record<string, ItemTemplate> = {};
  let rarityIndex = 0;
  const rarities: Rarity[] = ["common", "rare", "epic", "legendary"];

  for (const slot of SLOTS) {
    const names = SLOT_NAMES_RU[slot];
    for (let i = 0; i < 10; i++) {
      const id = `${slot}-${i + 1}`;
      const rarity = rarities[rarityIndex % rarities.length];
      rarityIndex++;
      out[id] = {
        id,
        name: names[i],
        slot,
        rarity,
        baseStats: buildBaseStats(STAT_COMBOS[i]),
      };
    }
  }
  return out;
}

/** Все id шаблонов для пула дропа. */
const ELIXIR_TEMPLATE_SLOT: EquipmentSlot = "belt";

/**
 * Шаблоны эликсиров (расходники) — хранятся в inventory как обычные ItemInstance.
 * Slot задан заглушкой, чтобы система инвентаря не падала на типах.
 */
const ELIXIR_TEMPLATES: Record<string, ItemTemplate> = {
  "elixir-heal_flat": {
    id: "elixir-heal_flat",
    name: "Зелье здоровья",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "elixir-regen": {
    id: "elixir-regen",
    name: "Эликсир восстановления",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "elixir-power_plus_5": {
    id: "elixir-power_plus_5",
    name: "Эликсир атаки",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "elixir-armor_plus_5": {
    id: "elixir-armor_plus_5",
    name: "Эликсир брони",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "elixir-crit_plus_5": {
    id: "elixir-crit_plus_5",
    name: "Эликсир крита",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "elixir-speed_plus_5": {
    id: "elixir-speed_plus_5",
    name: "Эликсир скорости",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "elixir-health_percent_plus_15": {
    id: "elixir-health_percent_plus_15",
    name: "Эликсир здоровья",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "elixir-evasion_plus_5": {
    id: "elixir-evasion_plus_5",
    name: "Эликсир уворота",
    slot: ELIXIR_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
};

export const ITEMS_TEMPLATES: Record<string, ItemTemplate> = {
  ...buildTemplates(),
  ...ELIXIR_TEMPLATES,
};

/** Все id шаблонов для пула дропа (эликсиры исключаем). */
export const ALL_TEMPLATE_IDS: string[] = Object.keys(ITEMS_TEMPLATES).filter(
  (id) => !id.startsWith("elixir-"),
);

export function getTemplate(id: string): ItemTemplate | null {
  return ITEMS_TEMPLATES[id] ?? null;
}
