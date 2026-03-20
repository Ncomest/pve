<script setup lang="ts">
import { computed } from "vue";
import type { ItemInstance } from "@/entities/item/model";
import { ELIXIR_BY_ID } from "@/features/elixirs/model/elixirs";
import "./ConsumablesGrid.scss";

interface ConsumableEntry {
  item: ItemInstance | null;
  index: number;
}

const props = defineProps<{
  items: ConsumableEntry[];
  selectedIndex: number | null;
}>();

const FILLED_COLOR = "rgba(250, 204, 21, 0.35)";

const emit = defineEmits<{
  select: [item: ItemInstance | null, index: number];
}>();

const displayByIndex = computed(() =>
  props.items.map((entry) => {
    if (!entry.item) return null;
    const def = ELIXIR_BY_ID[entry.item.templateId];
    return {
      icon: def?.icon ?? "/images/hero/ability/heal_potion.png",
      name: def?.name ?? "Эликсир",
      itemLevel: entry.item.itemLevel,
    };
  }),
);

function handleClick(item: ItemInstance | null, index: number) {
  if (!item) return;
  emit("select", item, index);
}
</script>

<template>
  <div class="consumables-grid">
    <button
      v-for="{ item, index } in props.items"
      :key="index"
      type="button"
      class="inventory-grid__slot"
      :class="{
        'inventory-grid__slot--filled': item,
        'inventory-grid__slot--selected': props.selectedIndex === index,
      }"
      :style="item ? { '--rarity-color': FILLED_COLOR } : {}"
      @click="handleClick(item, index)"
    >
      <template v-if="displayByIndex[index]">
        <img
          :src="displayByIndex[index]!.icon"
          :alt="displayByIndex[index]!.name"
          class="inventory-grid__icon"
        />
        <span v-if="displayByIndex[index]!.itemLevel != null" class="inventory-grid__level">
          {{ displayByIndex[index]!.itemLevel }}
        </span>
      </template>

      <svg
        v-else
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        class="inventory-grid__icon inventory-grid__icon--empty"
      >
        <rect
          x="10"
          y="10"
          width="12"
          height="12"
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-dasharray="3 2"
        />
      </svg>
    </button>
  </div>
</template>

