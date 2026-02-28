import type { Stats } from "@/entities/boss/model";

export interface Character {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  stats: Stats;
}

export const PLAYER_CHARACTER: Character = {
  name: "Герой Арены",
  level: 1,
  xp: 0,
  xpToNext: 100,
  stats: {
    hp: 250,
    maxHp: 250,
    power: 20,
    chanceCrit: 0.25,
    evasion: 0.15,
    speed: 2,
    armor: 0,
  },
};

