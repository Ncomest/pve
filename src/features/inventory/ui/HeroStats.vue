<script setup lang="ts">
  import { useCharacterStore } from "@/app/store/character";
  import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
  import { computed } from "vue";
  import { PLAYER_CHARACTER } from "@/entities/character/model";
  import { buildHeroStatRows } from "@/entities/character/lib/combatStatDisplayRows";
  import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
  import "./HeroStats.scss";

  const characterStore = useCharacterStore();
  const elixirsStore = useElixirsStore();
  const { level } = usePlayerProgress();

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
</script>

<template>
  <section class="hero-stats">
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
        </span>
      </div>
    </div>
  </section>
</template>
