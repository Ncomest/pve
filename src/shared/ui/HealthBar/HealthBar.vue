<script setup lang="ts">
import { computed } from "vue";
import "./HealthBar.scss";

const props = defineProps<{
  percent: number;
  current: number;
  max: number;
  variant?: "player" | "boss";
}>();

/** Интерполирует между двумя RGB-цветами по коэффициенту t (0..1) */
function lerpColor(
  [r1, g1, b1]: [number, number, number],
  [r2, g2, b2]: [number, number, number],
  t: number,
): string {
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

const RED: [number, number, number] = [239, 68, 68];
const YELLOW: [number, number, number] = [234, 179, 8];
const GREEN: [number, number, number] = [34, 197, 94];

/** Возвращает CSS-градиент в зависимости от процента HP */
const hpBarStyle = computed(() => {
  const pct = Math.max(0, Math.min(100, props.percent));

  let color: string;
  if (pct <= 50) {
    // красный → жёлтый
    color = lerpColor(RED, YELLOW, pct / 50);
  } else {
    // жёлтый → зелёный
    color = lerpColor(YELLOW, GREEN, (pct - 50) / 50);
  }

  return {
    width: `${pct}%`,
    background: color,
  };
});
</script>

<template>
  <div class="health-bar">
    <div class="health-bar__track">
      <div class="health-bar__fill" :style="hpBarStyle" />
    </div>
    <div class="health-bar__text">HP: {{ current }} / {{ max }}</div>
  </div>
</template>
