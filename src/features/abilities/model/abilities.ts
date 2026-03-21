import type { Ability } from "./types";
import { BLADE_AND_POISON_ABILITIES } from "./blade-and-poison";

export const ABILITIES: Ability[] = [
  // {
  //   id: "heal",
  //   name: "Лечение",
  //   description: "Вы выпиваете эликсир и восстанавливаете 40 ед здоровья",
  //   type: "heal",
  //   value: 50,
  //   cooldownMs: 12000,
  //   icon: "/images/hero/ability/heal_potion.png",
  //   effects: [{ kind: "heal", value: 50 }],
  // },
  {
    id: "rebuke",
    name: "Укор",
    description: "Вы можете прервать способность босса",
    type: "control",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/kick.png",
    role: "control",
    interrupt: true,
  },
  {
    id: "dodge",
    name: "Уворот",
    description: "Вы уворачиваетесь от мощной атаки босса",
    type: "evidence",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/blur.png",
    role: "defense",
    defenseDodgeNext: true,
    defenseDodgeExpireMs: 5_000,
  },
  {
    id: "block",
    name: "Блок",
    description: "Вы можете заблокировать особую способность босса",
    type: "evidence",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/defend.png",
    role: "defense",
    defenseBlockSpecials: true,
  },
  {
    id: "ice-wall",
    name: "Стена льда",
    description: "Позволяет избежать фронтальной атаки",
    type: "evidence",
    value: 0,
    cooldownMs: 10_000,
    durationMs: 3_000,
    icon: "/images/hero/ability/icewall.png",
    role: "defense",
    effects: [
      {
        kind: "block_specials",
        durationMs: 3_000,
      },
    ],
  },
  {
    id: "teleport",
    name: "Телепорт",
    description: "Позволяет избежать урон от войды",
    type: "evidence",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/blink.png",
    role: "mobility",
    effects: [
      {
        kind: "cleanse",
        target: "self",
        debuffTypes: ["ground"],
      },
    ],
  },
  {
    id: "cleanse",
    name: "Очищение",
    description: "Снимает с героя проклятие, яды, кровотечения",
    type: "buff",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/cleanse.png",
    role: "defense",
    effects: [
      {
        kind: "cleanse",
        target: "self",
        debuffTypes: ["poison", "curse", "burn", "bleed"],
      },
    ],
  },
  {
    id: "dispell",
    name: "Dispell",
    description: "Снимает с врага усиление",
    type: "buff",
    value: 0,
    cooldownMs: 10_000,
    icon: "/images/hero/ability/dispell.png",
    role: "control",
    effects: [
      {
        kind: "dispel",
        target: "boss",
      },
    ],
  },
];

/** Способности класса «Клинок и Яд» (генераторы, финишеры, защита, контроль) */
export { BLADE_AND_POISON_ABILITIES };

/** Все способности: базовые + класс «Клинок и Яд» (для страницы навыков и выбора слотов) */
export const ALL_ABILITIES: Ability[] = [...ABILITIES, ...BLADE_AND_POISON_ABILITIES];

