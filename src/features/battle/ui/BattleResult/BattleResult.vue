<script setup lang="ts">
import type { ItemInstance } from "@/entities/item/model";
import LootPanel from "@/features/battle/ui/LootPanel/LootPanel.vue";
import "./BattleResult.scss";

const props = defineProps<{
  winnerText: string;
  isVictory: boolean;
  loot: ItemInstance[];
  showLoot: boolean;
}>();

const emit = defineEmits<{
  replay: [];
  goToBossSelect: [];
  continue: [];
  takeItem: [item: ItemInstance];
}>();
</script>

<template>
  <div class="battle-result-overlay">
    <div class="battle-result-modal">
      <div class="battle-result-modal__header">
        <h2 class="battle-result-modal__title">
          {{ props.isVictory ? "Победа" : "Бой завершён" }}
        </h2>
      </div>

      <div class="battle-result-modal__subtitle">
        {{ props.isVictory ? "Босс повержен" : props.winnerText }}
      </div>

      <div v-if="props.isVictory && props.showLoot && props.loot.length" class="battle-result-modal__loot">
        <LootPanel
          :items="props.loot"
          @take-item="(item) => emit('takeItem', item)"
        />
      </div>

      <div class="battle-result-modal__actions">
        <button
          v-if="props.isVictory"
          type="button"
          class="battle-result-modal__btn battle-result-modal__btn--primary"
          @click="emit('continue')"
        >
          Продолжить
        </button>
        <template v-else>
          <button
            type="button"
            class="battle-result-modal__btn battle-result-modal__btn--secondary"
            @click="emit('replay')"
          >
            Сыграть ещё раз
          </button>
          <button
            type="button"
            class="battle-result-modal__btn battle-result-modal__btn--ghost"
            @click="emit('goToBossSelect')"
          >
            К выбору босса
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
