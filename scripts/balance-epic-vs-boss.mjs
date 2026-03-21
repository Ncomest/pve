/**
 * Одноразовый скрипт: оценка доли побед при «идеальном» эпическом сете
 * уровня `1 + bossLevel*3` и уровне героя = уровню босса.
 * Упрощение: только автоатака по формуле calcHit (как «Коварный удар» 1×Power),
 * босс только автоатака раз в 3.6 с. Способности с обеих сторон не моделируются.
 */
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bossesPath = join(__dirname, "../src/entities/boss/bosses.json");
const BOSSES = JSON.parse(fs.readFileSync(bossesPath, "utf8"));

const PROC_BASE = {
  hp: 30,
  power: 20,
  armor: 50,
  chanceCrit: 50,
  evasion: 25,
  speed: 50,
  spirit: 50,
  accuracy: 50,
  critDefense: 50,
  lifesteal: 50,
};

const RARITY_STRENGTH_RANGE = { epic: { min: 61, max: 80 } };

function rollStrengthPercent() {
  const { min, max } = RARITY_STRENGTH_RANGE.epic;
  return (min + Math.random() * (max - min)) / 100;
}

function scale(key) {
  return Math.max(1, Math.round((PROC_BASE[key] ?? 0) * rollStrengthPercent()));
}

function pick(a, b) {
  return Math.random() < 0.5 ? a : b;
}

/** Как `generateBaseStatsForRarity("epic")` */
function epicItemRaw() {
  const out = {};
  if (pick(0, 1) === 0) out.power = scale("power");
  else out.armor = scale("armor");
  if (pick(0, 1) === 0) out.spirit = scale("spirit");
  else out.accuracy = scale("accuracy");
  if (pick(0, 1) === 0) out.chanceCrit = scale("chanceCrit");
  else out.speed = scale("speed");
  if (pick(0, 1) === 0) out.critDefense = scale("critDefense");
  else out.evasion = scale("evasion");
  out.lifesteal = scale("lifesteal");
  out.hp = scale("hp");
  return out;
}

function getStatMultiplier(itemLevel) {
  return 1 + (itemLevel - 1) * 0.1;
}

function effectiveStats(gen, itemLevel) {
  const mult = getStatMultiplier(itemLevel);
  const result = {};
  for (const [k, v] of Object.entries(gen)) {
    result[k] = Math.round(v * mult);
  }
  return result;
}

const CRIT_POINTS_TO_FRACTION = 0.0025 / 50;
const EVASION_POINTS_TO_FRACTION = 0.0001;
const ACCURACY_POINTS_TO_FRACTION = 0.0025 / 50;
const CRIT_DEFENSE_POINTS_TO_FRACTION = 0.0025 / 50;
const LIFESTEAL_POINTS_TO_FRACTION = 0.0025 / 50;

function aggregate(partials) {
  const stats = {
    hp: 0,
    power: 0,
    armor: 0,
    chanceCrit: 0,
    evasion: 0,
    speed: 0,
    accuracy: 0,
    critDefense: 0,
    spirit: 0,
    lifesteal: 0,
  };
  let critPoints = 0;
  let evasionPoints = 0;
  let accuracyPoints = 0;
  let critDefensePoints = 0;
  let lifestealPoints = 0;

  for (const e of partials) {
    stats.hp += e.hp ?? 0;
    stats.power += e.power ?? 0;
    critPoints += e.chanceCrit ?? 0;
    evasionPoints += e.evasion ?? 0;
    stats.speed += e.speed ?? 0;
    stats.armor += e.armor ?? 0;
    accuracyPoints += e.accuracy ?? 0;
    critDefensePoints += e.critDefense ?? 0;
    stats.spirit += e.spirit ?? 0;
    lifestealPoints += e.lifesteal ?? 0;
  }
  stats.chanceCrit = Math.min(1, critPoints * CRIT_POINTS_TO_FRACTION);
  stats.evasion = Math.min(1, evasionPoints * EVASION_POINTS_TO_FRACTION);
  stats.accuracy = Math.min(1, accuracyPoints * ACCURACY_POINTS_TO_FRACTION);
  stats.critDefense = Math.min(1, critDefensePoints * CRIT_DEFENSE_POINTS_TO_FRACTION);
  stats.lifesteal = Math.min(1, lifestealPoints * LIFESTEAL_POINTS_TO_FRACTION);
  return stats;
}

const LEVEL_HP_PER_LEVEL = 20;
const LEVEL_POWER_PER_LEVEL = 2;
const PLAYER_SPEED_BASELINE = 2;

function buildPlayer(equip, level) {
  const base = {
    maxHp: 250,
    power: 20,
    chanceCrit: 0,
    evasion: 0,
    speed: 0,
    armor: 0,
    accuracy: 0,
    critDefense: 0,
    spirit: 0,
    lifesteal: 0,
  };
  const bonusHp = Math.max(0, level - 1) * LEVEL_HP_PER_LEVEL;
  const bonusPower = Math.max(0, level - 1) * LEVEL_POWER_PER_LEVEL;
  const maxHp = base.maxHp + bonusHp + equip.hp;
  return {
    hp: maxHp,
    maxHp,
    power: base.power + bonusPower + equip.power,
    chanceCrit: Math.min(1, (base.chanceCrit ?? 0) + equip.chanceCrit),
    evasion: Math.min(1, (base.evasion ?? 0) + equip.evasion),
    speed: (base.speed ?? PLAYER_SPEED_BASELINE) + equip.speed,
    armor: (base.armor ?? 0) + equip.armor,
    accuracy: Math.min(1, (base.accuracy ?? 0) + equip.accuracy),
    critDefense: Math.min(1, (base.critDefense ?? 0) + equip.critDefense),
    spirit: (base.spirit ?? 0) + equip.spirit,
    lifesteal: Math.min(1, (base.lifesteal ?? 0) + equip.lifesteal),
  };
}

function armorPointsToFraction(armor) {
  return Math.min(0.9, Math.max(0, armor * (0.01 / 50)));
}

function speedGearPointsFromTotalSpeed(totalSpeed) {
  return Math.max(0, totalSpeed - PLAYER_SPEED_BASELINE);
}

function speedPointsToFraction(points) {
  return Math.min(1, points * (0.0025 / 50));
}

const MAX_COOLDOWN_REDUCTION_FROM_SPEED = 0.7;

function cooldownFactorFromSpeed(totalSpeed) {
  const speedPoints = speedGearPointsFromTotalSpeed(totalSpeed);
  const speedFromPoints = speedPointsToFraction(speedPoints);
  const totalReduction = Math.min(MAX_COOLDOWN_REDUCTION_FROM_SPEED, speedFromPoints);
  return 1 - totalReduction;
}

function calcHit(attacker, defender) {
  const dodgeChance = Math.max(
    0,
    (defender.evasion ?? 0) - (attacker.accuracy ?? 0),
  );
  if (Math.random() < dodgeChance) {
    return { damage: 0, isDodged: true };
  }
  const critChance = Math.max(
    0,
    (attacker.chanceCrit ?? 0) - (defender.critDefense ?? 0),
  );
  const isCrit = Math.random() < critChance;
  const base = Math.floor((attacker.power ?? 0) * (0.9 + Math.random() * 0.2));
  const flatFromPower = Math.floor((attacker.power ?? 0) / 25);
  const raw = Math.round(base * (isCrit ? 1.5 : 1)) + flatFromPower;
  const reduction = armorPointsToFraction(defender.armor ?? 0);
  const damage = Math.max(1, Math.round(raw * (1 - reduction)));
  return { damage, isDodged: false };
}

/** Исход: 'player' | 'boss' | 'tie' */
function duel(player0, boss0) {
  let pHp = player0.hp;
  const player = { ...player0 };
  let bHp = boss0.hp;
  const boss = { ...boss0 };

  const gcd = Math.round(2000 * cooldownFactorFromSpeed(player.speed));
  const bossInterval = 3600;

  let nextPlayer = gcd;
  let nextBoss = bossInterval;

  while (pHp > 0 && bHp > 0) {
    const t = Math.min(nextPlayer, nextBoss);
    if (t > 600_000) return "tie";

    if (nextPlayer <= nextBoss) {
      const res = calcHit(player, boss);
      if (!res.isDodged) {
        bHp -= res.damage;
        const heal = Math.floor(res.damage * (player.lifesteal ?? 0));
        pHp = Math.min(player.maxHp, pHp + heal);
      }
      nextPlayer += gcd;
    } else {
      const res = calcHit(boss, player);
      if (!res.isDodged) pHp -= res.damage;
      nextBoss += bossInterval;
    }

    if (bHp <= 0 && pHp <= 0) return "tie";
    if (bHp <= 0) return "player";
    if (pHp <= 0) return "boss";
  }
  if (bHp <= 0 && pHp > 0) return "player";
  if (pHp <= 0 && bHp > 0) return "boss";
  return "tie";
}

const SLOTS = 10;
const RUNS = 8000;

for (const level of [1, 2, 5, 10]) {
  const itemLevel = 1 + level * 3;
  const boss = BOSSES.find((b) => b.level === level);
  if (!boss) {
    console.log(`Нет босса уровня ${level}`);
    continue;
  }
  let wins = 0;
  let ties = 0;
  for (let i = 0; i < RUNS; i++) {
    const partials = [];
    for (let s = 0; s < SLOTS; s++) {
      partials.push(effectiveStats(epicItemRaw(), itemLevel));
    }
    const equip = aggregate(partials);
    const player = buildPlayer(equip, level);
    const bossStats = { ...boss.stats };
    const out = duel(player, bossStats);
    if (out === "player") wins++;
    if (out === "tie") ties++;
  }
  console.log(
    `Уровень ${level} | босс: ${boss.name} | itemLevel=${itemLevel} | побед ${(100 * wins) / RUNS}% | ничьих ${(100 * ties) / RUNS}% (автоатака vs автоатака, без способностей)`,
  );
}
