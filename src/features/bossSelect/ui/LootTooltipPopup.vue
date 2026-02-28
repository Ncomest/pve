<script setup lang="ts">
import type { LootItem } from "@/entities/boss/model";
import { rarityLabel, slotLabel, statLabel, formatStatValue } from "@/shared/lib/labels";

defineProps<{
  item: LootItem;
  x: number;
  y: number;
}>();
</script>

<template>
  <div
    class="loot-tooltip"
    :style="{ left: x + 14 + 'px', top: y - 10 + 'px' }"
  >
    <div class="loot-tooltip__header">
      <span class="loot-tooltip__icon">{{ item.icon }}</span>
      <div>
        <div class="loot-tooltip__name" :class="`loot-tooltip__name--${item.rarity}`">
          {{ item.name }}
        </div>
        <div class="loot-tooltip__meta">
          {{ slotLabel(item.slot) }} · {{ rarityLabel(item.rarity) }}
        </div>
      </div>
    </div>
    <div class="loot-tooltip__desc">{{ item.description }}</div>
    <div class="loot-tooltip__stats">
      <div
        v-for="(value, key) in item.stats"
        :key="key"
        class="loot-tooltip__stat"
      >
        <span class="loot-tooltip__stat-label">{{ statLabel(key) }}</span>
        <span class="loot-tooltip__stat-value">{{ formatStatValue(key, value) }}</span>
      </div>
    </div>
  </div>
</template>
