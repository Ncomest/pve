<script setup lang="ts">
import type { Ability } from "@/features/abilities/model/types";
import { abilityTypeLabel, abilityRoleLabel, comboText } from "./abilityLabels";
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
    <span v-if="ability.classId" class="ability-tooltip__row ability-tooltip__row--class">
      <span class="ability-tooltip__value">Класс: Клинок и Яд</span>
    </span>
    <span class="ability-tooltip__row">
      <span class="ability-tooltip__label">Тип</span>
      <span class="ability-tooltip__value">{{ abilityTypeLabel(ability.type) }}</span>
    </span>
    <span v-if="ability.role" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Роль</span>
      <span class="ability-tooltip__value">{{ abilityRoleLabel(ability.role) }}</span>
    </span>
    <span v-if="comboText(ability)" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Комбо</span>
      <span class="ability-tooltip__value">{{ comboText(ability) }}</span>
    </span>
    <span class="ability-tooltip__row">
      <span class="ability-tooltip__label">Перезарядка</span>
      <span class="ability-tooltip__value">
        {{ cooldownText ?? (ability.cooldownMs === 0 ? "нет" : (ability.cooldownMs / 1000).toFixed(1) + " с") }}
      </span>
    </span>
    <span v-if="ability.value > 0" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Сила</span>
      <span class="ability-tooltip__value">{{ ability.value }}</span>
    </span>
    <span v-if="ability.baseDamageX" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Урон</span>
      <span class="ability-tooltip__value">X × Power{{ ability.comboCostMin != null ? " × N" : "" }}</span>
    </span>
    <span v-if="ability.durationMs" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Длительность</span>
      <span class="ability-tooltip__value">{{ (ability.durationMs / 1000).toFixed(1) }} с</span>
    </span>
    <span v-if="ability.bleedDamage" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Кровотечение</span>
      <span class="ability-tooltip__value">{{ ability.bleedDamage }} / {{ (ability.bleedTickIntervalMs! / 1000).toFixed(0) }} с</span>
    </span>
    <span v-if="ability.armorDebuff" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Срез брони</span>
      <span class="ability-tooltip__value">{{ ability.armorDebuff }} на {{ (ability.armorDebuffDurationMs! / 1000).toFixed(0) }} с</span>
    </span>
    <span v-if="ability.armorDebuffPercent" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Снижение брони</span>
      <span class="ability-tooltip__value">{{ (ability.armorDebuffPercent * 100).toFixed(0) }}% на {{ (ability.armorDebuffDurationMs! / 1000).toFixed(0) }} с</span>
    </span>
    <span v-if="ability.selfBuffCritPercent" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Шанс крита</span>
      <span class="ability-tooltip__value">+{{ (ability.selfBuffCritPercent * 100).toFixed(0) }}% на {{ (ability.selfBuffCritDurationMs! / 1000).toFixed(0) }} с</span>
    </span>
    <span v-if="ability.eviscerateStacksGain" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Стаки Потрошение</span>
      <span class="ability-tooltip__value">+{{ ability.eviscerateStacksGain }} (макс {{ ability.eviscerateMaxStacks }}, +{{ (ability.eviscerateStackBonusPercent! * 100).toFixed(0) }}% за стак)</span>
    </span>
    <span v-if="ability.defenseEvasionPercent" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Уклонение</span>
      <span class="ability-tooltip__value">+{{ (ability.defenseEvasionPercent * 100).toFixed(0) }}% на {{ (ability.defenseEvasionDurationMs! / 1000).toFixed(0) }} с</span>
    </span>
    <span v-if="ability.defenseDodgeNext" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Эффект</span>
      <span class="ability-tooltip__value">100% уклонение от следующей атаки ({{ (ability.defenseDodgeExpireMs! / 1000).toFixed(0) }} с)</span>
    </span>
    <span v-if="ability.defenseBlockSpecials" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Эффект</span>
      <span class="ability-tooltip__value">Блок особых атак босса</span>
    </span>
    <span v-if="ability.defenseDamageReductionPercent" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Снижение урона</span>
      <span class="ability-tooltip__value">{{ (ability.defenseDamageReductionPercent * 100).toFixed(0) }}% на {{ (ability.defenseDamageReductionDurationMs! / 1000).toFixed(0) }} с</span>
    </span>
    <span v-if="ability.movementSpeedPercent" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Скорость</span>
      <span class="ability-tooltip__value">+{{ (ability.movementSpeedPercent * 100).toFixed(0) }}% на {{ (ability.movementSpeedDurationMs! / 1000).toFixed(0) }} с</span>
    </span>
    <span v-if="ability.interrupt" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Эффект</span>
      <span class="ability-tooltip__value">Прерывание способности цели</span>
    </span>
    <span v-if="ability.dotDurationMs" class="ability-tooltip__row">
      <span class="ability-tooltip__label">Яд/DoT</span>
      <span class="ability-tooltip__value">{{ (ability.dotDurationMs / 1000).toFixed(0) }} с, тик {{ (ability.dotTickIntervalMs! / 1000).toFixed(0) }} с{{ ability.dotProcChance ? ", " + (ability.dotProcChance * 100).toFixed(0) + "% шанс баффа" : "" }}</span>
    </span>
  </div>
</template>
