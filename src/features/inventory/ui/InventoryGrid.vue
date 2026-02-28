<script setup lang="ts">
import { ref } from "vue";
import type { Item, EquipmentSlot } from "@/entities/item/model";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import { useCharacterStore } from "@/app/store/character";
import "./InventoryGrid.scss";

interface InventoryEntry {
  item: Item | null;
  index: number;
}

defineProps<{
  items: InventoryEntry[];
  selectedIndex: number | null;
}>();

const emit = defineEmits<{
  select: [item: Item | null, index: number];
}>();

const characterStore = useCharacterStore();

// Каждая иконка — массив элементов { tag, attrs } для рендера в SVG viewBox="0 0 32 32"
interface SvgEl {
  tag: "path" | "rect" | "circle" | "ellipse" | "line" | "polyline";
  attrs: Record<string, string | number>;
}

const SLOT_ICONS: Record<EquipmentSlot, SvgEl[]> = {
  // Шлем — купол + козырёк
  helmet: [
    { tag: "path", attrs: { d: "M6 22 Q6 10 16 7 Q26 10 26 22 Z", fill: "currentColor", opacity: 0.85 } },
    { tag: "rect", attrs: { x: 5, y: 21, width: 22, height: 4, rx: 2, fill: "currentColor", opacity: 0.9 } },
    { tag: "rect", attrs: { x: 14, y: 7, width: 4, height: 4, rx: 1, fill: "currentColor", opacity: 0.5 } },
  ],
  // Нагрудник — трапеция с линией по центру
  chest: [
    { tag: "path", attrs: { d: "M9 7 L7 25 L16 27 L25 25 L23 7 Q19 4 16 4 Q13 4 9 7 Z", fill: "currentColor", opacity: 0.8 } },
    { tag: "line", attrs: { x1: 16, y1: 4, x2: 16, y2: 27, stroke: "currentColor", "stroke-width": 1.5, opacity: 0.4 } },
    { tag: "path", attrs: { d: "M11 10 Q16 8 21 10 L20 17 Q16 15 12 17 Z", fill: "currentColor", opacity: 0.4 } },
  ],
  // Пояс — горизонтальная полоса с пряжкой
  belt: [
    { tag: "rect", attrs: { x: 4, y: 12, width: 24, height: 8, rx: 3, fill: "currentColor", opacity: 0.85 } },
    { tag: "rect", attrs: { x: 13, y: 13, width: 6, height: 6, rx: 1.5, fill: "currentColor", opacity: 1 } },
    { tag: "circle", attrs: { cx: 16, cy: 16, r: 2, fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: 0.4 } },
  ],
  // Штаны — две штанины
  pants: [
    { tag: "path", attrs: { d: "M8 6 L16 6 L16 22 L12 28 L8 28 L10 22 L8 6 Z", fill: "currentColor", opacity: 0.8 } },
    { tag: "path", attrs: { d: "M24 6 L16 6 L16 22 L20 28 L24 28 L22 22 L24 6 Z", fill: "currentColor", opacity: 0.8 } },
    { tag: "rect", attrs: { x: 8, y: 6, width: 16, height: 3, rx: 1, fill: "currentColor", opacity: 0.5 } },
  ],
  // Ботинок — силуэт одного сапога
  boots: [
    { tag: "path", attrs: { d: "M11 4 L11 20 L8 28 L22 28 L22 23 L15 23 L15 4 Z", fill: "currentColor", opacity: 0.85 } },
    { tag: "rect", attrs: { x: 8, y: 25, width: 14, height: 3, rx: 1.5, fill: "currentColor", opacity: 0.6 } },
  ],
  // Ожерелье — дуга + подвеска
  necklace: [
    { tag: "path", attrs: { d: "M6 8 Q16 22 26 8", fill: "none", stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0.85 } },
    { tag: "circle", attrs: { cx: 16, cy: 23, r: 4, fill: "currentColor", opacity: 0.85 } },
    { tag: "line", attrs: { x1: 16, y1: 19, x2: 16, y2: 22, stroke: "currentColor", "stroke-width": 2, opacity: 0.7 } },
  ],
  // Кольцо — окружность с камнем
  ring: [
    { tag: "circle", attrs: { cx: 16, cy: 18, r: 9, fill: "none", stroke: "currentColor", "stroke-width": 3, opacity: 0.85 } },
    { tag: "circle", attrs: { cx: 16, cy: 9, r: 4, fill: "currentColor", opacity: 0.9 } },
    { tag: "circle", attrs: { cx: 16, cy: 9, r: 2, fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: 0.4 } },
  ],
  // Серьга — крючок + капля
  earring: [
    { tag: "path", attrs: { d: "M16 4 Q21 4 21 9 Q21 13 16 14", fill: "none", stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0.85 } },
    { tag: "circle", attrs: { cx: 16, cy: 23, r: 5, fill: "currentColor", opacity: 0.85 } },
    { tag: "line", attrs: { x1: 16, y1: 14, x2: 16, y2: 18, stroke: "currentColor", "stroke-width": 2, opacity: 0.7 } },
  ],
  // Оружие — меч по диагонали
  weapon: [
    { tag: "line", attrs: { x1: 8, y1: 27, x2: 25, y2: 8, stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.9 } },
    { tag: "path", attrs: { d: "M23 6 L28 6 L28 11 L24 10 Z", fill: "currentColor", opacity: 0.9 } },
    { tag: "line", attrs: { x1: 7, y1: 22, x2: 13, y2: 28, stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0.5 } },
    { tag: "line", attrs: { x1: 11, y1: 19, x2: 16, y2: 24, stroke: "currentColor", "stroke-width": 1.5, "stroke-linecap": "round", opacity: 0.4 } },
  ],
  // Щит — форма щита
  shield: [
    { tag: "path", attrs: { d: "M16 3 L27 8 L27 18 Q27 27 16 31 Q5 27 5 18 L5 8 Z", fill: "currentColor", opacity: 0.75 } },
    { tag: "path", attrs: { d: "M16 7 L23 11 L23 18 Q23 24 16 27 Q9 24 9 18 L9 11 Z", fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: 0.4 } },
    { tag: "line", attrs: { x1: 16, y1: 7, x2: 16, y2: 27, stroke: "currentColor", "stroke-width": 1, opacity: 0.35 } },
    { tag: "line", attrs: { x1: 9, y1: 17, x2: 23, y2: 17, stroke: "currentColor", "stroke-width": 1, opacity: 0.35 } },
  ],
};

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

function handleClick(item: Item | null, index: number) {
  // Клик не срабатывает если только что завершили перетаскивание
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
      :style="item ? { '--rarity-color': rarityColor(item.rarity) } : {}"
      @click="handleClick(item, index)"
      @dragstart="onDragStart($event, index)"
      @dragenter.prevent="onDragEnter(index)"
      @dragover.prevent
      @dragleave="onDragLeave($event, index)"
      @drop.prevent="onDrop(index)"
      @dragend="onDragEnd"
    >
      <!-- Предмет: иконка по типу слота с цветом редкости -->
      <svg
        v-if="item"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        class="inventory-grid__icon"
        :style="{ color: rarityColor(item.rarity) }"
      >
        <component
          :is="el.tag"
          v-for="(el, i) in SLOT_ICONS[item.slot]"
          :key="i"
          v-bind="el.attrs"
        />
      </svg>

      <!-- Пустой слот: приглушённый квадрат-заглушка -->
      <svg v-else viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" class="inventory-grid__icon inventory-grid__icon--empty">
        <rect x="10" y="10" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
      </svg>
    </button>
  </div>
</template>
