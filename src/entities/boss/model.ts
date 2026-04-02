export type BossRarity = "common" | "rare" | "epic";

export interface Stats {
  hp: number;
  maxHp: number;
  power: number;
  chanceCrit: number;
  evasion: number;
  /** Скорость героя (GCD); у боссов не задаётся */
  speed?: number;
  armor: number; // броня (очки; снижение урона через формулу)
  /** Меткость 0..1: снижает эффективное уклонение цели */
  accuracy?: number;
  /** Защита от крита 0..1: снижает шанс крита по цели */
  critDefense?: number;
  /** Очки духа (герой): пассивный реген вне боя */
  spirit?: number;
  /** Самоисцеление 0..1: доля урона по боссу → лечение героя */
  lifesteal?: number;
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
  | "self_buff"
  | "cleansable-debuff"
  | "dispellable-buff";

export type BossDefensiveTag = "block";

export interface BossAbility {
  id: string;
  name: string;
  type:
    | "damage"
    | "heal"
    | "buff"
    | "debuff-dot"
    | "heal-hot"
    | "absord"
    | "debuff";
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
  debuffType?: "poison" | "curse" | "burn" | "ground" | "bleed";

  // Бафы на боссе
  selfBuffType?: "damage" | "evasion" | "armor" | "thorns" | "lifesteal";
  selfBuffValue?: number;
  selfBuffDurationMs?: number;
  buffRequiresDispellable?: boolean;

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
  stats: Stats;
  buffs?: Buff[];
  debuffs?: Debuff[];
  /** Активные способности босса (кастуемые) */
  bossAbilities?: BossAbility[];
  /** Настройки таймингов и очереди способностей босса */
  abilityConfig?: BossAbilityConfig;
}
