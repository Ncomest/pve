<script setup lang="ts">
import { computed, ref } from "vue";
import { useCharacterStore } from "@/app/store/character";
import { useInventory } from "@/features/inventory/model/useInventory";
import InventorySection from "@/features/inventory/ui/InventorySection.vue";
import lootData from "@/entities/loot/loot.json";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import { CRAFT_RECIPES, getCraftResultItem } from "@/entities/craft/model/craft-recipes";
import "./CraftPage.scss";

interface LootEntry {
  id: string;
  name: string;
  icon?: string;
  slot: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  description?: string;
}

const characterStore = useCharacterStore();
const expandedRecipeId = ref<string | null>(null);

const {
  selectedItem,
  selectedEquippedItem,
  selectedDisplayItem,
  selectedEquippedDisplayItem,
  inventoryFullWarning,
  isItemEquipped,
  selectItem,
  handleEquip,
  handleUnequipSelected,
  handleDelete,
  closeWarning,
} = useInventory();

const inventoryItems = computed(() => characterStore.inventoryItems);

const lootEntries = lootData as LootEntry[];
const resourceById = new Map<string, LootEntry>(
  lootEntries.filter((entry) => entry.slot === "resource").map((entry) => [entry.id, entry]),
);

function getResource(resourceId: string): LootEntry | undefined {
  return resourceById.get(resourceId);
}

const recipesWithItems = computed(() =>
  CRAFT_RECIPES.map((recipe) => ({
    recipe,
    resultItem: getCraftResultItem(recipe),
  })),
);

function toggleRecipe(recipeId: string) {
  expandedRecipeId.value = expandedRecipeId.value === recipeId ? null : recipeId;
}

function isRecipeExpanded(recipeId: string): boolean {
  return expandedRecipeId.value === recipeId;
}
</script>

<template>
  <div class="craft-page">
    <h1 class="craft-page__title">Крафт</h1>
    <p class="craft-page__subtitle">
      Используйте ресурсы, добытые с боссов, чтобы создавать усиленное снаряжение.
    </p>

    <div class="craft-page__content">
      <InventorySection
        :items="inventoryItems"
        :selected-item="selectedItem"
        :selected-equipped-item="selectedEquippedItem"
        :selected-display-item="selectedDisplayItem"
        :selected-equipped-display-item="selectedEquippedDisplayItem"
        :inventory-full-warning="inventoryFullWarning"
        :is-item-equipped="isItemEquipped"
        @select="selectItem"
        @equip="handleEquip"
        @unequip-selected="handleUnequipSelected"
        @delete="handleDelete"
        @close-warning="closeWarning"
      />

      <section class="craft-page__recipes">
        <h2 class="craft-page__recipes-title">Рецепты крафта</h2>
        <p class="craft-page__recipes-hint">
          Пока крафт работает как прототип: здесь отображаются рецепты и требуемые материалы.
        </p>

        <div class="craft-page__recipes-list">
          <article
            v-for="entry in recipesWithItems"
            :key="entry.recipe.id"
            class="craft-page__recipe"
            :class="{ 'craft-page__recipe--expanded': isRecipeExpanded(entry.recipe.id) }"
          >
            <button
              type="button"
              class="craft-page__recipe-header"
              @click="toggleRecipe(entry.recipe.id)"
            >
              <div
                class="craft-page__recipe-icon"
                :style="{ color: rarityColor(entry.resultItem?.rarity ?? 'common') }"
              >
                {{
                  getResource(entry.recipe.requirements[0]?.resourceId)?.icon
                    ?? "⚒"
                }}
              </div>
              <div class="craft-page__recipe-main">
                <div
                  class="craft-page__recipe-name"
                  :style="{ color: rarityColor(entry.resultItem?.rarity ?? 'common') }"
                >
                  {{ entry.recipe.name }}
                </div>
              </div>
              <svg
                class="craft-page__recipe-chevron"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <div
              v-if="isRecipeExpanded(entry.recipe.id)"
              class="craft-page__recipe-details"
            >
              <p class="craft-page__recipe-desc">
                {{ entry.recipe.description }}
              </p>

              <div class="craft-page__recipe-result-info">
                <span class="craft-page__recipe-result-label">Результат:</span>
                <span
                  class="craft-page__recipe-result-name"
                  :style="{ color: rarityColor(entry.resultItem?.rarity ?? 'common') }"
                >
                  {{ entry.resultItem?.name ?? "Неизвестный предмет" }}
                </span>
              </div>

              <div class="craft-page__requirements-section">
                <span class="craft-page__requirements-label">Требуется:</span>
                <ul class="craft-page__requirements">
                  <li
                    v-for="req in entry.recipe.requirements"
                    :key="req.resourceId"
                    class="craft-page__requirement"
                  >
                    <span class="craft-page__requirement-icon">
                      {{ getResource(req.resourceId)?.icon ?? "?" }}
                    </span>
                    <span class="craft-page__requirement-name">
                      {{ getResource(req.resourceId)?.name ?? req.resourceId }}
                    </span>
                    <span class="craft-page__requirement-amount">
                      ×{{ req.amount }}
                    </span>
                  </li>
                </ul>
              </div>

              <button type="button" class="craft-page__btn" disabled>
                Создать
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

