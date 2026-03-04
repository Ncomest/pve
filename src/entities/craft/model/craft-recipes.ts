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
  // Оружие
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
    id: "craft-legendary-blade",
    resultItemId: "weapon-legendary-blade",
    name: "Легендарный клинок",
    description: "Мощное оружие с высоким шансом крита для опытных воинов.",
    difficulty: "hard",
    requirements: [
      { resourceId: "resource-ethereal-dust", amount: 2 },
      { resourceId: "resource-essence-pure", amount: 1 },
      { resourceId: "resource-flame-crystal", amount: 2 },
    ],
  },

  // Щиты
  {
    id: "craft-iron-shield",
    resultItemId: "shield-iron",
    name: "Железный щит",
    description: "Надёжная защита с хорошим балансом здоровья и уклонения.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-earth-essence", amount: 2 },
      { resourceId: "resource-stone-shard", amount: 1 },
    ],
  },
  {
    id: "craft-dragon-shield",
    resultItemId: "shield-dragon",
    name: "Драконий щит",
    description: "Эпический щит из драконьей чешуи с мощной защитой.",
    difficulty: "normal",
    requirements: [
      { resourceId: "resource-golem-core", amount: 1 },
      { resourceId: "resource-earth-essence", amount: 3 },
      { resourceId: "resource-aqua-pearl", amount: 1 },
    ],
  },

  // Шлемы
  {
    id: "craft-iron-helmet",
    resultItemId: "helmet-iron",
    name: "Железный шлем",
    description: "Прочный шлем, увеличивающий запас здоровья.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-fire-essence", amount: 1 },
      { resourceId: "resource-earth-essence", amount: 1 },
    ],
  },
  {
    id: "craft-royal-helmet",
    resultItemId: "helmet-royal",
    name: "Королевский шлем",
    description: "Роскошный шлем с усилением силы и защиты.",
    difficulty: "normal",
    requirements: [
      { resourceId: "resource-golem-core", amount: 1 },
      { resourceId: "resource-stone-shard", amount: 2 },
    ],
  },

  // Нагрудники
  {
    id: "craft-iron-chest",
    resultItemId: "chest-iron",
    name: "Железная кираса",
    description: "Крепкая броня, обеспечивающая хорошую защиту корпуса.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-earth-essence", amount: 2 },
      { resourceId: "resource-fire-essence", amount: 1 },
    ],
  },
  {
    id: "craft-dragon-chest",
    resultItemId: "chest-dragon",
    name: "Драконья броня",
    description: "Легендарная броня с огромным запасом здоровья и силой.",
    difficulty: "hard",
    requirements: [
      { resourceId: "resource-golem-core", amount: 2 },
      { resourceId: "resource-essence-pure", amount: 1 },
      { resourceId: "resource-earth-essence", amount: 3 },
    ],
  },

  // Серьги
  {
    id: "craft-silver-earring",
    resultItemId: "earring-silver",
    name: "Серебряная серьга",
    description: "Элегантное украшение, повышающее шанс крита.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-air-essence", amount: 2 },
      { resourceId: "resource-storm-feather", amount: 1 },
    ],
  },
  {
    id: "craft-emerald-earring",
    resultItemId: "earring-emerald",
    name: "Изумрудная серьга",
    description: "Изысканное украшение с мощным усилением крита и урона.",
    difficulty: "normal",
    requirements: [
      { resourceId: "resource-ethereal-dust", amount: 1 },
      { resourceId: "resource-aqua-pearl", amount: 1 },
      { resourceId: "resource-storm-feather", amount: 1 },
    ],
  },

  // Кольца
  {
    id: "craft-silver-ring",
    resultItemId: "ring-silver",
    name: "Серебряное кольцо",
    description: "Кольцо с умеренным усилением здоровья и крита.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-water-essence", amount: 2 },
      { resourceId: "resource-aqua-pearl", amount: 1 },
    ],
  },
  {
    id: "craft-mystic-ring",
    resultItemId: "ring-mystic",
    name: "Мистическое кольцо",
    description: "Легендарное кольцо с мощным усилением всех характеристик.",
    difficulty: "hard",
    requirements: [
      { resourceId: "resource-essence-pure", amount: 1 },
      { resourceId: "resource-ethereal-dust", amount: 2 },
      { resourceId: "resource-aqua-pearl", amount: 1 },
    ],
  },

  // Пояса
  {
    id: "craft-iron-belt",
    resultItemId: "belt-iron",
    name: "Железный пояс",
    description: "Крепкий пояс с усилением брони и здоровья.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-earth-essence", amount: 2 },
      { resourceId: "resource-stone-shard", amount: 1 },
    ],
  },
  {
    id: "craft-dragonscale-belt",
    resultItemId: "belt-dragonscale",
    name: "Пояс из чешуи дракона",
    description: "Эпический пояс с мощной защитой и уклонением.",
    difficulty: "normal",
    requirements: [
      { resourceId: "resource-golem-core", amount: 1 },
      { resourceId: "resource-flame-crystal", amount: 1 },
      { resourceId: "resource-earth-essence", amount: 2 },
    ],
  },

  // Штаны
  {
    id: "craft-chainmail-pants",
    resultItemId: "pants-chainmail",
    name: "Кольчужные штаны",
    description: "Прочные штаны с хорошей бронёй и здоровьем.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-fire-essence", amount: 1 },
      { resourceId: "resource-earth-essence", amount: 2 },
    ],
  },
  {
    id: "craft-shadow-pants",
    resultItemId: "pants-shadow",
    name: "Штаны тени",
    description: "Лёгкие штаны для скрытных бойцов, усиливающие скорость.",
    difficulty: "normal",
    requirements: [
      { resourceId: "resource-ethereal-dust", amount: 1 },
      { resourceId: "resource-air-essence", amount: 2 },
      { resourceId: "resource-storm-feather", amount: 1 },
    ],
  },

  // Ботинки
  {
    id: "craft-iron-boots",
    resultItemId: "boots-iron",
    name: "Железные сапоги",
    description: "Прочные сапоги с умеренной скоростью и бронёй.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-earth-essence", amount: 1 },
      { resourceId: "resource-fire-essence", amount: 1 },
    ],
  },
  {
    id: "craft-wind-boots",
    resultItemId: "boots-wind",
    name: "Сапоги ветра",
    description: "Легендарные сапоги с огромной скоростью и уклонением.",
    difficulty: "hard",
    requirements: [
      { resourceId: "resource-essence-pure", amount: 1 },
      { resourceId: "resource-air-essence", amount: 3 },
      { resourceId: "resource-storm-feather", amount: 2 },
    ],
  },

  // Ожерелья
  {
    id: "craft-silver-necklace",
    resultItemId: "necklace-silver",
    name: "Серебряная цепочка",
    description: "Изящное ожерелье, улучшающее точность атак.",
    difficulty: "easy",
    requirements: [
      { resourceId: "resource-water-essence", amount: 1 },
      { resourceId: "resource-air-essence", amount: 1 },
    ],
  },
  {
    id: "craft-amulet",
    resultItemId: "necklace-amulet",
    name: "Амулет мудреца",
    description: "Легендарный амулет с мощным усилением всех боевых качеств.",
    difficulty: "hard",
    requirements: [
      { resourceId: "resource-essence-pure", amount: 2 },
      { resourceId: "resource-ethereal-dust", amount: 2 },
      { resourceId: "resource-golem-core", amount: 1 },
    ],
  },
];

export const getCraftResultItem = (recipe: CraftRecipe): Item | null =>
  ITEMS_DB[recipe.resultItemId] ?? null;

