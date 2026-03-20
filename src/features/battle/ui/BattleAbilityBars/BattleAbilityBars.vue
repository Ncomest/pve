<script setup lang="ts">
import type { Ability } from "@/features/abilities/model/types";
import { ALL_ABILITIES } from "@/features/abilities/model/abilities";
import type { SkillBar } from "@/app/store/skills";
import SkillBarSlot from "@/features/skills/ui/SkillBarSlot.vue";
import { AbilityTooltip } from "@/shared/ui/AbilityTooltip";
import "./BattleAbilityBars.scss";

const props = defineProps<{
  panels: SkillBar[];
  isBattleOver: boolean;
  isAbilityReady: (id: string) => boolean;
  abilityCooldownText: (id: string) => string;
  /** Кулдаун с учётом GCD */
  cooldownLeftMs: (id: string) => number;
  /** Только собственный кулдаун способности, без GCD */
  ownCooldownLeftMs: (id: string) => number;
  /** Эффективный макс. кулдаун для прогресса (с учётом скорости), чтобы анимация затемнения шла с верха */
  effectiveMaxCooldownMs: (id: string) => number;
}>();

const emit = defineEmits<{
  useAbility: [ability: Ability];
}>();

/** Поиск по всем способностям (базовые + класс «Клинок и Яд»), иначе слоты с новыми способностями пустые */
const abilityById = (id: string): Ability | undefined => ALL_ABILITIES.find((a) => a.id === id);

/**
 * Максимальный кулдаун для расчёта прогресса (с учётом скорости персонажа).
 * Берётся из effectiveMaxCooldownMs, чтобы анимация осветления всегда начиналась с верха иконки.
 */
const maxCooldownMs = (abilityId: string): number => props.effectiveMaxCooldownMs(abilityId);

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
          <div
            v-if="slot.abilityId && abilityById(slot.abilityId)"
            class="battle-ability-bars__slot-wrap"
          >
            <button
              type="button"
              class="battle-ability-bars__btn"
              :disabled="isBattleOver || !isAbilityReady(slot.abilityId)"
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
            <div class="battle-ability-bars__tooltip">
              <AbilityTooltip
                :ability="abilityById(slot.abilityId)!"
                :cooldown-text="abilityCooldownText(slot.abilityId)"
              />
            </div>
          </div>
          <div v-else class="battle-ability-bars__empty">
            <SkillBarSlot :ability="null" :hotkey="''" :editable="false" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
