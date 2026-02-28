<script setup lang="ts">
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { usePlayerHp } from "@/features/character/model/usePlayerHp";
import { useCharacterStore } from "@/app/store/character";
import { computed } from "vue";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import { useHeroAvatar } from "@/features/inventory/model/useHeroAvatar";
import "./HeroStats.scss";

const { level, xp, xpToNext, percentToNext } = usePlayerProgress();
const characterStore = useCharacterStore();

const getMaxHp = () => {
  const bonusHp = (level.value - 1) * 20;
  return PLAYER_CHARACTER.stats.maxHp + bonusHp + characterStore.equipmentStats.hp;
};

const { useRealtimeHp } = usePlayerHp();
const { currentHp, currentMaxHp, hpPct } = useRealtimeHp(getMaxHp);

const isFullHp = computed(() => currentHp.value >= currentMaxHp.value);

const { avatars, selectedAvatarId, selectedSrc, selectAvatar } = useHeroAvatar();

const currentAvatarSrc = computed(() => selectedSrc());
</script>

<template>
  <section class="hero-stats">
    <!-- Аватар персонажа -->
    <div class="hero-stats__avatar-wrap">
      <div class="hero-stats__avatar">
        <img
          v-if="currentAvatarSrc"
          :src="currentAvatarSrc"
          alt="Аватар героя"
          class="hero-stats__avatar-img"
        />
        <!-- SVG-заглушка если аватар не выбран -->
        <svg
          v-else
          class="hero-stats__avatar-svg"
          viewBox="0 0 64 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Герой"
        >
          <circle cx="32" cy="18" r="12" stroke="currentColor" stroke-width="2.5" fill="rgba(99,102,241,0.15)" />
          <path d="M10 68c0-12 9-22 22-22s22 10 22 22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <line x1="32" y1="46" x2="32" y2="58" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="32" y1="52" x2="22" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="32" y1="52" x2="42" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <!-- Выпадающий список выбора аватара -->
      <select
        class="hero-stats__avatar-select"
        :value="selectedAvatarId"
        @change="selectAvatar(($event.target as HTMLSelectElement).value)"
      >
        <option value="">— Без аватара —</option>
        <option v-for="avatar in avatars" :key="avatar.id" :value="avatar.id">
          {{ avatar.label }}
        </option>
      </select>
    </div>

    <div class="hero-stats__bars">
      <div class="hero-stats__level">{{ level }}</div>

      <div class="hero-stats__bars-tracks">
        <!-- Полоса здоровья -->
        <div class="hero-stats__bar-row">

          <span class="hero-stats__bar-label hero-stats__bar-label--hp">
            {{ currentHp }} / {{ currentMaxHp }}
            <span v-if="!isFullHp" class="hero-stats__regen-hint">+1/10с</span>
          </span>
          <div class="hero-stats__bar-wrap">
            <div
              class="hero-stats__bar hero-stats__bar--hp"
              :style="{ width: hpPct + '%' }"
            />
          </div>
        </div>

        <!-- Полоса опыта -->
        <div class="hero-stats__bar-row">

          <span class="hero-stats__bar-label hero-stats__bar-label--xp">
            {{ xp }} / {{ xpToNext }}
          </span>
          <div class="hero-stats__bar-wrap">
            <div
              class="hero-stats__bar hero-stats__bar--xp"
              :style="{ width: percentToNext + '%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="hero-stats__content">
      <div class="hero-stats__row">
        <span>Атака:</span>
        <span class="hero-stats__value">+{{ characterStore.equipmentStats.power }}</span>
      </div>
      <div class="hero-stats__row">
        <span>Скорость:</span>
        <span class="hero-stats__value">+{{ characterStore.equipmentStats.speed }}</span>
      </div>
      <div class="hero-stats__row">
        <span>Меткость:</span>
        <span class="hero-stats__value">
          +{{ Math.round(characterStore.equipmentStats.accuracy * 100) }}%
        </span>
      </div>
      <div class="hero-stats__row">
        <span>Крит:</span>
        <span class="hero-stats__value">
          +{{ Math.round(characterStore.equipmentStats.chanceCrit * 100) }}%
        </span>
      </div>
      <div class="hero-stats__row">
        <span>Здоровье:</span>
        <span class="hero-stats__value">+{{ characterStore.equipmentStats.hp }}</span>
      </div>
      <div class="hero-stats__row">
        <span>Броня:</span>
        <span class="hero-stats__value">+{{ characterStore.equipmentStats.armor }}</span>
      </div>
      <div class="hero-stats__row">
        <span>Уклонение:</span>
        <span class="hero-stats__value">+{{ characterStore.equipmentStats.evasion }}</span>
      </div>
    </div>
  </section>
</template>
