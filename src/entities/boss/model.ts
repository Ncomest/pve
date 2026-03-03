export type BossRarity = "common" | "rare" | "epic";

export interface Stats {
  hp: number;
  maxHp: number;
  power: number;
  chanceCrit: number;
  evasion: number;
  speed: number; // скорость атаки (1–5; влияет на интервал авто-атаки)
  armor: number; // броня (снижает входящий урон на N единиц, минимум 1)
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

export type BossAbilityCategory =
  | "interruptible"
  | "uninterruptible"
  | "dot"
  | "persistent_debuff"
  | "self_buff";

export type BossDefensiveTag = "full-dodge" | "block" | "heavy-mitigation" | "ice-wall";

export interface BossAbility {
  id: string;
  name: string;
  type: "damage" | "heal" | "buff";
  icon?: string;
  cooldownMs: number;
  castTimeMs: number;
  category: BossAbilityCategory;
  canBeInterrupted: boolean;
  interruptWindowMs?: number;
  requiredDefensiveTag?: BossDefensiveTag;

  // DoT / дебаффы на герое
  dotDurationMs?: number;
  dotTickIntervalMs?: number;
  dotDamagePerTick?: number;
  debuffRequiresCleanse?: boolean;
  debuffType?: "poison" | "curse" | "burn" | "ground" | "other";

  // Бафы на боссе
  selfBuffType?: "damage" | "evasion" | "armor" | "thorns" | "lifesteal";
  selfBuffValue?: number;
  selfBuffDurationMs?: number;
  dispellable?: boolean;

  // Параметры урона/лечения
  baseDamageX?: number;
  value?: number;

  /** Описание для тултипов и лога боя */
  description?: string;
}

export interface BossAbilityConfig {
  /** Задержка перед тем, как босс начнёт использовать активные способности, мс */
  startDelayMs: number;
  /** Минимальный интервал между применениями любых двух способностей, мс */
  minAbilityIntervalMs: number;
  /** Запретить повтор одного и того же id подряд */
  preventConsecutiveRepeat?: boolean;
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
  /** Активные способности босса (кастуемые) */
  bossAbilities?: BossAbility[];
  /** Настройки таймингов и очереди способностей босса */
  abilityConfig?: BossAbilityConfig;
}

export type ItemRarity = "common" | "rare" | "epic";
export type ItemSlot =
  | "weapon"
  | "helmet"
  | "chest"
  | "pants"
  | "boots"
  | "belt"
  | "ring"
  | "necklace";

export interface LootItem {
  id: string;
  name: string;
  icon: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  description: string;
  stats: Partial<Record<"armor" | "power" | "chanceCrit" | "evasion" | "maxHp" | "speed", number>>;
}
