export type BossRarity = "common" | "rare" | "epic";

export interface Stats {
  hp: number;
  maxHp: number;
  power: number;
  chanceCrit: number;
  evasion: number;
  speed: number;   // скорость атаки (1–5; влияет на интервал авто-атаки)
  armor: number;   // броня (снижает входящий урон на N единиц, минимум 1)
}

export interface Buff {
  id: string;
  name: string;
  icon: string; // символ/emoji или короткое обозначение для ячейки
  description?: string;
}

export interface Debuff {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface Boss {
  id: string;
  name: string;
  image?: string;
  level: number;
  rarity: BossRarity;
  xpReward: number;
  loot: string[];
  stats: Stats;
  buffs?: Buff[];
  debuffs?: Debuff[];
}

export type ItemRarity = "common" | "rare" | "epic";
export type ItemSlot = "weapon" | "helmet" | "chest" | "pants" | "boots" | "belt" | "ring" | "necklace";

export interface LootItem {
  id: string;
  name: string;
  icon: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  description: string;
  stats: Partial<Record<"armor" | "power" | "chanceCrit" | "evasion" | "maxHp" | "speed", number>>;
}
