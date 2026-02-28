<script setup lang="ts">
import type { ActiveEffect } from "@/shared/lib/effects/types";
import { EffectSlots } from "@/shared/ui/EffectSlots";
import { HealthBar } from "@/shared/ui/HealthBar";
import "./BossCard.scss";

defineProps<{
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  hpPercent: number;
  power: number;
  chanceCrit: number;
  evasion: number;
  image?: string;
  buffs?: ActiveEffect[];
  debuffs?: ActiveEffect[];
}>();
</script>

<template>
  <div class="boss-card">
    <div class="boss-card__avatar">
      <img v-if="image" :src="image" :alt="name" class="boss-card__avatar-img" />
      <svg v-else class="boss-card__avatar-placeholder" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="8" fill="rgba(255,255,255,0.04)" />
        <circle cx="24" cy="18" r="7" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
        <path d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </div>
    <div class="boss-card__body">
      <div class="boss-card__title">
        {{ name }}
        <span class="boss-card__level">ур. {{ level }}</span>
      </div>
      <HealthBar
        :percent="hpPercent"
        :current="hp"
        :max="maxHp"
        variant="boss"
      />
      <EffectSlots
        :buffs="buffs ?? []"
        :debuffs="debuffs ?? []"
        class="boss-card__effects"
      />
    </div>
  </div>
</template>
