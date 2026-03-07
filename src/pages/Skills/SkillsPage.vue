<script setup lang="ts">
import { ref } from "vue";
import { useSkillsStore } from "@/app/store/skills";
import { ABILITIES, BLADE_AND_POISON_ABILITIES, ALL_ABILITIES } from "@/features/abilities/model/abilities";
import type { Ability } from "@/features/abilities/model/types";
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
    evidence: "Избегание урона",
    control: "Контроль"
  };
  return map[type];
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

    <p class="ability-list__hint">
      Нажмите на способность, чтобы выбрать её, затем кликните на пустой слот панели для назначения. Выбрано:
      <strong v-if="selectedAbilityId">{{ abilityById(selectedAbilityId)?.name ?? selectedAbilityId }}</strong>
      <span v-else>—</span>
    </p>

    <section class="ability-list">
      <h2 class="ability-list__title">Общие способности</h2>
      <p class="ability-list__description">
        Эти способности позволяют выполнять механику боя с боссом — уклоняться от атак, прерывать врага, очищать дебаффы и восстанавливать здоровье.
      </p>
      <div class="ability-list__grid">
        <button
          v-for="ability in ABILITIES"
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
              <span v-if="ability.cooldownMs > 0" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Перезарядка:</span>
                <span class="ability-card__detail-value">{{ (ability.cooldownMs / 1000).toFixed(0) }} сек</span>
              </span>
              <span class="ability-card__detail-row">
                <span class="ability-card__detail-label">Роль:</span>
                <span class="ability-card__detail-value">{{ abilityTypeLabel(ability.type) }}</span>
              </span>
              <span v-if="ability.description" class="ability-card__detail-row ability-card__detail-row--description">
                <span class="ability-card__detail-label">Описание:</span>
                <span class="ability-card__detail-value">{{ ability.description }}</span>
              </span>
            </span>
          </span>
          <span class="ability-card__name">{{ ability.name }}</span>
        </button>
      </div>
    </section>

    <section class="ability-list ability-list--class">
      <h2 class="ability-list__title">Способности класса</h2>
      <div class="ability-list__grid">
        <button
          v-for="ability in BLADE_AND_POISON_ABILITIES"
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
              <span v-if="ability.cooldownMs > 0" class="ability-card__detail-row">
                <span class="ability-card__detail-label">Перезарядка:</span>
                <span class="ability-card__detail-value">{{ (ability.cooldownMs / 1000).toFixed(0) }} сек</span>
              </span>
              <span class="ability-card__detail-row">
                <span class="ability-card__detail-label">Роль:</span>
                <span class="ability-card__detail-value">{{ abilityTypeLabel(ability.type) }}</span>
              </span>
              <span v-if="ability.description" class="ability-card__detail-row ability-card__detail-row--description">
                <span class="ability-card__detail-label">Описание:</span>
                <span class="ability-card__detail-value">{{ ability.description }}</span>
              </span>
            </span>
          </span>
          <span class="ability-card__name">{{ ability.name }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
