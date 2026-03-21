import type { Stats } from "@/entities/boss/model";

/**
 * Масштабирует статы босса-ресурса от эталона в JSON к уровню героя.
 * База в JSON соответствует полю level в записи босса (например 3).
 * Линейно: HP, maxHp, power, armor; доли (уклонение, крит, меткость, защита от крита) — с мягким ростом.
 */
export function scaleResourceBossStats(
  base: Stats,
  baseLevelFromJson: number,
  heroLevel: number,
): Stats {
  const safeBase = Math.max(1, baseLevelFromJson);
  const lvl = Math.max(1, heroLevel);
  const linear = lvl / safeBase;

  const scaledHp = Math.max(1, Math.round(base.maxHp * linear));
  const scaledPower = Math.max(1, Math.round(base.power * linear));
  const scaledArmor = Math.max(0, Math.round((base.armor ?? 0) * linear));

  const fracBoost = Math.min(1.35, 0.85 + (lvl - safeBase) * 0.012);
  const evasion = Math.min(
    0.55,
    Math.max(0, (base.evasion ?? 0) * fracBoost),
  );
  const chanceCrit = Math.min(
    0.45,
    Math.max(0, (base.chanceCrit ?? 0) * fracBoost),
  );
  const accuracy = Math.min(
    0.25,
    Math.max(0, (base.accuracy ?? 0) * fracBoost),
  );
  const critDefense = Math.min(
    0.35,
    Math.max(0, (base.critDefense ?? 0) * fracBoost),
  );

  return {
    ...base,
    maxHp: scaledHp,
    hp: scaledHp,
    power: scaledPower,
    armor: scaledArmor,
    evasion,
    chanceCrit,
    accuracy,
    critDefense,
    speed: base.speed,
    spirit: base.spirit,
    lifesteal: base.lifesteal,
  };
}
