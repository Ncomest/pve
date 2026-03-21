import type { Stats } from "@/entities/boss/model";

export interface Character {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  stats: Stats;
}

/** Стартовые статы; слияние с экипировкой и уровнем — `entities/character/lib/playerStatAggregation.ts`. */
export const PLAYER_CHARACTER: Character = {
  name: "Герой",
  level: 1,
  xp: 0,
  xpToNext: 100,
  stats: {
    hp: 250,
    maxHp: 250,
    power: 20,
    chanceCrit: 0,
    evasion: 0,
    speed: 0,
    armor: 0,
    accuracy: 0,
    critDefense: 0,
    spirit: 0,
    lifesteal: 0,
  },
};

