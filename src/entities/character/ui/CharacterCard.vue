<script setup lang="ts">
import { computed } from "vue";
import type { ActiveEffect } from "@/shared/lib/effects/types";
import { EffectSlots } from "@/shared/ui/EffectSlots";
import { HealthBar } from "@/shared/ui/HealthBar";
import { useHeroAvatar } from "@/features/inventory/model/useHeroAvatar";
import "./CharacterCard.scss";

const props = defineProps<{
  name: string;
  hp: number;
  maxHp: number;
  hpPercent: number;
  power: number;
  chanceCrit: number;
  evasion: number;
  powerBoostText?: string;
  buffs?: ActiveEffect[];
  debuffs?: ActiveEffect[];
  /** Комбо-поинты (0–6), отображаются под полосой здоровья */
  comboPoints?: number;
}>();

const COMBO_MAX = 6;
const comboFilled = () => Math.min(COMBO_MAX, Math.max(0, props.comboPoints ?? 0));

const { selectedSrc } = useHeroAvatar();
const avatarSrc = computed(() => selectedSrc());
</script>

<template>
  <div class="character-card">
    <div class="character-card__avatar">
      <img
        v-if="avatarSrc"
        :src="avatarSrc"
        alt="Герой"
        class="character-card__avatar-img"
      />
      <svg
        v-else
        class="character-card__avatar-placeholder"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="8" fill="rgba(255,255,255,0.04)" />
        <circle cx="24" cy="18" r="7" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
        <path d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </div>
    <div class="character-card__body">
      <div class="character-card__title">{{ name }}</div>
      <HealthBar :percent="hpPercent" :current="hp" :max="maxHp" variant="player" />
      <div v-if="comboPoints !== undefined" class="character-card__combo" aria-label="Комбо-поинты">
        <span
          v-for="i in COMBO_MAX"
          :key="i"
          class="character-card__combo-dot"
          :class="{ 'character-card__combo-dot--filled': i <= comboFilled() }"
        />
      </div>
      <EffectSlots
        :buffs="buffs ?? []"
        :debuffs="debuffs ?? []"
        class="character-card__effects"
      />
    </div>
  </div>
</template>
