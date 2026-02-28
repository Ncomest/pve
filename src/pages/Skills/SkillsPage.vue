<script setup lang="ts">
import { ref } from "vue";
import { useSkillsStore, SLOTS_PER_PANEL, type SkillSlot } from "@/app/store/skills";
import { ABILITIES } from "@/features/abilities/model/abilities";
import type { Ability } from "@/features/abilities/model/types";
import SkillBarSlot from "@/features/skills/ui/SkillBarSlot.vue";
import "./SkillsPage.scss";

const skillsStore = useSkillsStore();
const selectedAbilityId = ref<string | null>(null);

const abilityById = (id: string): Ability | undefined => ABILITIES.find((a) => a.id === id);

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
          <SkillBarSlot
            v-for="(slot, slotIndex) in bar"
            :key="slotIndex"
            :ability="slot.abilityId ? abilityById(slot.abilityId) ?? null : null"
            :hotkey="slot.hotkey"
            :editable="true"
            @assign="assignToSlot(panelIndex as 0 | 1, slotIndex)"
            @clear="clearSlot(panelIndex as 0 | 1, slotIndex)"
            @update:hotkey="setHotkey(panelIndex as 0 | 1, slotIndex, $event)"
          />
        </div>
      </div>
    </div>

    <section class="ability-list">
      <h2 class="ability-list__title">Список способностей</h2>
      <p class="ability-list__hint">
        Нажмите на способность, затем на пустой слот панели, чтобы назначить. Выбрано:
        <strong v-if="selectedAbilityId">{{ abilityById(selectedAbilityId)?.name ?? selectedAbilityId }}</strong>
        <span v-else>—</span>
      </p>
      <div class="ability-list__grid">
        <button
          v-for="ability in ABILITIES"
          :key="ability.id"
          type="button"
          class="ability-list__item"
          :class="[
            `ability-list__item--${ability.type}`,
            { 'ability-list__item--selected': selectedAbilityId === ability.id },
          ]"
          @click="selectedAbilityId = selectedAbilityId === ability.id ? null : ability.id"
        >
          <span class="ability-list__name">{{ ability.name }}</span>
          <span class="ability-list__meta">КД {{ (ability.cooldownMs / 1000).toFixed(1) }} с</span>
        </button>
      </div>
    </section>
  </div>
</template>
