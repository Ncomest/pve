import type { Ability } from "./types";

export const ABILITIES: Ability[] = [
  {
    id: "attack",
    name: "Атака",
    type: "damage",
    value: 0,
    cooldownMs: 5000,
    icon: "IconSword",
  },
  {
    id: "power-boost",
    name: "Усиление атаки",
    type: "buff",
    value: 10,
    durationMs: 8000,
    cooldownMs: 12000,
    icon: "IconPowerBoost",
  },
  {
    id: "heal",
    name: "Лечение",
    type: "heal",
    value: 45,
    cooldownMs: 10000,
    icon: "IconHeal",
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
  },
  {
    id: "armor-break",
    name: "Срез брони",
    type: "damage",
    value: 30,
    cooldownMs: 20000,
    armorDebuff: 100,
    armorDebuffDurationMs: 10000,
    icon: "IconArmorBreak",
  },
];

