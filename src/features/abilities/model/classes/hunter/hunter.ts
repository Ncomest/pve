import type { Ability } from "../../types";

/** Базовый множитель урона X для формул класса «Охотник» (настраивается балансом) */
const X = 0.3;

const CLASS_ID = "hunter";

export const HUNTER_ABILITIES: Ability[] = [
  {
    id: "cobra-shoot",
    name: "Выстрел кобры",
    description: "Вы наносите небольшой урон",
    type: "damage",
    value: 0,
    cooldownMs: 0,
    icon: "/images/hero/ability/cobra_shoot_1.png",
    classId: CLASS_ID,
    baseDamageX: 3 * X,
  },
  {
    id: "kill_command",
    name: "Команда взять",
    description: "Вы наносите средний урон",
    type: "damage",
    value: 0,
    cooldownMs: 4_000,
    icon: "/images/hero/ability/kill_command_1.png",
    classId: CLASS_ID,
    baseDamageX: 3.7 * X,
  },
  {
    id: "explosive_shot",
    name: "Взрывной выстрел",
    description: "Вы наносите средний-тяжелый урон",
    type: "damage",
    value: 0,
    cooldownMs: 8_000,
    icon: "/images/hero/ability/explosive_shot_1.png",
    classId: CLASS_ID,
    baseDamageX: 4.1 * X,
  },
  {
    id: "spear",
    name: "Прицельный выстрел",
    description: "Вы наносите средний-тяжелый урон",
    type: "damage",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/spear_1.png",
    classId: CLASS_ID,
    baseDamageX: 4.5 * X,
  },
  {
    id: "spring_shot",
    name: "Ядовитый выстрел",
    description: "Вы наносите продолжительный урон ядом в течении 16 сек.",
    type: "damage",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/spring_shot_1.png",
    classId: CLASS_ID,
    baseDamageX: 2 * X,
    dotInstantDamageRatio: 0.2,
    dotDurationMs: 16_000,
    dotTickIntervalMs: 2_000,
    dotTickDamageMultiplier: 3,
  },
];
