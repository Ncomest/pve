import type { Item } from "@/entities/item/model";
import { ITEMS_DB } from "@/entities/item/items-db";

export interface CraftRequirement {
  resourceId: string;
  amount: number;
}

export interface CraftRecipe {
  /** Уникальный id рецепта */
  id: string;
  /** Id предмета-результата из ITEMS_DB */
  resultItemId: string;
  /** Отображаемое имя рецепта (может отличаться от имени предмета) */
  name: string;
  /** Краткое описание эффекта или фантазийного лора */
  description: string;
  /** Условная сложность крафта для визуального отображения */
  difficulty: "easy" | "normal" | "hard";
  /** Требуемые ресурсы (id из loot.json) */
  requirements: CraftRequirement[];
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "craft-iron-sword",
    resultItemId: "weapon-iron-sword",
    name: "Железный меч",
    description: "Базовое улучшение оружия для начала охоты на элементалей.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-fire-essence", amount: 2 },
      { resourceId: "resource-stone-shard", amount: 1 },
    ],
  },
  {
    id: "craft-mystic-ring",
    resultItemId: "ring-mystic",
    name: "Мистическое кольцо",
    description: "Усиливает шанс крита и урон, подходит для агрессивного стиля.",
    difficulty: "normal",
    requirements: [
      { resourceId: "resource-aqua-pearl", amount: 1 },
      { resourceId: "resource-ethereal-dust", amount: 1 },
    ],
  },
  {
    id: "craft-dragon-chest",
    resultItemId: "chest-dragon",
    name: "Драконья броня",
    description: "Массивная защита и запас здоровья для долгих боёв с боссами.",
    difficulty: "hard",
    requirements: [
      { resourceId: "resource-golem-core", amount: 1 },
      { resourceId: "resource-essence-pure", amount: 1 },
      { resourceId: "resource-earth-essence", amount: 3 },
    ],
  },
];

export const getCraftResultItem = (recipe: CraftRecipe): Item | null =>
  ITEMS_DB[recipe.resultItemId] ?? null;

