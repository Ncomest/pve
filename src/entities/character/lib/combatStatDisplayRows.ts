import type { Stats } from "@/entities/boss/model";
import type { ElixirDefinition } from "@/features/elixirs/model/elixirs";
import type {
  EquipmentBonuses,
  EquipmentRawPoints,
} from "@/entities/character/lib/playerStatAggregation";
import {
  LEVEL_HP_PER_LEVEL,
  LEVEL_POWER_PER_LEVEL,
  applyElixirArmorPercentToArmorPoints,
  applyElixirSpeedPercentToSpeedTotal,
  playerSpeedBaseline,
  speedGearPointsFromTotalSpeedStat,
} from "@/entities/character/lib/playerStatAggregation";
import {
  ACCURACY_POINTS_TO_FRACTION,
  CRIT_DEFENSE_POINTS_TO_FRACTION,
  CRIT_POINTS_TO_FRACTION,
  EVASION_POINTS_TO_FRACTION,
  LIFESTEAL_POINTS_TO_FRACTION,
  accuracyPointsToFraction,
  armorPointsToFraction,
  critDefensePointsToFraction,
  lifestealPointsToFraction,
  speedPointsToFraction,
} from "@/entities/item/lib/statPoints";
// import { hpPerTickFromSpirit } from "@/features/character/model/usePlayerHp";

// const REGEN_TICK_SEC = 10;

/** Строки таблицы характеристик (герой / экран боя). */
export type StatRow =
  | {
      kind: "percent";
      label: string;
      gearPoints: number;
      pct: string;
    }
  | {
      kind: "pair";
      label: string;
      fromGear: number;
      total: number;
    }
  | {
      kind: "spirit";
      label: string;
      gearPoints: number;
      hpPerSec: string;
    };

/** Итоговая доля 0..1 → строка вида «1%» / «0,25%». */
export function fmtPctFromFraction(fraction: number): string {
  const p = Math.min(1, Math.max(0, fraction)) * 100;
  const rounded = Math.round(p * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}%`;
  return `${rounded.toFixed(2)}%`;
}

/** Эквивалент «очков» для отображения у босса (в JSON заданы доли). */
function fractionToPseudoPoints(
  fraction: number,
  pointsPerFraction: number,
): number {
  if (fraction <= 0) return 0;
  return Math.round(fraction / pointsPerFraction);
}

export interface BuildHeroStatRowsArgs {
  base: Stats;
  level: number;
  equipment: EquipmentBonuses;
  raw: EquipmentRawPoints;
  elixirDef: ElixirDefinition | null;
  healthPercentBonusHp: number;
  // spiritElixirBonus: number;
}

/** Переопределения для боя: итоговые значения с баффами способностей и т.п. */
export interface HeroBattleStatOverrides {
  attackTotal?: number;
  maxHpTotal?: number;
  critFraction?: number;
  evasionFraction?: number;
  speedStatTotal?: number;
  armorPoints?: number;
  accuracyFraction?: number;
  critDefenseFraction?: number;
  lifestealFraction?: number;
  spiritPointsTotal?: number;
}

export function buildHeroStatRows(
  args: BuildHeroStatRowsArgs,
  battle?: HeroBattleStatOverrides,
): StatRow[] {
  const {
    base,
    level,
    equipment: eq,
    raw,
    elixirDef,
    healthPercentBonusHp,
    // spiritElixirBonus,
  } = args;

  const hpBonusFromLevel = Math.max(0, level - 1) * LEVEL_HP_PER_LEVEL;
  const hpBonusTotal = hpBonusFromLevel + eq.hp + healthPercentBonusHp;
  const maxHpDefault = base.maxHp + hpBonusTotal;

  const levelPowerBonus = Math.max(0, level - 1) * LEVEL_POWER_PER_LEVEL;

  const elixirPowerDelta =
    elixirDef?.kind === "power" ? (elixirDef.powerDelta ?? 0) : 0;
  const elixirCritPercentBonus =
    elixirDef?.kind === "crit_percent" ? (elixirDef.critPercentBonus ?? 0) : 0;
  const elixirSpeedPercentBonus =
    elixirDef?.kind === "speed_percent"
      ? (elixirDef.speedPercentBonus ?? 0)
      : 0;
  const elixirEvasionPercentBonus =
    elixirDef?.kind === "evasion_percent"
      ? (elixirDef.evasionPercentBonus ?? 0)
      : 0;
  const elixirArmorPercentBonus =
    elixirDef?.kind === "armor_percent"
      ? (elixirDef.armorPercentBonus ?? 0)
      : 0;

  const equipPower = eq.power ?? 0;
  const equipCrit = eq.chanceCrit ?? 0;
  const equipSpeed = eq.speed ?? 0;
  const equipEvasion = eq.evasion ?? 0;
  const equipArmor = eq.armor ?? 0;

  const critBeforeElixir = (base.chanceCrit ?? 0) + equipCrit;
  const critAfterElixir = Math.min(
    1,
    critBeforeElixir + elixirCritPercentBonus,
  );

  const evasionBeforeElixir = (base.evasion ?? 0) + equipEvasion;
  const evasionAfterElixir = Math.min(
    1,
    evasionBeforeElixir + elixirEvasionPercentBonus,
  );

  const baselineSpeed = playerSpeedBaseline();
  const speedTotalBeforeElixir = (base.speed ?? baselineSpeed) + equipSpeed;
  const speedTotalAfterElixir = applyElixirSpeedPercentToSpeedTotal(
    speedTotalBeforeElixir,
    elixirSpeedPercentBonus,
  );
  const speedFractionDefault = speedPointsToFraction(
    speedGearPointsFromTotalSpeedStat(speedTotalAfterElixir),
  );

  const armorBeforePoints = (base.armor ?? 0) + equipArmor;
  const armorAfterPoints = applyElixirArmorPercentToArmorPoints(
    armorBeforePoints,
    elixirArmorPercentBonus,
  );
  const armorFractionDefault = armorPointsToFraction(armorAfterPoints);

  const accuracyDefault = Math.min(
    1,
    (base.accuracy ?? 0) + accuracyPointsToFraction(raw.accuracy),
  );
  const critDefDefault = Math.min(
    1,
    (base.critDefense ?? 0) + critDefensePointsToFraction(raw.critDefense),
  );
  const lifestealDefault = Math.min(
    1,
    (base.lifesteal ?? 0) + lifestealPointsToFraction(raw.lifesteal),
  );

  // const gearSpirit = raw.spirit;
  // const totalSpiritDefault =
  //   (base.spirit ?? 0) + gearSpirit + spiritElixirBonus;

  const attackTotal =
    battle?.attackTotal ??
    base.power + levelPowerBonus + equipPower + elixirPowerDelta;
  const maxHpTotal = battle?.maxHpTotal ?? maxHpDefault;
  const critFraction = battle?.critFraction ?? critAfterElixir;
  const evasionFraction = battle?.evasionFraction ?? evasionAfterElixir;
  const speedFraction =
    battle?.speedStatTotal != null
      ? speedPointsToFraction(
          speedGearPointsFromTotalSpeedStat(battle.speedStatTotal),
        )
      : speedFractionDefault;
  const armorFraction =
    battle?.armorPoints != null
      ? armorPointsToFraction(battle.armorPoints)
      : armorFractionDefault;
  const accuracyFraction = battle?.accuracyFraction ?? accuracyDefault;
  const critDefenseFraction = battle?.critDefenseFraction ?? critDefDefault;
  const lifestealFraction = battle?.lifestealFraction ?? lifestealDefault;
  // const totalSpiritPoints = battle?.spiritPointsTotal ?? totalSpiritDefault;

  // const hpPerTick = hpPerTickFromSpirit(totalSpiritPoints);
  // const hpPerSec = hpPerTick / REGEN_TICK_SEC;
  // const hpPerSecStr = `${hpPerSec.toLocaleString(undefined, {
  //   maximumFractionDigits: 2,
  //   minimumFractionDigits: 0,
  // })} HP/с`;

  return [
    {
      kind: "pair",
      label: "Атака",
      fromGear: equipPower,
      total: attackTotal,
    },
    {
      kind: "percent",
      label: "Меткость",
      gearPoints: Math.round(raw.accuracy),
      pct: fmtPctFromFraction(accuracyFraction),
    },
    {
      kind: "percent",
      label: "Крит",
      gearPoints: Math.round(raw.crit),
      pct: fmtPctFromFraction(critFraction),
    },
    {
      kind: "percent",
      label: "Скорость",
      gearPoints: Math.round(raw.speed),
      pct: fmtPctFromFraction(speedFraction),
    },
    {
      kind: "pair",
      label: "Здоровье",
      fromGear: eq.hp,
      total: maxHpTotal,
    },
    {
      kind: "percent",
      label: "Броня",
      gearPoints: Math.round(raw.armor),
      pct: fmtPctFromFraction(armorFraction),
    },
    {
      kind: "percent",
      label: "Уклонение",
      gearPoints: Math.round(raw.evasion),
      pct: fmtPctFromFraction(evasionFraction),
    },
    {
      kind: "percent",
      label: "Защита от крита",
      gearPoints: Math.round(raw.critDefense),
      pct: fmtPctFromFraction(critDefenseFraction),
    },
    // {
    //   kind: "spirit",
    //   label: "Дух",
    //   gearPoints: Math.round(gearSpirit),
    //   hpPerSec: hpPerSecStr,
    // },
    {
      kind: "percent",
      label: "Самоисцеление",
      gearPoints: Math.round(raw.lifesteal),
      pct: fmtPctFromFraction(lifestealFraction),
    },
  ];
}

/**
 * Босс: первая колонка — «база» из шаблона (для %-статов — эквивалент очков),
 * вторая — текущее значение в бою.
 */
export function buildBossStatRows(
  templateStats: Stats,
  currentStats: Stats,
  effectiveArmorPoints: number,
): StatRow[] {
  const t = templateStats;
  const c = currentStats;

  const baseline = playerSpeedBaseline();
  const tplSpeed = t.speed ?? baseline;
  const curSpeed = c.speed ?? baseline;

  // const hpPerTick = hpPerTickFromSpirit(c.spirit ?? 0);
  // const hpPerSecStr = `${(hpPerTick / REGEN_TICK_SEC).toLocaleString(
  //   undefined,
  //   {
  //     maximumFractionDigits: 2,
  //     minimumFractionDigits: 0,
  //   },
  // )} HP/с`;

  return [
    {
      kind: "pair",
      label: "Атака",
      fromGear: t.power,
      total: c.power,
    },
    {
      kind: "pair",
      label: "Здоровье",
      fromGear: t.maxHp,
      total: c.maxHp,
    },
    {
      kind: "percent",
      label: "Скорость",
      gearPoints: Math.round(speedGearPointsFromTotalSpeedStat(tplSpeed)),
      pct: fmtPctFromFraction(
        speedPointsToFraction(speedGearPointsFromTotalSpeedStat(curSpeed)),
      ),
    },
    {
      kind: "percent",
      label: "Крит",
      gearPoints: fractionToPseudoPoints(
        t.chanceCrit ?? 0,
        CRIT_POINTS_TO_FRACTION,
      ),
      pct: fmtPctFromFraction(c.chanceCrit ?? 0),
    },
    {
      kind: "percent",
      label: "Броня",
      gearPoints: Math.round(t.armor ?? 0),
      pct: fmtPctFromFraction(armorPointsToFraction(effectiveArmorPoints)),
    },
    {
      kind: "percent",
      label: "Уклонение",
      gearPoints: fractionToPseudoPoints(
        t.evasion ?? 0,
        EVASION_POINTS_TO_FRACTION,
      ),
      pct: fmtPctFromFraction(c.evasion ?? 0),
    },
    {
      kind: "percent",
      label: "Меткость",
      gearPoints: fractionToPseudoPoints(
        t.accuracy ?? 0,
        ACCURACY_POINTS_TO_FRACTION,
      ),
      pct: fmtPctFromFraction(c.accuracy ?? 0),
    },
    {
      kind: "percent",
      label: "Защита от крита",
      gearPoints: fractionToPseudoPoints(
        t.critDefense ?? 0,
        CRIT_DEFENSE_POINTS_TO_FRACTION,
      ),
      pct: fmtPctFromFraction(c.critDefense ?? 0),
    },
    // {
    //   kind: "spirit",
    //   label: "Дух",
    //   gearPoints: Math.round(t.spirit ?? 0),
    //   hpPerSec: hpPerSecStr,
    // },
    {
      kind: "percent",
      label: "Самоисцеление",
      gearPoints: fractionToPseudoPoints(
        t.lifesteal ?? 0,
        LIFESTEAL_POINTS_TO_FRACTION,
      ),
      pct: fmtPctFromFraction(c.lifesteal ?? 0),
    },
  ];
}
