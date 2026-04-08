import type { Ability } from "./types";
import { ROGUE_ABILITIES } from "./classes/rogue/rogue";
import { HUNTER_ABILITIES } from "./classes/hunter/hunter";

export const ABILITIES: Ability[] = [
  {
    id: "Kick",
    name: "Прерывание",
    description: "Вы можете прервать способность босса",
    type: "control",
    value: 0,
    cooldownMs: 4_000,
    icon: "/images/hero/ability/kick.png",
    role: "control",
    interrupt: true,
  },
  {
    id: "block",
    name: "Блок",
    description: "Вы можете заблокировать особую способность босса",
    type: "evidence",
    value: 0,
    cooldownMs: 4_000,
    icon: "/images/hero/ability/defend.png",
    role: "defense",
    defenseBlockSpecials: true,
  },
  {
    id: "cleanse",
    name: "Очищение",
    description: "Снимает с героя проклятие, яды, кровотечения",
    type: "buff",
    value: 0,
    cooldownMs: 4_000,
    icon: "/images/hero/ability/cleanse.png",
    role: "defense",
    effects: [
      {
        kind: "cleansable-debuff",
        target: "self",
        debuffTypes: ["poison", "curse", "burn", "bleed"],
      },
    ],
  },
  {
    id: "dispell",
    name: "Рассеивание",
    description: "Снимает с врага баффы",
    type: "buff",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/dispell.png",
    role: "control",
    effects: [
      {
        kind: "dispellable-buff",
        target: "boss",
      },
    ],
  },
];

/** Способности класса «Клинок и Яд» (генераторы, финишеры, защита, контроль) */
export { ROGUE_ABILITIES, HUNTER_ABILITIES };

/** Все способности: базовые + классовые (для страницы навыков и выбора слотов) */
export const ALL_ABILITIES: Ability[] = [
  ...ABILITIES,
  ...ROGUE_ABILITIES,
  ...HUNTER_ABILITIES,
];
