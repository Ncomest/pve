<script setup lang="ts">
import { ref } from "vue";
import { useSkillsStore } from "@/app/store/skills";
import { ALL_ABILITIES } from "@/features/abilities/model/abilities";
import type { Ability, AbilityRole } from "@/features/abilities/model/types";
import SkillBarSlot from "@/features/skills/ui/SkillBarSlot.vue";
import { AbilityTooltip } from "@/shared/ui/AbilityTooltip";
import * as Icons from "@/shared/ui/icons";
import "./SkillsPage.scss";

const skillsStore = useSkillsStore();
const selectedAbilityId = ref<string | null>(null);

const abilityById = (id: string): Ability | undefined => ALL_ABILITIES.find((a) => a.id === id);

/** Все иконки способностей из shared/ui/icons — подставляются по ability.icon */
const iconComponents = Icons as Record<string, (typeof Icons)[keyof typeof Icons]>;

function assignToSlot(panelIndex: 0 | 1, slotIndex: number) {
  if (selectedAbilityId.value) {
    skillsStore.setAbility(panelIndex, slotIndex, selectedAbilityId.value);
    selectedAbilityId.value = null;
  }
}

function clearSlot(panelIndex: 0 | 1, slotIndex: number) {
  skillsStore.clearSlot(panelIndex, slotIndex);
}

function setHotkey(panelIndex: 0 | 1, slotIndex: number, hotkey: string) {
  skillsStore.setHotkey(panelIndex, slotIndex, hotkey);
}

function selectAbility(ability: Ability) {
  selectedAbilityId.value = selectedAbilityId.value === ability.id ? null : ability.id;
}

function abilityTypeLabel(type: Ability["type"]): string {
  const map: Record<Ability["type"], string> = {
    damage: "Урон",
    heal: "Лечение",
    buff: "Усиление",
  };
  return map[type];
}

function abilityRoleLabel(role: AbilityRole | undefined): string {
  if (!role) return "";
  const map: Record<AbilityRole, string> = {
    generator: "Генератор",
    finisher: "Финишер",
    defense: "Защита",
    control: "Контроль",
    mobility: "Мобильность",
  };
  return map[role];
}

function comboText(ability: Ability): string {
  if (ability.comboGain !== undefined) return `+${ability.comboGain} комбо`;
  if (ability.comboCostMin !== undefined && ability.comboCostMax !== undefined)
    return `${ability.comboCostMin}–${ability.comboCostMax} комбо`;
  return "";
}
</script>

<template>
  <div class="skills-page">
    <h1 class="skills-page__title">Навыки</h1>
    <p class="skills-page__subtitle">
      Выберите способность из списка и нажмите на пустой слот, чтобы поставить её на панель. В каждом слоте справа сверху можно назначить клавишу для использования в бою.
    </p>

    <div class="skills-page__panels">
      <div v-for="(bar, panelIndex) in skillsStore.panels" :key="panelIndex" class="skill-panel">
        <span class="skill-panel__label">Панель {{ panelIndex + 1 }}</span>
        <div class="skill-panel__slots">
          <div
            v-for="(slot, slotIndex) in bar"
            :key="slotIndex"
            class="skill-panel__slot-wrap"
            :class="{ 'skill-panel__slot-wrap--has-ability': slot.abilityId && abilityById(slot.abilityId) }"
          >
            <SkillBarSlot
              :ability="slot.abilityId ? abilityById(slot.abilityId) ?? null : null"
              :hotkey="slot.hotkey"
              :editable="true"
              @assign="assignToSlot(panelIndex as 0 | 1, slotIndex)"
              @clear="clearSlot(panelIndex as 0 | 1, slotIndex)"
              @update:hotkey="setHotkey(panelIndex as 0 | 1, slotIndex, $event)"
            />
            <div v-if="slot.abilityId && abilityById(slot.abilityId)" class="skill-panel__tooltip">
              <AbilityTooltip :ability="abilityById(slot.abilityId)!" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="ability-list">
      <h2 class="ability-list__title">Список способностей</h2>
      <p class="ability-list__hint">
        Нажмите на способность, чтобы выбрать её, затем кликните на пустой слот панели для назначения. Выбрано:
        <strong v-if="selectedAbilityId">{{ abilityById(selectedAbilityId)?.name ?? selectedAbilityId }}</strong>
        <span v-else>—</span>
      </p>
      <div class="ability-list__grid">
        <button
          v-for="ability in ALL_ABILITIES"
          :key="ability.id"
          type="button"
          class="ability-card"
          :class="[
            `ability-card--${ability.type}`,
            { 'ability-card--selected': selectedAbilityId === ability.id },
          ]"
          @click="selectAbility(ability)"
        >
          <span class="ability-card__icon-wrap">
            <img
              v-if="ability.icon && (ability.icon.startsWith('/') || ability.icon.startsWith('http'))"
              :src="ability.icon"
              :alt="ability.name"
            />
            <component
              v-else-if="ability.icon && iconComponents[ability.icon]"
              :is="iconComponents[ability.icon]"
            />
            <span class="ability-card__tooltip">
              <span class="ability-card__tooltip-title">{{ ability.name }}</span>
              <span v-if="ability.classId" class="ability-card__detail-row ability-card__detail-row--class">
                <span class="ability-card__detail-value">Класс: Клинок и Яд</span>
              </span>
              <span class="ability-card__detail-row">
                <span class="ability-card__detail-label">Тип</span>
                <span class="ability-card__detail-value">{{ abilityTypeLabel(ability.type) }}</span>
              </span>
              <span v-if="ability.role" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Роль</span>
                <span class="ability-card__detail-value">{{ abilityRoleLabel(ability.role) }}</span>
              </span>
              <span v-if="comboText(ability)" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Комбо</span>
                <span class="ability-card__detail-value">{{ comboText(ability) }}</span>
              </span>
              <span class="ability-card__detail-row">
                <span class="ability-card__detail-label">Перезарядка</span>
                <span class="ability-card__detail-value">{{ ability.cooldownMs === 0 ? "нет" : (ability.cooldownMs / 1000).toFixed(1) + " с" }}</span>
              </span>
              <span v-if="ability.value > 0" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Сила</span>
                <span class="ability-card__detail-value">{{ ability.value }}</span>
              </span>
              <span v-if="ability.baseDamageX" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Урон</span>
                <span class="ability-card__detail-value">X × Power{{ ability.comboCostMin != null ? " × N" : "" }}</span>
              </span>
              <span v-if="ability.durationMs" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Длительность</span>
                <span class="ability-card__detail-value">{{ (ability.durationMs / 1000).toFixed(1) }} с</span>
              </span>
              <span v-if="ability.bleedDamage" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Кровотечение</span>
                <span class="ability-card__detail-value">{{ ability.bleedDamage }} / {{ (ability.bleedTickIntervalMs! / 1000).toFixed(0) }} с</span>
              </span>
              <span v-if="ability.armorDebuff" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Срез брони</span>
                <span class="ability-card__detail-value">{{ ability.armorDebuff }} на {{ (ability.armorDebuffDurationMs! / 1000).toFixed(0) }} с</span>
              </span>
              <span v-if="ability.armorDebuffPercent" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Снижение брони</span>
                <span class="ability-card__detail-value">{{ (ability.armorDebuffPercent * 100).toFixed(0) }}% на {{ (ability.armorDebuffDurationMs! / 1000).toFixed(0) }} с</span>
              </span>
              <span v-if="ability.selfBuffCritPercent" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Шанс крита</span>
                <span class="ability-card__detail-value">+{{ (ability.selfBuffCritPercent * 100).toFixed(0) }}% на {{ (ability.selfBuffCritDurationMs! / 1000).toFixed(0) }} с</span>
              </span>
              <span v-if="ability.eviscerateStacksGain" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Стаки Потрошение</span>
                <span class="ability-card__detail-value">+{{ ability.eviscerateStacksGain }} (макс {{ ability.eviscerateMaxStacks }}, +{{ (ability.eviscerateStackBonusPercent! * 100).toFixed(0) }}% за стак)</span>
              </span>
              <span v-if="ability.defenseEvasionPercent" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Уклонение</span>
                <span class="ability-card__detail-value">+{{ (ability.defenseEvasionPercent * 100).toFixed(0) }}% на {{ (ability.defenseEvasionDurationMs! / 1000).toFixed(0) }} с</span>
              </span>
              <span v-if="ability.defenseDodgeNext" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Эффект</span>
                <span class="ability-card__detail-value">100% уклонение от следующей атаки ({{ (ability.defenseDodgeExpireMs! / 1000).toFixed(0) }} с)</span>
              </span>
              <span v-if="ability.defenseBlockSpecials" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Эффект</span>
                <span class="ability-card__detail-value">Блок особых атак босса</span>
              </span>
              <span v-if="ability.defenseDamageReductionPercent" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Снижение урона</span>
                <span class="ability-card__detail-value">{{ (ability.defenseDamageReductionPercent * 100).toFixed(0) }}% на {{ (ability.defenseDamageReductionDurationMs! / 1000).toFixed(0) }} с</span>
              </span>
              <span v-if="ability.movementSpeedPercent" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Скорость</span>
                <span class="ability-card__detail-value">+{{ (ability.movementSpeedPercent * 100).toFixed(0) }}% на {{ (ability.movementSpeedDurationMs! / 1000).toFixed(0) }} с</span>
              </span>
              <span v-if="ability.interrupt" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Эффект</span>
                <span class="ability-card__detail-value">Прерывание способности цели</span>
              </span>
              <span v-if="ability.dotDurationMs" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Яд/DoT</span>
                <span class="ability-card__detail-value">{{ (ability.dotDurationMs / 1000).toFixed(0) }} с, тик {{ (ability.dotTickIntervalMs! / 1000).toFixed(0) }} с{{ ability.dotProcChance ? ", " + (ability.dotProcChance * 100).toFixed(0) + "% шанс баффа" : "" }}</span>
              </span>
            </span>
          </span>
          <span class="ability-card__name">{{ ability.name }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
