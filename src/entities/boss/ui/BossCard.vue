<script setup lang="ts">
  import { computed } from "vue";
  import type { ActiveEffect } from "@/shared/lib/effects/types";
  import type {
    BossAbilityCategory,
    BossDefensiveTag,
  } from "@/entities/boss/model";
  import { EffectSlots } from "@/shared/ui/EffectSlots";
  import { HealthBar } from "@/shared/ui/HealthBar";
  import CooldownOverlay from "@/shared/ui/CooldownOverlay/CooldownOverlay.vue";
  import "./BossCard.scss";

  const props = defineProps<{
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
    attackCooldownLeft: number;
    attackCooldownMax: number;
    currentAbilityName?: string;
    currentAbilityIcon?: string;
    castTimeLeftMs?: number;
    castTotalMs?: number;
    castCategory?: BossAbilityCategory;
    castCanBeInterrupted?: boolean;
    castRequiredTag?: BossDefensiveTag;
    castDebuffType?: "poison" | "curse" | "burn" | "ground" | "bleed";
    castDebuffRequiresCleanse?: boolean;
    castDispellable?: boolean;
  }>();

  const attackCooldownProgress = computed(() => {
    if (props.attackCooldownMax <= 0) return 1;
    return (
      1 -
      Math.max(
        0,
        Math.min(1, props.attackCooldownLeft / props.attackCooldownMax),
      )
    );
  });

  const attackCooldownText = computed(() => {
    if (props.attackCooldownLeft <= 0) return "";
    return `${(props.attackCooldownLeft / 1000).toFixed(1)}с`;
  });

  const hasCast = computed(() => {
    return (
      props.castTotalMs !== undefined &&
      props.castTotalMs > 0 &&
      props.castTimeLeftMs !== undefined &&
      props.castTimeLeftMs > 0
    );
  });

  const castProgress = computed(() => {
    if (!hasCast.value || !props.castTotalMs) return 0;
    const left = Math.max(
      0,
      Math.min(props.castTimeLeftMs ?? 0, props.castTotalMs),
    );
    const ratio = 1 - left / props.castTotalMs;
    return Math.max(0, Math.min(1, ratio));
  });

  const castProgressPercent = computed(() => castProgress.value * 100);

  const castTimeText = computed(() => {
    if (!hasCast.value || props.castTimeLeftMs === undefined) return "";
    return `${(props.castTimeLeftMs / 1000).toFixed(1)}с`;
  });

  const mechanicTagText = computed(() => {
    if (!hasCast.value) return "";

    if (props.castRequiredTag === "block") return "Блокируемое";
    if (props.castDebuffRequiresCleanse || props.castCategory === "cleansable-debuff") {
      return "Очищаемое";
    }
    if (props.castDispellable || props.castCategory === "dispellable-buff") {
      return "Рассеиваемое";
    }
    if (props.castCanBeInterrupted || props.castCategory === "interruptible") {
      return "Прерываемое";
    }
    return "";
  });
</script>

<template>
  <div class="boss-card">
    <div class="boss-card__left">
      <div class="boss-card__avatar">
        <img
          v-if="image"
          :src="image"
          :alt="name"
          class="boss-card__avatar-img"
          width="80"
          height="80"
          decoding="async"
          fetchpriority="high"
        />
        <svg
          v-else
          class="boss-card__avatar-placeholder"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="48" height="48" rx="8" fill="rgba(255,255,255,0.04)" />
          <circle
            cx="24"
            cy="18"
            r="7"
            stroke="rgba(255,255,255,0.2)"
            stroke-width="1.5"
          />
          <path
            d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14"
            stroke="rgba(255,255,255,0.2)"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <div class="boss-card__attack-icon">
        <img
          src="/images/bosses/icons/common/attack.png"
          alt="Атака"
          class="boss-card__attack-icon-img"
          width="48"
          height="48"
          decoding="async"
        />
        <CooldownOverlay
          :progress="attackCooldownProgress"
          :cooldown-text="attackCooldownText"
        />
      </div>
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
      <div class="boss-card__cast-slot">
        <div v-if="hasCast" class="boss-card__cast">
          <div class="boss-card__cast-header">
            <div class="boss-card__cast-icon">
              <img
                v-if="currentAbilityIcon"
                :src="currentAbilityIcon"
                :alt="currentAbilityName || 'Способность босса'"
                width="32"
                height="32"
                decoding="async"
              />
              <svg
                v-else
                class="boss-card__cast-icon-fallback"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" fill="rgba(15,23,42,0.9)" />
                <path
                  d="M12 6v6l4 2"
                  stroke="rgba(248,250,252,0.9)"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="boss-card__cast-info">
              <div class="boss-card__cast-name">
                <span class="boss-card__cast-name-text">
                  {{ currentAbilityName || "Кастует способность" }}
                </span>
                <span
                  v-if="mechanicTagText"
                  class="boss-card__cast-tag boss-card__cast-tag--mechanic"
                >
                  {{ mechanicTagText }}
                </span>
              </div>
              <div class="boss-card__cast-bar-wrapper">
                <div class="boss-card__cast-bar-background">
                  <div
                    class="boss-card__cast-bar"
                    :style="{ width: `${castProgressPercent}%` }"
                  />
                </div>
                <div class="boss-card__cast-time">
                  {{ castTimeText }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="boss-card__effects-wrap">
        <EffectSlots
          :buffs="buffs ?? []"
          :debuffs="debuffs ?? []"
          class="boss-card__effects"
        />
      </div>
    </div>
  </div>
</template>
