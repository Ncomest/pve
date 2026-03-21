import type { useCharacterStore } from "@/app/store/character";
import {
  createItemInstance,
  generateInstanceId,
} from "@/entities/item/lib/createInstance";
import type { ItemInstance } from "@/entities/item/model";
import { getRecipeById } from "@/entities/craft/model/craft-recipes";
import { itemLevelFromHeroLevel } from "@/shared/lib/item/itemLevelFromHero";

export type CraftOutcome =
  | { ok: true }
  | { ok: false; reason: "unknown_recipe" | "no_resources" | "inventory_full" };

function countResource(
  store: ReturnType<typeof useCharacterStore>,
  templateId: string,
): number {
  let n = 0;
  for (const entry of store.resources) {
    if (entry?.templateId === templateId) n += entry.count ?? 1;
  }
  return n;
}

/**
 * Крафтит вещь: списывает ресурсы, создаёт экземпляр с уровнем и рандомом как у лута.
 */
export function tryCraftRecipe(
  recipeId: string,
  store: ReturnType<typeof useCharacterStore>,
  heroLevel: number,
): CraftOutcome {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return { ok: false, reason: "unknown_recipe" };
  if (recipe.requirements.length === 0) {
    return { ok: false, reason: "no_resources" };
  }

  for (const r of recipe.requirements) {
    if (countResource(store, r.resourceId) < r.amount) {
      return { ok: false, reason: "no_resources" };
    }
  }

  for (const r of recipe.requirements) {
    if (!store.consumeResourceAmount(r.resourceId, r.amount)) {
      return { ok: false, reason: "no_resources" };
    }
  }

  const itemLevel = itemLevelFromHeroLevel(heroLevel);
  const crafted = createItemInstance(recipe.resultItemId, itemLevel);

  if (!store.addItemToInventory(crafted)) {
    const refund: ItemInstance[] = [];
    for (const r of recipe.requirements) {
      refund.push({
        instanceId: generateInstanceId(),
        templateId: r.resourceId,
        itemLevel: 1,
        count: r.amount,
      });
    }
    for (const inst of refund) {
      store.addItemToResources(inst);
    }
    return { ok: false, reason: "inventory_full" };
  }

  return { ok: true };
}
