<script setup lang="ts">
import type { Ability } from "@/features/abilities/model/types";
import { ABILITIES } from "@/features/abilities/model/abilities";
import type { SkillBar } from "@/app/store/skills";
import SkillBarSlot from "@/features/skills/ui/SkillBarSlot.vue";
import "./BattleAbilityBars.scss";

const GCD_MS = 2000;

const props = defineProps<{
  panels: [SkillBar, SkillBar];
  isBattleOver: boolean;
  isAbilityReady: (id: string) => boolean;
  abilityCooldownText: (id: string) => string;
  /** Кулдаун с учётом GCD */
  cooldownLeftMs: (id: string) => number;
  /** Только собственный кулдаун способности, без GCD */
  ownCooldownLeftMs: (id: string) => number;
}>();

const emit = defineEmits<{
  useAbility: [ability: Ability];
}>();

const abilityById = (id: string): Ability | undefined => ABILITIES.find((a) => a.id === id);

/**
 * Максимальный кулдаун для расчёта прогресса.
 * Если способность уже отошла (ownCD=0), но висит на GCD — используем GCD_MS.
 * Иначе — собственный КД способности.
 */
const maxCooldownMs = (abilityId: string): number => {
  const own = props.ownCooldownLeftMs(abilityId);
  if (own <= 0) return GCD_MS; // Блокирует только GCD
  const ability = abilityById(abilityId);
  return ability ? ability.cooldownMs : GCD_MS;
};

/**
 * Оставшийся кулдаун для отображения анимации:
 * - Если способность на своём КД — берём собственный КД
 * - Если только на GCD (собственный = 0) — берём GCD (total)
 */
const displayCooldownMs = (abilityId: string): number => {
  const own = props.ownCooldownLeftMs(abilityId);
  return own > 0 ? own : props.cooldownLeftMs(abilityId);
};
</script>

<template>
  <div class="battle-ability-bars">
    <div v-for="(bar, panelIndex) in panels" :key="panelIndex" class="battle-ability-bars__panel">
      <div class="battle-ability-bars__slots">
        <template v-for="(slot, slotIndex) in bar" :key="slotIndex">
          <button
            v-if="slot.abilityId && abilityById(slot.abilityId)"
            type="button"
            class="battle-ability-bars__btn"
            :disabled="isBattleOver || !isAbilityReady(slot.abilityId)"
            :title="abilityById(slot.abilityId)?.name + (abilityCooldownText(slot.abilityId) ? ' (' + abilityCooldownText(slot.abilityId) + ')' : '')"
            @click="emit('useAbility', abilityById(slot.abilityId)!)"
          >
            <SkillBarSlot
              :ability="abilityById(slot.abilityId) ?? null"
              :hotkey="slot.hotkey"
              :editable="false"
              :cooldown-ms="displayCooldownMs(slot.abilityId)"
              :cooldown-max-ms="maxCooldownMs(slot.abilityId)"
              :cooldown-text="abilityCooldownText(slot.abilityId)"
            />
          </button>
          <div v-else class="battle-ability-bars__empty">
            <SkillBarSlot :ability="null" :hotkey="''" :editable="false" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
