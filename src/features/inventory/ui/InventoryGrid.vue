<script setup lang="ts">
import { ref, computed } from "vue";
import type { ItemInstance, ItemSlot } from "@/entities/item/model";
import { getDisplayItem } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import { useCharacterStore } from "@/app/store/character";
import "./InventoryGrid.scss";

interface InventoryEntry {
  item: ItemInstance | null;
  index: number;
}

const props = defineProps<{
  items: InventoryEntry[];
  selectedIndex: number | null;
}>();

const emit = defineEmits<{
  select: [item: ItemInstance | null, index: number];
}>();

const displayByIndex = computed(() =>
  props.items.map((entry) =>
    entry.item ? getDisplayItem(entry.item, getTemplate) : null
  )
);

const characterStore = useCharacterStore();

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

const dragFromIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

function onDragStart(event: DragEvent, index: number) {
  dragFromIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    // Прозрачный ghost — рисуем свой через CSS
    const ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.top = "-9999px";
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }
}

function onDragEnter(index: number) {
  if (dragFromIndex.value === null || dragFromIndex.value === index) return;
  dragOverIndex.value = index;
}

function onDragLeave(event: DragEvent, index: number) {
  const related = event.relatedTarget as Element | null;
  // Сбрасываем только если выходим за пределы этого слота
  if (!related?.closest(`[data-index="${index}"]`)) {
    if (dragOverIndex.value === index) dragOverIndex.value = null;
  }
}

function onDrop(toIndex: number) {
  if (dragFromIndex.value === null || dragFromIndex.value === toIndex) {
    dragFromIndex.value = null;
    dragOverIndex.value = null;
    return;
  }
  characterStore.moveItem(dragFromIndex.value, toIndex);
  dragFromIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  dragFromIndex.value = null;
  dragOverIndex.value = null;
}

function handleClick(item: ItemInstance | null, index: number) {
  if (dragFromIndex.value !== null) return;
  emit("select", item, index);
}
</script>

<template>
  <div class="inventory-grid">
    <button
      v-for="{ item, index } in items"
      :key="index"
      :data-index="index"
      type="button"
      draggable="true"
      class="inventory-grid__slot"
      :class="{
        'inventory-grid__slot--filled': item,
        'inventory-grid__slot--selected': selectedIndex === index,
        'inventory-grid__slot--dragging': dragFromIndex === index,
        'inventory-grid__slot--drag-over': dragOverIndex === index,
      }"
      :style="displayByIndex[index] ? { '--rarity-color': rarityColor(displayByIndex[index]!.rarity) } : {}"
      @click="handleClick(item, index)"
      @dragstart="onDragStart($event, index)"
      @dragenter.prevent="onDragEnter(index)"
      @dragover.prevent
      @dragleave="onDragLeave($event, index)"
      @drop.prevent="onDrop(index)"
      @dragend="onDragEnd"
    >
      <!-- Предмет: иконка по типу слота с цветом редкости и уровнем -->
      <template v-if="displayByIndex[index]">
        <img
          :src="getSlotIconSrc(displayByIndex[index]!.slot)"
          :alt="displayByIndex[index]!.name"
          class="inventory-grid__icon"
          width="32"
          height="32"
          loading="lazy"
          decoding="async"
        />
        <span v-if="displayByIndex[index]?.itemLevel != null" class="inventory-grid__level">
          {{ displayByIndex[index]!.itemLevel }}
        </span>
      </template>

      <!-- Пустой слот: приглушённый квадрат-заглушка -->
      <svg v-else viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" class="inventory-grid__icon inventory-grid__icon--empty">
        <rect x="10" y="10" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
      </svg>
    </button>
  </div>
</template>
