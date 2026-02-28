export type AbilityType = "damage" | "heal" | "buff";

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
  /** Снижение брони цели от дебаффа */
  armorDebuff?: number;
  /** Длительность дебаффа брони, мс */
  armorDebuffDurationMs?: number;
}

