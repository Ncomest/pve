import type { Ability } from "./types";
import { BLADE_AND_POISON_ABILITIES } from "./blade-and-poison";

export const ABILITIES: Ability[] = [
  {
    id: "attack",
    name: "Атака",
    type: "damage",
    value: 0,
    cooldownMs: 5000,
    icon: "IconAttack",
    effects: [{ kind: "damage", baseDamageX: 1 }],
  },
  {
    id: "power-boost",
    name: "Усиление атаки",
    type: "buff",
    value: 10,
    durationMs: 8000,
    cooldownMs: 12000,
    icon: "IconPowerBoost",
    effects: [{ kind: "self_buff_power", value: 10, durationMs: 8000 }],
  },
  {
    id: "heal",
    name: "Лечение",
    type: "heal",
    value: 45,
    cooldownMs: 10000,
    icon: "/images/hero/ability/heal_potion.png",
    effects: [{ kind: "heal", value: 45 }],
  },
  {
    id: "bleed",
    name: "Кровотечение",
    type: "damage",
    value: 25,
    cooldownMs: 25000,
    bleedDamage: 25,
    bleedDurationMs: 14000,
    bleedTickIntervalMs: 2000,
    icon: "IconBleed",
    effects: [
      { kind: "damage", value: 25 },
      {
        kind: "dot",
        durationMs: 14000,
        tickIntervalMs: 2000,
        damagePerTick: 25,
      },
    ],
  },
  {
    id: "armor-break",
    name: "Срез брони",
    type: "damage",
    value: 30,
    cooldownMs: 20000,
    armorDebuff: 100,
    armorDebuffDurationMs: 10000,
    icon: "/images/hero/ability/colossus.png",
    effects: [
      { kind: "damage", value: 30 },
      { kind: "enemy_debuff_armor", value: 100, durationMs: 10000 },
    ],
  },
];

/** Способности класса «Клинок и Яд» (генераторы, финишеры, защита, контроль) */
export { BLADE_AND_POISON_ABILITIES };

/** Все способности: базовые + класс «Клинок и Яд» (для страницы навыков и выбора слотов) */
export const ALL_ABILITIES: Ability[] = [...ABILITIES, ...BLADE_AND_POISON_ABILITIES];

