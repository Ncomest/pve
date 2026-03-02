/**
 * Активный эффект в бою (бафф или дебафф) с оставшимся временем действия.
 */
export interface ActiveEffect {
  id: string;
  name: string;
  /** Имя SVG-компонента из @/shared/ui/icons или текстовый символ */
  icon: string;
  description?: string;
  /** Оставшееся время действия в секундах (обновляется реактивно) */
  durationSeconds: number;
  /** Метка окончания эффекта (Date.now() + durationMs) для тикера */
  endTime?: number;
  /** Количество стаков (отображается числом под иконкой) */
  stacks?: number;
}

/** Типы эффектов способностей (для композиции способности из списка эффектов). */
export type EffectKind =
  | "damage"
  | "heal"
  | "dot"
  | "gain_combo"
  | "spend_combo"
  | "self_buff_crit"
  | "self_buff_evasion"
  | "self_buff_power"
  | "enemy_debuff_armor"
  | "enemy_debuff_armor_percent"
  | "eviscerate_stacks"
  | "cunning_buff"
  | "dodge_next"
  | "block_specials"
  | "damage_reduction"
  | "interrupt"
  | "movement_speed";

/** Эффект способности: один из атомарных эффектов с параметрами. */
export type AbilityEffect =
  | {
      kind: "damage";
      baseDamageX?: number;
      value?: number;
      /** Бонус урона за стак Потрошение (0.15 = 15%); применяется при финишере */
      eviscerateStackBonusPercent?: number;
    }
  | { kind: "heal"; value: number }
  | {
      kind: "dot";
      instantDamageRatio?: number;
      durationMs: number;
      tickIntervalMs: number;
      tickDamageMultiplier?: number;
      damagePerTick?: number;
      procChance?: number;
      procBuffId?: string;
      procBuffDurationMs?: number;
    }
  | { kind: "gain_combo"; amount: number }
  | { kind: "spend_combo"; costMin: number; costMax: number }
  | { kind: "self_buff_crit"; percent: number; durationMs: number }
  | { kind: "self_buff_evasion"; percent: number; durationMs: number }
  | { kind: "self_buff_power"; value: number; durationMs: number }
  | { kind: "enemy_debuff_armor"; value: number; durationMs: number }
  | { kind: "enemy_debuff_armor_percent"; percent: number; durationMs: number }
  | {
      kind: "eviscerate_stacks";
      gain: number;
      stackBonusPercent: number;
      maxStacks: number;
    }
  | { kind: "cunning_buff"; durationMs: number }
  | { kind: "dodge_next"; expireMs: number }
  | { kind: "block_specials"; durationMs: number }
  | { kind: "damage_reduction"; percent: number; durationMs: number }
  | { kind: "interrupt" }
  | { kind: "movement_speed"; percent: number; durationMs: number };
