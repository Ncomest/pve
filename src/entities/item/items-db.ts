import type { ItemTemplate, EquipmentSlot, ItemSlot } from "@/entities/item/model";

/**
 * Шаблоны предметов: id, имя, слот, редкость «по умолчанию» для типа.
 * Числовые статы экипировки с дропа/магазина задаются процедурно (`lib/itemGeneration.ts` + `createInstance.ts` → `generatedBaseStats`), не здесь.
 * См. docs/balance-items.md, docs/item-level-and-loot.md.
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

function buildTemplates(): Record<string, ItemTemplate> {
  const out: Record<string, ItemTemplate> = {};
  let rarityIndex = 0;
  const rarities: Rarity[] = ["common", "uncommon", "rare", "epic", "unique"];

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
        baseStats: {},
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
    name: "Эликсир духа",
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

const RESOURCE_TEMPLATE_SLOT: ItemSlot = "resource";

/** Крафтовые ресурсы (стек в инвентаре). */
const RESOURCE_TEMPLATES: Record<string, ItemTemplate> = {
  "resource-fire-essence": {
    id: "resource-fire-essence",
    name: "Эссенция огня",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "resource-flame-crystal": {
    id: "resource-flame-crystal",
    name: "Пламенный кристалл",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "rare",
    baseStats: {},
  },
  "resource-water-essence": {
    id: "resource-water-essence",
    name: "Эссенция воды",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "resource-aqua-pearl": {
    id: "resource-aqua-pearl",
    name: "Водная жемчужина",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "rare",
    baseStats: {},
  },
  "resource-air-essence": {
    id: "resource-air-essence",
    name: "Эссенция воздуха",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "resource-storm-feather": {
    id: "resource-storm-feather",
    name: "Грозовое перо",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "rare",
    baseStats: {},
  },
  "resource-earth-essence": {
    id: "resource-earth-essence",
    name: "Эссенция земли",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "resource-stone-shard": {
    id: "resource-stone-shard",
    name: "Каменный осколок",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "rare",
    baseStats: {},
  },
  "resource-golem-core": {
    id: "resource-golem-core",
    name: "Ядро голема",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "epic",
    baseStats: {},
  },
  "resource-ethereal-dust": {
    id: "resource-ethereal-dust",
    name: "Эфирная пыль",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "epic",
    baseStats: {},
  },
  "resource-essence-pure": {
    id: "resource-essence-pure",
    name: "Чистая эссенция",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "epic",
    baseStats: {},
  },
  "resource-dust-fire": {
    id: "resource-dust-fire",
    name: "Пыль огня",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "resource-ether-air": {
    id: "resource-ether-air",
    name: "Эфир воздуха",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
  "resource-crystal-water": {
    id: "resource-crystal-water",
    name: "Кристалл воды",
    slot: RESOURCE_TEMPLATE_SLOT,
    rarity: "common",
    baseStats: {},
  },
};

export const ITEMS_TEMPLATES: Record<string, ItemTemplate> = {
  ...buildTemplates(),
  ...ELIXIR_TEMPLATES,
  ...RESOURCE_TEMPLATES,
};

/** Пул экипировки для дропа с обычных боссов и витрины торговца. */
export const ALL_TEMPLATE_IDS: string[] = Object.keys(ITEMS_TEMPLATES).filter(
  (id) => !id.startsWith("elixir-") && !id.startsWith("resource-"),
);

/** Пул ресурсов для дропа с боссов-ресурсов. */
export const RESOURCE_TEMPLATE_IDS: string[] = Object.keys(RESOURCE_TEMPLATES);

export function getTemplate(id: string): ItemTemplate | null {
  return ITEMS_TEMPLATES[id] ?? null;
}
