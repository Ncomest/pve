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
  accuracy?: number;
  armor?: number;
}

export interface Item {
  id: string;
  name: string;
  slot: EquipmentSlot;
  stats: ItemStats;
  rarity: "common" | "rare" | "epic" | "legendary";
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
