export type ElixirKind =
  | "heal_flat" // +200 HP
  | "regen_elixir" // усиление регена вне боя
  | "power" // +5 к атаке
  | "armor_percent" // +5% к броне
  | "crit_percent" // +5% к криту
  | "speed_percent" // +5% к скорости
  | "health_percent" // +15% к текущему HP (увеличивает maxHp)
  | "evasion_percent"; // +5% к уклонению

export interface ElixirDefinition {
  /** Id совпадает с templateId для ItemInstance. */
  id: string;
  name: string;
  kind: ElixirKind;
  /** Цена у торговца (заглушка на MVP). */
  price: number;
  /** Для бафа и отображения в UI. */
  icon: string;
  /** Длительность бафа. */
  durationMs: number;
  /** Дельта для статов (для kind != regen_elixir и != heal_flat может быть undefined). */
  powerDelta?: number;
  armorPercentBonus?: number;
  critPercentBonus?: number;
  speedPercentBonus?: number;
  evasionPercentBonus?: number;
  regenExtraPerTick?: number; // +N HP за каждый тик 10с (база = 1/10с)
}

export const ELIXIR_DURATION_MS = 5 * 60_000;

/** Заглушки: все иконки пока один и тот же “зелья восстановления здоровья”. */
export const ELIXIRS: ElixirDefinition[] = [
  {
    id: "elixir-heal_flat",
    name: "Зелье здоровья",
    kind: "heal_flat",
    price: 250,
    icon: "/images/elixir/elixir_4.png",
    durationMs: ELIXIR_DURATION_MS,
    powerDelta: undefined,
  },
  {
    id: "elixir-regen",
    name: "Эликсир восстановления",
    kind: "regen_elixir",
    price: 200,
    icon: "/images/elixir/elixir_5.png",
    durationMs: ELIXIR_DURATION_MS,
    regenExtraPerTick: 3, // 1 -> 4 HP / 10s
  },
  {
    id: "elixir-power_plus_5",
    name: "Эликсир атаки",
    kind: "power",
    price: 200,
    icon: "/images/elixir/elixir_1.png",
    durationMs: ELIXIR_DURATION_MS,
    powerDelta: 5,
  },
  {
    id: "elixir-armor_plus_5",
    name: "Эликсир брони",
    kind: "armor_percent",
    price: 200,
    icon: "/images/elixir/elixir_2.png",
    durationMs: ELIXIR_DURATION_MS,
    armorPercentBonus: 0.05,
  },
  {
    id: "elixir-crit_plus_5",
    name: "Эликсир крита",
    kind: "crit_percent",
    price: 200,
    icon: "/images/elixir/elixir_3.png",
    durationMs: ELIXIR_DURATION_MS,
    critPercentBonus: 0.05,
  },
  {
    id: "elixir-speed_plus_5",
    name: "Эликсир скорости",
    kind: "speed_percent",
    price: 200,
    icon: "/images/elixir/elixir_6.png",
    durationMs: ELIXIR_DURATION_MS,
    speedPercentBonus: 0.05,
  },
  {
    id: "elixir-health_percent_plus_15",
    name: "Эликсир здоровья",
    kind: "health_percent",
    price: 200,
    icon: "/images/elixir/elixir_8.png",
    durationMs: ELIXIR_DURATION_MS,
  },
  {
    id: "elixir-evasion_plus_5",
    name: "Эликсир уворота",
    kind: "evasion_percent",
    price: 200,
    icon: "/images/elixir/elixir_7.png",
    durationMs: ELIXIR_DURATION_MS,
    evasionPercentBonus: 0.05,
  },
];

export const ELIXIR_BY_ID: Record<string, ElixirDefinition> =
  Object.fromEntries(ELIXIRS.map((e) => [e.id, e])) as Record<
    string,
    ElixirDefinition
  >;

export function getElixirDefinition(id: string): ElixirDefinition | null {
  return ELIXIR_BY_ID[id] ?? null;
}
