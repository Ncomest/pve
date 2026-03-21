import type { EquipmentSlot } from "@/entities/item/model";

export interface CraftRequirement {
  resourceId: string;
  amount: number;
}

export interface CraftRecipe {
  id: string;
  /** Слот экипировки (один рецепт на слот). */
  slot: EquipmentSlot;
  /** Id шаблона предмета-результата (середина линейки *-5 как «база» слота). */
  resultItemId: string;
  name: string;
  description: string;
  requirements: CraftRequirement[];
}

/**
 * Ровно 10 рецептов: по одному на слот. Стоимость — 1× ресурс с соответствующего босса-ресурса.
 * Редкость и статы результата — как у дропа с обычных боссов (createItemInstance).
 */
export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "craft-slot-weapon",
    slot: "weapon",
    resultItemId: "weapon-5",
    name: "Крафт оружия",
    description: "Случайное оружие уровня героя. Нужен эфир/эссенция огня.",
    requirements: [{ resourceId: "resource-fire-essence", amount: 1 }],
  },
  {
    id: "craft-slot-shield",
    slot: "shield",
    resultItemId: "shield-5",
    name: "Крафт щита",
    description: "Случайный щит. Нужна эссенция земли.",
    requirements: [{ resourceId: "resource-earth-essence", amount: 1 }],
  },
  {
    id: "craft-slot-helmet",
    slot: "helmet",
    resultItemId: "helmet-5",
    name: "Крафт шлема",
    description: "Случайный шлем. Нужен каменный осколок.",
    requirements: [{ resourceId: "resource-stone-shard", amount: 1 }],
  },
  {
    id: "craft-slot-chest",
    slot: "chest",
    resultItemId: "chest-5",
    name: "Крафт нагрудника",
    description: "Случайный нагрудник. Нужно ядро голема.",
    requirements: [{ resourceId: "resource-golem-core", amount: 1 }],
  },
  {
    id: "craft-slot-earring",
    slot: "earring",
    resultItemId: "earring-5",
    name: "Крафт серьги",
    description: "Случайная серьга. Нужна эссенция воздуха.",
    requirements: [{ resourceId: "resource-air-essence", amount: 1 }],
  },
  {
    id: "craft-slot-ring",
    slot: "ring",
    resultItemId: "ring-5",
    name: "Крафт кольца",
    description: "Случайное кольцо. Нужна эссенция воды.",
    requirements: [{ resourceId: "resource-water-essence", amount: 1 }],
  },
  {
    id: "craft-slot-belt",
    slot: "belt",
    resultItemId: "belt-5",
    name: "Крафт пояса",
    description: "Случайный пояс. Нужна пыль огня.",
    requirements: [{ resourceId: "resource-dust-fire", amount: 1 }],
  },
  {
    id: "craft-slot-pants",
    slot: "pants",
    resultItemId: "pants-5",
    name: "Крафт штанов",
    description: "Случайные штаны. Нужен эфир воздуха.",
    requirements: [{ resourceId: "resource-ether-air", amount: 1 }],
  },
  {
    id: "craft-slot-boots",
    slot: "boots",
    resultItemId: "boots-5",
    name: "Крафт обуви",
    description: "Случайная обувь. Нужен пламенный кристалл.",
    requirements: [{ resourceId: "resource-flame-crystal", amount: 1 }],
  },
  {
    id: "craft-slot-necklace",
    slot: "necklace",
    resultItemId: "necklace-5",
    name: "Крафт ожерелья",
    description: "Случайное ожерелье. Нужна водная жемчужина.",
    requirements: [{ resourceId: "resource-aqua-pearl", amount: 1 }],
  },
];

export function getRecipeById(id: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find((r) => r.id === id);
}
