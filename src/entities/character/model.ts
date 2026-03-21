import type { Stats } from "@/entities/boss/model";

export interface Character {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  stats: Stats;
}

export const PLAYER_CHARACTER: Character = {
  name: "Герой",
  level: 1,
  xp: 0,
  xpToNext: 100,
  stats: {
    hp: 250,
    maxHp: 250,
    power: 20,
    chanceCrit: 0.05,
    evasion: 0.05,
    speed: 2,
    armor: 5,
    accuracy: 0,
    critDefense: 0,
    spirit: 0,
    lifesteal: 0,
  },
};

