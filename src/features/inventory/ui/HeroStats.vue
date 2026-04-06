<script setup lang="ts">
  import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
  // import { usePlayerHp } from "@/features/character/model/usePlayerHp";
  import { useCharacterStore } from "@/app/store/character";
  import { computed } from "vue";
  import { PLAYER_CHARACTER } from "@/entities/character/model";
  import { useHeroAvatar } from "@/features/inventory/model/useHeroAvatar";
  import { buildHeroStatRows } from "@/entities/character/lib/combatStatDisplayRows";
  // import { hpPerTickFromSpirit } from "@/features/character/model/usePlayerHp";
  import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
  // import { LEVEL_HP_PER_LEVEL } from "@/entities/character/lib/playerStatAggregation";
  import "./HeroStats.scss";

  const { level, xp, xpToNext, percentToNext } = usePlayerProgress();
  const characterStore = useCharacterStore();
  const elixirsStore = useElixirsStore();

  const statRows = computed(() =>
    buildHeroStatRows({
      base: PLAYER_CHARACTER.stats,
      level: level.value,
      equipment: characterStore.equipmentStats,
      raw: characterStore.equipmentRawPoints,
      elixirDef: elixirsStore.activeElixirDef,
      healthPercentBonusHp: elixirsStore.activeHealthPercentBonusApplied,
    }),
  );
  const { avatars, selectedAvatarId, selectedSrc, selectAvatar } =
    useHeroAvatar();

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
          width="90"
          height="90"
          loading="lazy"
          decoding="async"
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
          <circle
            cx="32"
            cy="18"
            r="12"
            stroke="currentColor"
            stroke-width="2.5"
            fill="rgba(99,102,241,0.15)"
          />
          <path
            d="M10 68c0-12 9-22 22-22s22 10 22 22"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
          <line
            x1="32"
            y1="46"
            x2="32"
            y2="58"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <line
            x1="32"
            y1="52"
            x2="22"
            y2="62"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <line
            x1="32"
            y1="52"
            x2="42"
            y2="62"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
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
      <div v-for="row in statRows" :key="row.label" class="hero-stats__row">
        <span class="hero-stats__row-label">{{ row.label }}:</span>
        <span class="hero-stats__row-values">
          <template v-if="row.kind === 'pair'">
            <span class="hero-stats__val hero-stats__val--muted">{{
              row.fromGear
            }}</span>
            <span class="hero-stats__val hero-stats__val--total">{{
              Math.round(row.total)
            }}</span>
          </template>
          <template v-else-if="row.kind === 'percent'">
            <span class="hero-stats__val hero-stats__val--muted">{{
              row.gearPoints
            }}</span>
            <span class="hero-stats__val hero-stats__val--total">{{
              row.pct
            }}</span>
          </template>
          <template v-else>
            <span class="hero-stats__val hero-stats__val--muted">{{
              row.gearPoints
            }}</span>
            <span class="hero-stats__val hero-stats__val--total">{{
              row.hpPerSec
            }}</span>
          </template>
        </span>
      </div>
    </div>
  </section>
</template>
