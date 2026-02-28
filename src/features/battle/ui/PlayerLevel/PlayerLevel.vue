<script setup lang="ts">
import "./PlayerLevel.scss";

defineProps<{
  level: number;
  xp: number;
  xpToNext: number;
  percentToNext: number;
}>();
</script>

<template>
  <div class="player-level">
    <span class="player-level__label">Уровень {{ level }}</span>
    <div class="player-level__xp-bar">
      <div class="player-level__xp-fill" :style="{ width: `${percentToNext}%` }" />
    </div>
    <span class="player-level__xp-text">XP: {{ xp }} / {{ xpToNext }}</span>
  </div>
</template>
