import type { Ability } from "../../types";

/** Базовый множитель урона X для формул класса «Разбойник» (настраивается балансом) */
const X = 0.16;

const CLASS_ID = "rogue";

/**
 * Способности класса «Разбойник».
 * Генераторы дают комбо-поинты, финишеры тратят их. Формулы: X * Power, X * Power * N.
 */
export const ROGUE_ABILITIES: Ability[] = [
  // --- Генераторы комбо-поинтов ---
  {
    id: "cunning-strike",
    name: "Коварный удар",
    description: "Вы наносите небольшой урон и накапливаете 1 комбо-поинта",
    type: "damage",
    value: 0,
    cooldownMs: 0,
    icon: "/images/hero/ability/sinister_strike.png",
    role: "generator",
    classId: CLASS_ID,
    baseDamageX: 0.2,
    comboGain: 1,
    effects: [
      { kind: "damage", baseDamageX: X },
      { kind: "gain_combo", amount: 1 },
    ],
  },
  {
    id: "fierce-strike",
    name: "Свирепый удар",
    description: "Вы наносите средний удар и получаете 3 комбо-поинта",
    type: "damage",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/backstab.png",
    role: "generator",
    classId: CLASS_ID,
    baseDamageX: X,
    comboGain: 3,
    armorDebuffPercent: 0.3,
    armorDebuffDurationMs: 7_000,
  },
  {
    id: "sweeping-strike",
    name: "Размашистый удар",
    description:
      "Вы наносите средний урон, получаете 2 комбо-поинта, увеличиваете свой крит на 10% на 3 сек. Так же вы получаете стак, который усиливает урон от потрошения на 15%, максимально 4 стака",
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
    eviscerateMaxStacks: 3,
  },

  // --- Финишеры ---
  {
    id: "eviscerate",
    name: "Потрошение",
    description:
      "Вы наносите сильный урон. Сила урона зависит от количество используемых комбо-поинтов. Используется 3-6 комбо-поинта",
    type: "damage",
    value: 0,
    cooldownMs: 0,
    icon: "/images/hero/ability/eviscerate.png",
    role: "finisher",
    classId: CLASS_ID,
    baseDamageX: X,
    comboCostMin: 3,
    comboCostMax: 6,
    // Урон X*Power*N + до +60% за стаки «Потрошение» (логика в useBattle)
  },
  {
    id: "poisonous-bite",
    name: "Ядовитый укус",
    description:
      "Вы тратите 3-6 комбо-поинтов и наносите продолжительный урон ядом в течении 16 сек. Чем больше использовано комбо-понитов, тем больше урона нанесете. С вероятностью 15% вы можете усилить следующий 'Коварный удар' на 100%",
    type: "damage",
    value: 0,
    cooldownMs: 0,
    icon: "/images/hero/ability/disembowel.png",
    role: "finisher",
    classId: CLASS_ID,
    baseDamageX: X,
    comboCostMin: 3,
    comboCostMax: 6,
    dotInstantDamageRatio: 0.5,
    dotDurationMs: 16_000,
    dotTickIntervalMs: 2_000,
    dotTickDamageMultiplier: 1.05,
    dotProcChance: 0.15,
    dotProcBuffId: "cunning",
    dotProcBuffDurationMs: 15_000,
  },

  // --- Защитные способности ---
  // {
  //   id: "evasion",
  //   name: "Ускользание",
  //   description: "Увеличивает уклонение на +30% на 8 сек",
  //   type: "buff",
  //   value: 0,
  //   cooldownMs: 30_000,
  //   icon: "/images/hero/ability/evasion.png",
  //   role: "defense",
  //   classId: CLASS_ID,
  //   defenseEvasionPercent: 0.3,
  //   defenseEvasionDurationMs: 8_000,
  // },
  // {
  //   id: "shadow-cloak",
  //   name: "Плащ теней",
  //   description: "Снижает получаемый урона на 20% на 10 сек",
  //   type: "buff",
  //   value: 0,
  //   cooldownMs: 45_000,
  //   durationMs: 10_000,
  //   icon: "/images/hero/ability/shadowcloak.png",
  //   role: "defense",
  //   classId: CLASS_ID,
  //   defenseDamageReductionPercent: 0.2,
  //   defenseDamageReductionDurationMs: 10_000,
  // },

  // --- Контроль и мобильность ---
  // {
  //   id: "lightning-flash",
  //   name: "Молниеносная вспышка",
  //   description: "Увеличивает скорость на 15% на 10 секунд. Скорость уменьшает глобальный кулдаун всех способностей.",
  //   type: "buff",
  //   value: 0,
  //   cooldownMs: 50_000,
  //   icon: "/images/hero/ability/slice.png",
  //   role: "mobility",
  //   classId: CLASS_ID,
  //   speedPercent: 0.15,
  //   speedDurationMs: 10_000,
  // },
];
