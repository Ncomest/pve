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

const slotIconSrc = (slot: string | undefined) => {
  if (!slot) return "/images/equipment/trinket.png";

  switch (slot) {
    case "helmet":
      return "/images/equipment/helmet.png";
    case "chest":
      return "/images/equipment/chest.png";
    case "earring":
      return "/images/equipment/trinket.png";
    case "ring":
      return "/images/equipment/ring.png";
    case "weapon":
      return "/images/equipment/sword.png";
    case "shield":
      return "/images/equipment/shield.png";
    case "belt":
      return "/images/equipment/belt.png";
    case "pants":
      return "/images/equipment/pants.png";
    case "boots":
      return "/images/equipment/boots.png";
    case "necklace":
      return "/images/equipment/neck.png";
    default:
      return "/images/equipment/trinket.png";
  }
};
</script>

<template>
  <div class="loot-panel">
    <div class="loot-panel__title">Добыча с босса</div>
    <div class="loot-panel__items">
      <div
        v-for="(display, idx) in displayItems"
        :key="props.items[idx]?.instanceId ?? idx"
        class="loot-panel__item"
      >
        <div class="loot-panel__item-main">
          <div class="loot-panel__item-icon-wrap">
            <img
              v-if="display"
              class="loot-panel__item-icon"
              :src="slotIconSrc(display.slot)"
              alt=""
            >
          </div>
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
        </div>

        <button
          type="button"
          class="loot-panel__take-btn"
          @click="props.items[idx] && emit('takeItem', props.items[idx]!)"
        >
          Забрать
        </button>

        <div v-if="display" class="loot-panel__tooltip">
          <div
            class="loot-panel__tooltip-name"
            :style="{ color: rarityColor(display.rarity) }"
          >
            {{ display.name }}
          </div>
          <div class="loot-panel__tooltip-meta">
            <span class="loot-panel__tooltip-slot">{{ SLOT_NAMES[display.slot] }}</span>
            <span v-if="display.itemLevel != null" class="loot-panel__tooltip-level">
              Ур. {{ display.itemLevel }}
            </span>
          </div>

          <div class="loot-panel__tooltip-stats-title">
            Характеристики:
          </div>
          <div v-if="display.stats.hp" class="loot-panel__tooltip-stat">
            HP:
            <span class="loot-panel__tooltip-stat-value">+{{ display.stats.hp }}</span>
          </div>
          <div v-if="display.stats.power" class="loot-panel__tooltip-stat">
            Атака:
            <span class="loot-panel__tooltip-stat-value">+{{ display.stats.power }}</span>
          </div>
          <div v-if="display.stats.chanceCrit" class="loot-panel__tooltip-stat">
            Крит:
            <span class="loot-panel__tooltip-stat-value">
              +{{ display.stats.chanceCrit }}
            </span>
          </div>
          <div v-if="display.stats.evasion" class="loot-panel__tooltip-stat">
            Уклонение:
            <span class="loot-panel__tooltip-stat-value">
              +{{ display.stats.evasion }}
            </span>
          </div>
          <div v-if="display.stats.speed" class="loot-panel__tooltip-stat">
            Скорость:
            <span class="loot-panel__tooltip-stat-value">
              +{{ display.stats.speed }}
            </span>
          </div>
          <div v-if="display.stats.armor" class="loot-panel__tooltip-stat">
            Броня:
            <span class="loot-panel__tooltip-stat-value">
              +{{ display.stats.armor }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
