<script setup lang="ts">
import { computed } from "vue";

/**
 * Накладывается поверх иконки.
 * Пока progress < 1 — иконка затемнена, сверху вниз открывается светлая часть.
 * progress=0 → полностью тёмная (только началось), progress=1 → полностью открыта (готово).
 */
const props = defineProps<{
  /** 0..1: прогресс восстановления (0 = только начали, 1 = готово) */
  progress: number;
  /** Текст оставшегося времени */
  cooldownText?: string;
}>();

const isOnCooldown = computed(() => props.progress < 1);

/**
 * Граница «светлой» области сверху.
 * progress=0 → wipeTop=0% (ещё ничего не открылось, затемнена вся иконка).
 * progress=1 → wipeTop=100% (открыто всё).
 */
const wipeTopPct = computed(() => `${Math.max(0, Math.min(100, props.progress * 100))}%`);
</script>

<template>
  <div v-if="isOnCooldown" class="cd-overlay">
    <!-- Тёмный слой, который постепенно «уезжает» вниз -->
    <div class="cd-overlay__dark" :style="{ top: wipeTopPct }" />
    <span v-if="cooldownText" class="cd-overlay__text">{{ cooldownText }}</span>
  </div>
</template>

<style scoped>
.cd-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

/* Тёмный прямоугольник, "top" анимируется через Vue binding */
.cd-overlay__dark {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  /* top проставляется инлайн */
  background: rgba(0, 0, 0, 0.72);
  /* Плавное движение полоски */
  transition: top 0.1s linear;
}

/* Граница светлого/тёмного — тонкая светящаяся полоска */
.cd-overlay__dark::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 6px 1px rgba(255, 255, 255, 0.4);
}

.cd-overlay__text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 1);
  z-index: 2;
}
</style>
