<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { ActiveEffect } from "@/shared/lib/effects/types";
import * as Icons from "@/shared/ui/icons";
import "./EffectSlots.scss";

defineProps<{
  buffs: ActiveEffect[];
  debuffs: ActiveEffect[];
}>();

const iconMap: Record<string, ReturnType<typeof defineAsyncComponent>> = Icons as never;

const getIcon = (icon: string) => iconMap[icon] ?? null;

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "";
  if (seconds < 60) return `${seconds.toFixed(1)}с`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};
</script>

<template>
  <div class="effect-slots">
    <!-- Баффы — всегда отображается строка, даже если пусто -->
    <div class="effect-slots__row effect-slots__row--buff">
      <div
        v-for="effect in buffs"
        :key="effect.id"
        class="effect-slots__cell effect-slots__cell--buff"
        :title="`${effect.name}${effect.description ? ': ' + effect.description : ''}${effect.durationSeconds > 0 ? ' — ' + formatDuration(effect.durationSeconds) : ''}`"
      >
        <component
          :is="getIcon(effect.icon)"
          v-if="getIcon(effect.icon)"
          class="effect-slots__icon effect-slots__icon--svg"
        />
        <span v-else class="effect-slots__icon">{{ effect.icon }}</span>
        <span v-if="effect.durationSeconds > 0" class="effect-slots__duration">
          {{ formatDuration(effect.durationSeconds) }}
        </span>
      </div>
      <span v-if="buffs.length === 0" class="effect-slots__empty">—</span>
    </div>
    <!-- Дебаффы — всегда отображается строка, даже если пусто -->
    <div class="effect-slots__row effect-slots__row--debuff">
      <div
        v-for="effect in debuffs"
        :key="effect.id"
        class="effect-slots__cell effect-slots__cell--debuff"
        :title="`${effect.name}${effect.description ? ': ' + effect.description : ''}${effect.durationSeconds > 0 ? ' — ' + formatDuration(effect.durationSeconds) : ''}`"
      >
        <component
          :is="getIcon(effect.icon)"
          v-if="getIcon(effect.icon)"
          class="effect-slots__icon effect-slots__icon--svg"
        />
        <span v-else class="effect-slots__icon">{{ effect.icon }}</span>
        <span v-if="effect.durationSeconds > 0" class="effect-slots__duration">
          {{ formatDuration(effect.durationSeconds) }}
        </span>
      </div>
      <span v-if="debuffs.length === 0" class="effect-slots__empty">—</span>
    </div>
  </div>
</template>
