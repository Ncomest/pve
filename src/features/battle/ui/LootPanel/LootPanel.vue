<script setup lang="ts">
import { computed } from "vue";
import type { ItemInstance } from "@/entities/item/model";
import { SLOT_NAMES, getDisplayItem } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import "./LootPanel.scss";

const props = defineProps<{
  items: ItemInstance[];
}>();

const emit = defineEmits<{
  takeItem: [item: ItemInstance];
}>();

const displayItems = computed(() =>
  props.items.map((inst) => getDisplayItem(inst, getTemplate)).filter(Boolean),
);
</script>

<template>
  <div class="loot-panel">
    <div class="loot-panel__title">Добыча с босса:</div>
    <div class="loot-panel__items">
      <div
        v-for="(display, idx) in displayItems"
        :key="props.items[idx]?.instanceId ?? idx"
        class="loot-panel__item"
      >
        <div class="loot-panel__item-info">
          <div
            class="loot-panel__item-name"
            :style="display ? { color: rarityColor(display.rarity) } : {}"
          >
            {{ display?.name }}
          </div>
          <div class="loot-panel__item-slot">
            {{ display ? SLOT_NAMES[display.slot] : "" }}
          </div>
          <div v-if="display?.itemLevel" class="loot-panel__item-level">
            Ур. вещи: {{ display.itemLevel }}
          </div>
        </div>
        <button
          type="button"
          class="loot-panel__take-btn"
          @click="props.items[idx] && emit('takeItem', props.items[idx]!)"
        >
          Забрать
        </button>
      </div>
    </div>
  </div>
</template>
