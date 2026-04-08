import type { Stats } from "@/entities/boss/model";

export interface RaceOption {
  id: string;
  name: string;
  bonus: Partial<Stats>;
  description: string;
}

const HERO_RACE_STORAGE_KEY = "hero-race";

export const RACES: RaceOption[] = [
  {
    id: "human",
    name: "Человек",
    bonus: { chanceCrit: 0.01 },
    description: "Вы - человек, который использует оружие для нанесения урона",
  },
  {
    id: "elf",
    name: "Эльф",
    bonus: { evasion: 0.01 },
    description: "Вы - эльф, который использует заклинания для нанесения урона",
  },
  {
    id: "dwarf",
    name: "Дварф",
    bonus: { armor: 1 },
    description: "Вы - дварф, который использует оружие для нанесения урона",
  },
  {
    id: "orc",
    name: "Орк",
    bonus: { power: 1 },
    description: "Вы - орк, который использует оружие для нанесения урона",
  },
  {
    id: "troll",
    name: "Тролль",
    bonus: { speed: 0.01 },
    description: "Вы - троль, который использует оружие для нанесения урона",
  },
  {
    id: "goblin",
    name: "Гоблин",
    bonus: { critDefense: 0.01 },
    description: "Вы - гоблин, который использует оружие для нанесения урона",
  },
  {
    id: "undead",
    name: "Нежить",
    bonus: { accuracy: 0.01 },
    description: "Вы - нежить, который использует оружие для нанесения урона",
  },
];

export function getRaceById(raceId: string | null | undefined): RaceOption | null {
  if (!raceId) return null;
  return RACES.find((race) => race.id === raceId) ?? null;
}

export function getSelectedRaceBonus(): Partial<Stats> {
  if (typeof window === "undefined") return {};
  const raceId = window.localStorage.getItem(HERO_RACE_STORAGE_KEY);
  return getRaceById(raceId)?.bonus ?? {};
}
