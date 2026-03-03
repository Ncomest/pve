import type { Ability } from "./types";

/** Базовый множитель урона X для формул класса «Клинок и Яд» (настраивается балансом) */
const X = 1.0;

const CLASS_ID = "blade-and-poison";

/**
 * Способности класса «Клинок и Яд».
 * Генераторы дают комбо-поинты, финишеры тратят их. Формулы: X * Power, X * Power * N.
 */
export const BLADE_AND_POISON_ABILITIES: Ability[] = [
  // --- Генераторы комбо-поинтов ---
  {
    id: "cunning-strike",
    name: "Коварный удар",
    type: "damage",
    value: 0,
    cooldownMs: 0,
    icon: "/images/hero/ability/sinister_strike.png",
    role: "generator",
    classId: CLASS_ID,
    baseDamageX: X,
    comboGain: 1,
    effects: [
      { kind: "damage", baseDamageX: X },
      { kind: "gain_combo", amount: 1 },
    ],
  },
  {
    id: "fierce-strike",
    name: "Свирепый удар",
    type: "damage",
    value: 0,
    cooldownMs: 35_000,
    icon: "/images/hero/ability/backstab.png",
    role: "generator",
    classId: CLASS_ID,
    baseDamageX: X,
    comboGain: 4,
    armorDebuffPercent: 0.3,
    armorDebuffDurationMs: 7_000,
  },
  {
    id: "sweeping-strike",
    name: "Размашистый удар",
    type: "damage",
    value: 0,
    cooldownMs: 6_000,
    icon: "/images/hero/ability/shortblade.png",
    role: "generator",
    classId: CLASS_ID,
    baseDamageX: X,
    comboGain: 2,
    selfBuffCritPercent: 0.1,
    selfBuffCritDurationMs: 3_000,
    eviscerateStacksGain: 1,
    eviscerateStackBonusPercent: 0.15,
    eviscerateMaxStacks: 4,
  },

  // --- Финишеры ---
  {
    id: "eviscerate",
    name: "Потрошение",
    type: "damage",
    value: 0,
    cooldownMs: 0,
    icon: "/images/hero/ability/eviscerate.png",
    role: "finisher",
    classId: CLASS_ID,
    baseDamageX: X,
    comboCostMin: 2,
    comboCostMax: 4,
    // Урон X*Power*N + до +60% за стаки «Потрошение» (логика в useBattle)
  },
  {
    id: "poisonous-bite",
    name: "Ядовитый укус",
    type: "damage",
    value: 0,
    cooldownMs: 0,
    icon: "/images/hero/ability/disembowel.png",
    role: "finisher",
    classId: CLASS_ID,
    baseDamageX: X,
    comboCostMin: 3,
    comboCostMax: 5,
    dotInstantDamageRatio: 0.5,
    dotDurationMs: 16_000,
    dotTickIntervalMs: 2_000,
    dotTickDamageMultiplier: 0.3,
    dotProcChance: 0.15,
    dotProcBuffId: "cunning",
    dotProcBuffDurationMs: 15_000,
  },

  // --- Защитные способности ---
  {
    id: "evasion",
    name: "Ускользание",
    type: "buff",
    value: 0,
    cooldownMs: 30_000,
    icon: "/images/hero/ability/evasion.png",
    role: "defense",
    classId: CLASS_ID,
    defenseEvasionPercent: 0.3,
    defenseEvasionDurationMs: 8_000,
  },
  {
    id: "shadow-cloak",
    name: "Плащ теней",
    type: "buff",
    value: 0,
    cooldownMs: 45_000,
    durationMs: 10_000,
    icon: "/images/hero/ability/shadowcloak.png",
    role: "defense",
    classId: CLASS_ID,
    defenseDamageReductionPercent: 0.2,
    defenseDamageReductionDurationMs: 10_000,
  },
  
  // --- Контроль и мобильность ---
  {
    id: "lightning-flash",
    name: "Молниеносная вспышка",
    type: "buff",
    value: 0,
    cooldownMs: 30_000,
    icon: "/images/hero/ability/slice.png",
    role: "mobility",
    classId: CLASS_ID,
    movementSpeedPercent: 0.15,
    movementSpeedDurationMs: 10_000,
  },
 
];
