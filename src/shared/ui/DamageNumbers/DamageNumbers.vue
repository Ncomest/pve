<script setup lang="ts">
import type { DamageNumber } from "./useDamageNumbers";

defineProps<{
  numbers: DamageNumber[];
}>();
</script>

<template>
  <div class="damage-numbers">
    <TransitionGroup name="dmg">
      <span
        v-for="n in numbers"
        :key="n.id"
        class="damage-numbers__item"
        :class="[
          `damage-numbers__item--${n.type}`,
          { 'damage-numbers__item--crit': n.isCrit },
        ]"
      >
        {{ n.type === "dodge" ? n.value : (n.type === "heal" ? `+${n.value}` : `-${n.value}`) }}
      </span>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.damage-numbers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.damage-numbers__item {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  font-weight: 700;
  font-size: 1.4rem;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  user-select: none;

  &--damage {
    color: #ff8c00;
  }

  &--player-damage {
    color: #ff3c3c;
  }

  &--heal {
    color: #4cff72;
  }

  &--dodge {
    color: #a0c4ff;
    font-size: 1rem;
  }

  &--crit {
    font-size: 1.9rem;
    color: #ffd700;
    text-shadow: 0 0 8px rgba(255, 200, 0, 0.8), 0 1px 4px rgba(0, 0, 0, 0.9);
  }
}

// Анимация: появляется и улетает вверх
.dmg-enter-active {
  animation: float-up 1.2s ease-out forwards;
}

.dmg-leave-active {
  display: none;
}

@keyframes float-up {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.2);
  }
  20% {
    opacity: 1;
    transform: translateX(-50%) translateY(-10px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-70px) scale(0.85);
  }
}
</style>
