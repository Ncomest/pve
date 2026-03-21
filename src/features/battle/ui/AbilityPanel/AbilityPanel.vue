<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { Ability } from "@/features/abilities/model/types";
import * as Icons from "@/shared/ui/icons";
import IconFlee from "@/shared/ui/icons/IconFlee.vue";
import "./AbilityPanel.scss";

defineProps<{
  abilities: Ability[];
  isBattleOver: boolean;
  isAbilityReady: (id: string) => boolean;
  abilityCooldownText: (id: string) => string;
}>();

const emit = defineEmits<{
  useAbility: [ability: Ability];
  flee: [];
}>();

const iconMap: Record<string, ReturnType<typeof defineAsyncComponent>> = Icons as never;
</script>

<template>
  <div class="ability-panel">
    <button
      v-for="ability in abilities"
      :key="ability.id"
      type="button"
      class="ability-panel__btn"
      :class="`ability-panel__btn--${ability.type}`"
      :disabled="isBattleOver || !isAbilityReady(ability.id)"
      :title="ability.name + (abilityCooldownText(ability.id) ? ' (' + abilityCooldownText(ability.id) + ')' : '')"
      @click="emit('useAbility', ability)"
    >
      <img
        v-if="ability.icon && (ability.icon.startsWith('/') || ability.icon.startsWith('http'))"
        :src="ability.icon"
        :alt="ability.name"
        class="ability-panel__icon"
        width="26"
        height="26"
        decoding="async"
      />
      <component
        v-else
        :is="ability.icon && iconMap[ability.icon] ? iconMap[ability.icon] : null"
        class="ability-panel__icon"
      />
      <span v-if="abilityCooldownText(ability.id)" class="ability-panel__cooldown">
        {{ abilityCooldownText(ability.id) }}
      </span>
    </button>
    <button
      type="button"
      class="ability-panel__btn ability-panel__btn--ghost"
      title="Сбежать с боя"
      @click="emit('flee')"
    >
      <IconFlee class="ability-panel__icon" />
    </button>
  </div>
</template>
