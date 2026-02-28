<script setup lang="ts">
import type { Item } from "@/entities/item/model";
import { SLOT_NAMES } from "@/entities/item/model";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import "./ItemDetails.scss";

defineProps<{
  item: Item;
  isEquipped: boolean;
  isEquippedSlot?: boolean;
}>();

const emit = defineEmits<{
  equip: [];
  unequip: [];
  delete: [];
}>();
</script>

<template>
  <div class="item-details">
    <div class="item-details__header">
      <h3
        class="item-details__name"
        :style="{ color: rarityColor(item.rarity) }"
      >
        {{ item.name }}
      </h3>
      <div class="item-details__slot">{{ SLOT_NAMES[item.slot] }}</div>
    </div>

    <div class="item-details__stats">
      <div class="item-details__stats-title">Характеристики:</div>
      <div v-if="item.stats.hp" class="item-details__stat">
        HP: <span class="item-details__stat-value">+{{ item.stats.hp }}</span>
      </div>
      <div v-if="item.stats.power" class="item-details__stat">
        Атака: <span class="item-details__stat-value">+{{ item.stats.power }}</span>
      </div>
      <div v-if="item.stats.chanceCrit" class="item-details__stat">
        Крит:
        <span class="item-details__stat-value">
          +{{ Math.round(item.stats.chanceCrit * 100) }}%
        </span>
      </div>
      <div v-if="item.stats.evasion" class="item-details__stat">
        Уклонение:
        <span class="item-details__stat-value">
          +{{ Math.round(item.stats.evasion * 100) }}%
        </span>
      </div>
      <div v-if="item.stats.speed" class="item-details__stat">
        Скорость: <span class="item-details__stat-value">+{{ item.stats.speed }}</span>
      </div>
      <div v-if="item.stats.accuracy" class="item-details__stat">
        Меткость:
        <span class="item-details__stat-value">
          +{{ Math.round(item.stats.accuracy * 100) }}%
        </span>
      </div>
      <div v-if="item.stats.armor" class="item-details__stat">
        Броня: <span class="item-details__stat-value">+{{ item.stats.armor }}</span>
      </div>
    </div>

    <div class="item-details__actions">
      <template v-if="isEquippedSlot">
        <button
          type="button"
          class="item-details__btn item-details__btn--secondary"
          @click="emit('unequip')"
        >
          Снять
        </button>
      </template>
      <template v-else>
        <button
          v-if="!isEquipped"
          type="button"
          class="item-details__btn item-details__btn--primary"
          @click="emit('equip')"
        >
          Надеть
        </button>
        <span v-else class="item-details__equipped-badge">Надето</span>
        <button
          type="button"
          class="item-details__btn item-details__btn--danger"
          @click="emit('delete')"
        >
          Удалить
        </button>
      </template>
    </div>
  </div>
</template>
