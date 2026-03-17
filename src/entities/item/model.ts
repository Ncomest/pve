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

export interface ItemStats {
  hp?: number;
  power?: number;
  chanceCrit?: number;
  evasion?: number;
  speed?: number;
  armor?: number;
}

/** Шаблон вещи: слот, название, редкость, базовые статы (обычно 3 характеристики). */
export interface ItemTemplate {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: "common" | "rare" | "epic" | "legendary";
  baseStats: ItemStats;
}

/** Экземпляр вещи в инвентаре/экипировке: ссылка на шаблон + уровень вещи. */
export interface ItemInstance {
  instanceId: string;
  templateId: string;
  itemLevel: number;
  /**
   * Индивидуальные роллы статов для конкретного экземпляра вещи.
   * Хранятся как множители (например, 0.8–1.2), которые применяются к baseStats * level.
   */
  rolls?: ItemStats;
}

/** Отображаемый вид вещи (для UI): id = instanceId, stats уже эффективные. */
export interface Item {
  id: string;
  name: string;
  slot: EquipmentSlot;
  stats: ItemStats;
  rarity: "common" | "rare" | "epic" | "legendary";
  /** Уровень вещи (для отображения в UI). */
  itemLevel?: number;
}

export const SLOT_NAMES: Record<EquipmentSlot, string> = {
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
};

export { getStatMultiplier, getEffectiveStats, getDisplayItem } from "./lib/itemLevel";
