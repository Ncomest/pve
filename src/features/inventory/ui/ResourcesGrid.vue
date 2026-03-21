<script setup lang="ts">
import { computed } from "vue";
import type { ItemInstance } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import lootData from "@/entities/loot/loot.json";
import "./ConsumablesGrid.scss";

interface ResourceEntry {
  item: ItemInstance | null;
  index: number;
}

const props = defineProps<{
  items: ResourceEntry[];
  selectedIndex: number | null;
}>();

const FILLED_COLOR = "rgba(56, 189, 248, 0.35)";

const emit = defineEmits<{
  select: [item: ItemInstance | null, index: number];
}>();

const iconByLootId = new Map(
  (lootData as { id: string; icon?: string }[]).map((e) => [e.id, e.icon]),
);

const displayByIndex = computed(() =>
  props.items.map((entry) => {
    if (!entry.item) return null;
    const tmpl = getTemplate(entry.item.templateId);
    const icon =
      iconByLootId.get(entry.item.templateId) ?? "📦";
    return {
      icon,
      name: tmpl?.name ?? entry.item.templateId,
      count: entry.item.count ?? 1,
    };
  }),
);

function handleClick(item: ItemInstance | null, index: number) {
  if (!item) return;
  emit("select", item, index);
}
</script>

<template>
  <div class="consumables-grid resources-grid">
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
        <span
          class="resources-grid__emoji"
          aria-hidden="true"
        >
          {{ displayByIndex[index]!.icon }}
        </span>
        <span
          v-if="(displayByIndex[index]!.count ?? 1) > 1"
          class="inventory-grid__count"
        >
          {{ displayByIndex[index]!.count }}
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

<style scoped>
.resources-grid__emoji {
  font-size: 26px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
