export type EquipmentSlot =
  | "helmet"
  | "chest"
  | "earring"
  | "ring"
  | "weapon"
  | "shield"
  | "belt"
  | "pants"
  | "boots"
  | "necklace";

/** Слот предмета: экипировка или ресурс (крафт). */
export type ItemSlot = EquipmentSlot | "resource";

/** Пять редкостей: белая / зелёная / синяя / фиолетовая / жёлтая */
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "unique";

export interface ItemStats {
  hp?: number;
  power?: number;
  chanceCrit?: number;
  evasion?: number;
  speed?: number;
  armor?: number;
  /** Очки, как крит/уклонение */
  accuracy?: number;
  critDefense?: number;
  /** Очки самоисцеления, как крит */
  lifesteal?: number;
}

/** Шаблон вещи: слот, название, редкость, базовые статы (обычно 3 характеристики). */
export interface ItemTemplate {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  baseStats: ItemStats;
}

/** Экземпляр вещи в инвентаре/экипировке: ссылка на шаблон + уровень вещи. */
export interface ItemInstance {
  instanceId: string;
  templateId: string;
  itemLevel: number;
  /**
   * Количество предметов в стеке (для расходников/эликсиров).
   * Для экипировки может оставаться `undefined` (в логике считается как 1).
   */
  count?: number;
  /**
   * Индивидуальные роллы статов для конкретного экземпляра вещи.
   * Хранятся как множители (например, 0.8–1.2), которые применяются к baseStats * level.
   */
  rolls?: ItemStats;
  /** Редкость с дропа/магазина (процедурная генерация перекрывает шаблон). */
  rarityOverride?: ItemRarity;
  /** Если задано — базовые статы с дропа вместо template.baseStats. */
  generatedBaseStats?: ItemStats;
}

/** Отображаемый вид вещи (для UI): id = instanceId, stats уже эффективные. */
export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  stats: ItemStats;
  rarity: ItemRarity;
  /** Уровень вещи (для отображения в UI). */
  itemLevel?: number;
}

export const SLOT_NAMES: Record<ItemSlot, string> = {
  helmet: "Шлем",
  chest: "Грудь",
  earring: "Серьга",
  ring: "Кольцо",
  weapon: "Оружие",
  shield: "Щит",
  belt: "Пояс",
  pants: "Штаны",
  boots: "Ботинки",
  necklace: "Шея",
  resource: "Ресурс",
};

export { getStatMultiplier, getEffectiveStats, getDisplayItem } from "./lib/itemLevel";
