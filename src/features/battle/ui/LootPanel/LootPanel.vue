<script setup lang="ts">
import type { Item } from "@/entities/item/model";
import { SLOT_NAMES } from "@/entities/item/model";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import "./LootPanel.scss";

defineProps<{
  items: Item[];
}>();

const emit = defineEmits<{
  takeItem: [item: Item];
}>();
</script>

<template>
  <div class="loot-panel">
    <div class="loot-panel__title">Добыча с босса:</div>
    <div class="loot-panel__items">
      <div v-for="item in items" :key="item.id" class="loot-panel__item">
        <div class="loot-panel__item-info">
          <div class="loot-panel__item-name" :style="{ color: rarityColor(item.rarity) }">
            {{ item.name }}
          </div>
          <div class="loot-panel__item-slot">{{ SLOT_NAMES[item.slot] }}</div>
        </div>
        <button type="button" class="loot-panel__take-btn" @click="emit('takeItem', item)">
          Забрать
        </button>
      </div>
    </div>
  </div>
</template>
