<script setup lang="ts">
  import { computed, ref } from "vue";
  import { useCharacterStore } from "@/app/store/character";
  import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
  import { useInventory } from "@/features/inventory/model/useInventory";
  import InventorySection from "@/features/inventory/ui/InventorySection.vue";
  import ResourcesGrid from "@/features/inventory/ui/ResourcesGrid.vue";
  import lootData from "@/entities/loot/loot.json";
  import { getTemplate } from "@/entities/item/items-db";
  import { CRAFT_RECIPES } from "@/entities/craft/model/craft-recipes";
  import type { CraftRecipe } from "@/entities/craft/model/craft-recipes";
  import { tryCraftRecipe } from "@/entities/craft/model/craftItem";
  import type { ItemSlot } from "@/entities/item/model";
  import "./CraftPage.scss";

  interface LootEntry {
    id: string;
    name: string;
    icon?: string;
    slot: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "unique" | "legendary";
    description?: string;
  }

  const characterStore = useCharacterStore();
  const playerProgress = usePlayerProgress();
  const expandedRecipeId = ref<string | null>(null);
  const craftFeedback = ref<{ recipeId: string; text: string } | null>(null);
  const selectedResourceIndex = ref<number | null>(null);

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
  const resourceItems = computed(() => characterStore.resourceItems);

  const lootEntries = lootData as LootEntry[];
  const resourceById = new Map<string, LootEntry>(
    lootEntries
      .filter((entry) => entry.slot === "resource")
      .map((entry) => [entry.id, entry]),
  );

  function getResource(resourceId: string): LootEntry | undefined {
    return resourceById.get(resourceId);
  }

  const recipesWithItems = computed(() =>
    CRAFT_RECIPES.map((recipe) => ({
      recipe,
      resultName: getTemplate(recipe.resultItemId)?.name ?? "—",
    })),
  );

  function countResource(templateId: string): number {
    let n = 0;
    for (const { item } of characterStore.resourceItems) {
      if (item?.templateId === templateId) n += item.count ?? 1;
    }
    return n;
  }

  function canCraftRecipe(recipe: CraftRecipe): boolean {
    return recipe.requirements.every(
      (r) => countResource(r.resourceId) >= r.amount,
    );
  }

  const SLOT_ICON_FILES: Record<ItemSlot, string> = {
    helmet: "helmet",
    chest: "chest",
    belt: "belt",
    pants: "pants",
    boots: "boots",
    necklace: "neck",
    ring: "ring",
    earring: "trinket",
    weapon: "sword",
    shield: "shield",
    resource: "trinket",
  };

  function getSlotIconSrc(slot: ItemSlot) {
    const file = SLOT_ICON_FILES[slot];
    return `/images/equipment/${file}.png`;
  }

  function toggleRecipe(recipeId: string) {
    expandedRecipeId.value =
      expandedRecipeId.value === recipeId ? null : recipeId;
    craftFeedback.value = null;
  }

  function isRecipeExpanded(recipeId: string): boolean {
    return expandedRecipeId.value === recipeId;
  }

  function handleCraft(recipeId: string) {
    const result = tryCraftRecipe(
      recipeId,
      characterStore,
      playerProgress.level.value,
    );
    if (result.ok) {
      craftFeedback.value = { recipeId, text: "Предмет создан." };
      return;
    }
    if (result.reason === "no_resources") {
      craftFeedback.value = { recipeId, text: "Недостаточно ресурсов." };
    } else if (result.reason === "inventory_full") {
      craftFeedback.value = {
        recipeId,
        text: "Нет места в инвентаре для новой вещи.",
      };
    } else {
      craftFeedback.value = { recipeId, text: "Не удалось создать предмет." };
    }
  }

  function selectResource(item: import("@/entities/item/model").ItemInstance | null, index: number) {
    selectedResourceIndex.value = item ? index : null;
  }
</script>

<template>
  <div class="craft-page">
    <h1 class="craft-page__title">Крафт</h1>
    <p class="craft-page__subtitle">
      Ресурсы падают с боссов-ресурсов. Редкость и статы вещи при крафте
      случайны, как у добычи с обычных боссов; уровень вещи зависит от уровня
      героя.
    </p>

    <div class="craft-page__content">
      <div class="craft-page__left">
        <section class="craft-page__resources-section">
          <h2 class="craft-page__resources-title">Ресурсы</h2>
          <ResourcesGrid
            :items="resourceItems"
            :selected-index="selectedResourceIndex"
            @select="selectResource"
          />
        </section>

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
      </div>

      <section class="craft-page__recipes">
        <h2 class="craft-page__recipes-title">Рецепты крафта</h2>
        <p class="craft-page__recipes-hint">
          Один рецепт на тип экипировки. Нужен один соответствующий ресурс за
          крафт (уровень вещи: как у лута, от уровня героя).
        </p>

        <div class="craft-page__recipes-list">
          <article
            v-for="entry in recipesWithItems"
            :key="entry.recipe.id"
            class="craft-page__recipe"
            :class="{
              'craft-page__recipe--expanded': isRecipeExpanded(entry.recipe.id),
            }"
          >
            <button
              type="button"
              class="craft-page__recipe-header"
              @click="toggleRecipe(entry.recipe.id)"
            >
              <div class="craft-page__recipe-icon">
                <img
                  :src="getSlotIconSrc(entry.recipe.slot)"
                  :alt="entry.resultName"
                  class="craft-page__recipe-icon-img"
                  width="36"
                  height="36"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div class="craft-page__recipe-main">
                <div class="craft-page__recipe-name craft-page__recipe-name--neutral">
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
                <span class="craft-page__recipe-result-label">Базовое имя типа:</span>
                <span class="craft-page__recipe-result-name craft-page__recipe-result-name--neutral">
                  {{ entry.resultName }}
                </span>
              </div>
              <p class="craft-page__recipe-random-hint">
                Редкость и характеристики будут случайными при создании.
              </p>

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
                      <span
                        v-if="countResource(req.resourceId) < req.amount"
                        class="craft-page__requirement-missing"
                      >
                        (есть {{ countResource(req.resourceId) }})
                      </span>
                    </span>
                  </li>
                </ul>
              </div>

              <p
                v-if="craftFeedback?.recipeId === entry.recipe.id"
                class="craft-page__craft-msg"
              >
                {{ craftFeedback?.text }}
              </p>

              <button
                type="button"
                class="craft-page__btn"
                :disabled="!canCraftRecipe(entry.recipe)"
                @click="handleCraft(entry.recipe.id)"
              >
                Создать
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
