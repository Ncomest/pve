<script setup lang="ts">
import "./BattleResult.scss";

defineProps<{
  winnerText: string;
}>();

const emit = defineEmits<{
  replay: [];
  goToBossSelect: [];
}>();
</script>

<template>
  <div class="battle-result">
    <div class="battle-result__title">{{ winnerText }}</div>
    <div class="battle-result__actions">
      <button type="button" class="battle-result__btn battle-result__btn--secondary" @click="emit('replay')">
        Сыграть ещё раз
      </button>
      <button type="button" class="battle-result__btn battle-result__btn--ghost" @click="emit('goToBossSelect')">
        К выбору босса
      </button>
    </div>
  </div>
</template>
