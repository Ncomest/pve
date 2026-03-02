import type { AbilityEffect } from "@/shared/lib/effects/types";

export type AbilityType = "damage" | "heal" | "buff";

/** Роль способности в системе комбо (класс «Клинок и Яд» и др.) */
export type AbilityRole =
  | "generator"
  | "finisher"
  | "defense"
  | "control"
  | "mobility";

export interface Ability {
  id: string;
  name: string;
  type: AbilityType;
  value: number;
  cooldownMs: number;
  durationMs?: number;
  /** Имя компонента SVG-иконки из @/shared/ui/icons */
  icon?: string;
  /** Урон от кровотечения за тик (и за начальный удар, если тип damage) */
  bleedDamage?: number;
  /** Длительность кровотечения, мс */
  bleedDurationMs?: number;
  /** Интервал тиков кровотечения, мс */
  bleedTickIntervalMs?: number;
  /** Снижение брони цели от дебаффа (абсолютное значение) */
  armorDebuff?: number;
  /** Длительность дебаффа брони, мс */
  armorDebuffDurationMs?: number;

  // --- Класс «Клинок и Яд» и расширяемая система комбо ---

  /** Роль способности: генератор комбо, финишер, защита, контроль, мобильность */
  role?: AbilityRole;
  /** Идентификатор класса (например "blade-and-poison") для фильтрации */
  classId?: string;

  /** Базовый множитель урона X в формулах X*Power, X*Power*N (настраивается балансом) */
  baseDamageX?: number;
  /** Даёт комбо-поинты (генераторы) */
  comboGain?: number;
  /** Требует минимум комбо-поинтов (финишеры) */
  comboCostMin?: number;
  /** Требует максимум комбо-поинтов (финишеры); урон масштабируется с N */
  comboCostMax?: number;

  /** Дебафф: снижение брони цели в процентах (0.3 = 30%) */
  armorDebuffPercent?: number;

  /** Самобафф: повышение шанса крита в процентах (0.1 = +10%) */
  selfBuffCritPercent?: number;
  /** Длительность баффа крита, мс */
  selfBuffCritDurationMs?: number;
  /** Даёт стаки усиления «Потрошение» (за стак +15% урона следующего Потрошения, макс 4) */
  eviscerateStacksGain?: number;
  /** Бонус урона Потрошения за стак (0.15 = 15%) */
  eviscerateStackBonusPercent?: number;
  /** Максимум стаков «Потрошение» */
  eviscerateMaxStacks?: number;

  /** DoT: длительность отравления/кровотечения, мс */
  dotDurationMs?: number;
  /** DoT: интервал тиков, мс */
  dotTickIntervalMs?: number;
  /** DoT: множитель урона за тик относительно X (например 0.3 для (X*0.3)*Power*N) */
  dotTickDamageMultiplier?: number;
  /** DoT: шанс срабатывания эффекта за тик (0.15 = 15%) */
  dotProcChance?: number;
  /** DoT: id баффа при срабатывании (например "cunning" — следующий Коварный удар +100% урона) */
  dotProcBuffId?: string;
  /** Длительность баффа при проке DoT, мс */
  dotProcBuffDurationMs?: number;
  /** Мгновенный урон финишера с DoT как доля от X*Power (0.5 = половина) */
  dotInstantDamageRatio?: number;

  /** Защита: повышение уклонения в процентах (0.3 = +30%) */
  defenseEvasionPercent?: number;
  /** Длительность баффа уклонения, мс */
  defenseEvasionDurationMs?: number;
  /** Защита: 100% уклонение от следующей атаки */
  defenseDodgeNext?: boolean;
  /** Время жизни эффекта «следующая атака промах» (мс), после чего сгорает */
  defenseDodgeExpireMs?: number;
  /** Защита: блок только особых атак босса */
  defenseBlockSpecials?: boolean;
  /** Защита: снижение получаемого урона в процентах (0.2 = 20%) */
  defenseDamageReductionPercent?: number;
  /** Длительность снижения урона, мс */
  defenseDamageReductionDurationMs?: number;

  /** Мобильность: повышение скорости передвижения в процентах (0.15 = 15%) */
  movementSpeedPercent?: number;
  /** Длительность баффа скорости, мс */
  movementSpeedDurationMs?: number;

  /** Контроль: прерывает применение способности цели */
  interrupt?: boolean;

  /** Список эффектов для композиционной модели (если задан — в handleAbility вызывается applyEffects) */
  effects?: AbilityEffect[];

  /** Шанс крита способности (0..1); складывается с общим шансом крита персонажа. Только для атакующих способностей. */
  chanceCrit?: number;
  /** Сила критического удара: множитель урона при крите (1.5 = 150%; при обычном 10 урона крит даёт 15). По умолчанию 1.5. */
  critMultiplier?: number;
}

