<script setup lang="ts">
import type { Ability } from "@/features/abilities/model/types";
import { abilityTypeLabel } from "./abilityLabels";
import "./AbilityTooltip.scss";

defineProps<{
  ability: Ability;
  /** Текст текущего кулдауна (например "3.2с") для отображения в бою */
  cooldownText?: string;
}>();
</script>

<template>
  <div class="ability-tooltip">
    <span class="ability-tooltip__title">{{ ability.name }}</span>
    <span v-if="ability.cooldownMs > 0" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Перезарядка:</span>
      <span class="ability-tooltip__value">
        {{ cooldownText || (ability.cooldownMs / 1000).toFixed(0) + " сек" }}
      </span>
    </span>
    <span class="ability-tooltip__row">
      <span class="ability-tooltip__label">Роль:</span>
      <span class="ability-tooltip__value">{{ abilityTypeLabel(ability.type) }}</span>
    </span>
    <span v-if="ability.description" class="ability-tooltip__row ability-tooltip__row--description">
      <span class="ability-tooltip__label">Описание:</span>
      <span class="ability-tooltip__value">{{ ability.description }}</span>
    </span>
  </div>
</template>
