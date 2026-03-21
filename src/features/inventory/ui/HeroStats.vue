<script setup lang="ts">
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { usePlayerHp } from "@/features/character/model/usePlayerHp";
import { useCharacterStore } from "@/app/store/character";
import { computed } from "vue";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import { useHeroAvatar } from "@/features/inventory/model/useHeroAvatar";
import {
  speedPointsToFraction,
  armorPointsToFraction,
  accuracyPointsToFraction,
  critDefensePointsToFraction,
  lifestealPointsToFraction,
} from "@/entities/item/lib/statPoints";
import {
  playerSpeedBaseline,
  speedGearPointsFromTotalSpeedStat,
  applyElixirSpeedPercentToSpeedTotal,
  applyElixirArmorPercentToArmorPoints,
  LEVEL_HP_PER_LEVEL,
  LEVEL_POWER_PER_LEVEL,
} from "@/entities/character/lib/playerStatAggregation";
import { hpPerTickFromSpirit } from "@/features/character/model/usePlayerHp";
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import "./HeroStats.scss";

/** Интервал тика регенера HP вне боя (сек), см. `usePlayerHp`. */
const REGEN_TICK_SEC = 10;

const { level, xp, xpToNext, percentToNext } = usePlayerProgress();
const characterStore = useCharacterStore();
const elixirsStore = useElixirsStore();

const base = PLAYER_CHARACTER.stats;
const eq = computed(() => characterStore.equipmentStats);
const raw = computed(() => characterStore.equipmentRawPoints);

/** Итоговая доля 0..1 → строка вида «1%» / «0,25%». */
function fmtPctFromFraction(fraction: number): string {
  const p = Math.min(1, Math.max(0, fraction)) * 100;
  const rounded = Math.round(p * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}%`;
  return `${rounded.toFixed(2)}%`;
}

type StatRow =
  | {
      kind: "percent";
      label: string;
      gearPoints: number;
      pct: string;
    }
  | {
      kind: "pair";
      label: string;
      fromGear: number;
      total: number;
    }
  | {
      kind: "spirit";
      label: string;
      gearPoints: number;
      hpPerSec: string;
    };

const statRows = computed<StatRow[]>(() => {
  const hpBonusFromLevel = Math.max(0, level.value - 1) * LEVEL_HP_PER_LEVEL;
  const hpBonusTotal = hpBonusFromLevel + eq.value.hp + elixirsStore.activeHealthPercentBonusApplied;
  const maxHpTotal = base.maxHp + hpBonusTotal;

  const levelPowerBonus = Math.max(0, level.value - 1) * LEVEL_POWER_PER_LEVEL;

  const elixirDef = elixirsStore.activeElixirDef;
  const elixirPowerDelta = elixirDef?.kind === "power" ? elixirDef.powerDelta ?? 0 : 0;
  const elixirCritPercentBonus =
    elixirDef?.kind === "crit_percent" ? elixirDef.critPercentBonus ?? 0 : 0;
  const elixirSpeedPercentBonus =
    elixirDef?.kind === "speed_percent" ? elixirDef.speedPercentBonus ?? 0 : 0;
  const elixirEvasionPercentBonus =
    elixirDef?.kind === "evasion_percent" ? elixirDef.evasionPercentBonus ?? 0 : 0;
  const elixirArmorPercentBonus =
    elixirDef?.kind === "armor_percent" ? elixirDef.armorPercentBonus ?? 0 : 0;

  const equipPower = eq.value.power ?? 0;
  const equipCrit = eq.value.chanceCrit ?? 0;
  const equipSpeed = eq.value.speed ?? 0;
  const equipEvasion = eq.value.evasion ?? 0;
  const equipArmor = eq.value.armor ?? 0;

  const critBeforeElixir = (base.chanceCrit ?? 0) + equipCrit;
  const critAfterElixir = Math.min(1, critBeforeElixir + elixirCritPercentBonus);

  const evasionBeforeElixir = (base.evasion ?? 0) + equipEvasion;
  const evasionAfterElixir = Math.min(1, evasionBeforeElixir + elixirEvasionPercentBonus);

  const baselineSpeed = playerSpeedBaseline();
  const speedTotalBeforeElixir = (base.speed ?? baselineSpeed) + equipSpeed;
  const speedTotalAfterElixir = applyElixirSpeedPercentToSpeedTotal(
    speedTotalBeforeElixir,
    elixirSpeedPercentBonus,
  );
  const speedFractionTotal = speedPointsToFraction(
    speedGearPointsFromTotalSpeedStat(speedTotalAfterElixir),
  );

  const armorBeforePoints = (base.armor ?? 0) + equipArmor;
  const armorAfterPoints = applyElixirArmorPercentToArmorPoints(
    armorBeforePoints,
    elixirArmorPercentBonus,
  );
  const armorFractionTotal = armorPointsToFraction(armorAfterPoints);

  const accuracyTotal = Math.min(
    1,
    (base.accuracy ?? 0) + accuracyPointsToFraction(raw.value.accuracy),
  );
  const critDefTotal = Math.min(
    1,
    (base.critDefense ?? 0) + critDefensePointsToFraction(raw.value.critDefense),
  );
  const lifestealTotal = Math.min(
    1,
    (base.lifesteal ?? 0) + lifestealPointsToFraction(raw.value.lifesteal),
  );

  const gearSpirit = raw.value.spirit;
  const totalSpiritPoints =
    (base.spirit ?? 0) + gearSpirit + elixirsStore.activeSpiritElixirBonus;
  const hpPerTick = hpPerTickFromSpirit(totalSpiritPoints);
  const hpPerSec = hpPerTick / REGEN_TICK_SEC;
  const hpPerSecStr = `${hpPerSec.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })} HP/с`;

  return [
    {
      kind: "pair",
      label: "Атака",
      fromGear: equipPower,
      total: base.power + levelPowerBonus + equipPower + elixirPowerDelta,
    },
    {
      kind: "pair",
      label: "Здоровье",
      fromGear: eq.value.hp,
      total: maxHpTotal,
    },
    {
      kind: "percent",
      label: "Скорость",
      gearPoints: Math.round(raw.value.speed),
      pct: fmtPctFromFraction(speedFractionTotal),
    },
    {
      kind: "percent",
      label: "Крит",
      gearPoints: Math.round(raw.value.crit),
      pct: fmtPctFromFraction(critAfterElixir),
    },
    {
      kind: "percent",
      label: "Броня",
      gearPoints: Math.round(raw.value.armor),
      pct: fmtPctFromFraction(armorFractionTotal),
    },
    {
      kind: "percent",
      label: "Уклонение",
      gearPoints: Math.round(raw.value.evasion),
      pct: fmtPctFromFraction(evasionAfterElixir),
    },
    {
      kind: "percent",
      label: "Меткость",
      gearPoints: Math.round(raw.value.accuracy),
      pct: fmtPctFromFraction(accuracyTotal),
    },
    {
      kind: "percent",
      label: "Защита от крита",
      gearPoints: Math.round(raw.value.critDefense),
      pct: fmtPctFromFraction(critDefTotal),
    },
    {
      kind: "spirit",
      label: "Дух",
      gearPoints: Math.round(gearSpirit),
      hpPerSec: hpPerSecStr,
    },
    {
      kind: "percent",
      label: "Самоисцеление",
      gearPoints: Math.round(raw.value.lifesteal),
      pct: fmtPctFromFraction(lifestealTotal),
    },
  ];
});

const getMaxHp = () => {
  const bonusHp = Math.max(0, level.value - 1) * LEVEL_HP_PER_LEVEL;
  return (
    PLAYER_CHARACTER.stats.maxHp +
    bonusHp +
    characterStore.equipmentStats.hp +
    elixirsStore.activeHealthPercentBonusApplied
  );
};

const getSpiritPoints = () =>
  (PLAYER_CHARACTER.stats.spirit ?? 0) + (characterStore.equipmentStats.spirit ?? 0);

const { useRealtimeHp } = usePlayerHp();
const { currentHp, currentMaxHp, hpPct } = useRealtimeHp(
  getMaxHp,
  () => elixirsStore.activeRegenWindow,
  getSpiritPoints,
  () => elixirsStore.activeSpiritElixirBonus,
);

const isFullHp = computed(() => currentHp.value >= currentMaxHp.value);
const regenHintText = computed(() => {
  if (isFullHp.value) return "";
  const perTick = hpPerTickFromSpirit(getSpiritPoints() + elixirsStore.activeSpiritElixirBonus);
  return `+${perTick}/10с`;
});

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
            <span v-if="regenHintText" class="hero-stats__regen-hint">{{ regenHintText }}</span>
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
      <div
        v-for="row in statRows"
        :key="row.label"
        class="hero-stats__row"
      >
        <span class="hero-stats__row-label">{{ row.label }}:</span>
        <span class="hero-stats__row-values">
          <template v-if="row.kind === 'pair'">
            <span class="hero-stats__val hero-stats__val--muted">{{ row.fromGear }}</span>
            <span class="hero-stats__val hero-stats__val--total">{{ Math.round(row.total) }}</span>
          </template>
          <template v-else-if="row.kind === 'percent'">
            <span class="hero-stats__val hero-stats__val--muted">{{ row.gearPoints }}</span>
            <span class="hero-stats__val hero-stats__val--total">{{ row.pct }}</span>
          </template>
          <template v-else>
            <span class="hero-stats__val hero-stats__val--muted">{{ row.gearPoints }}</span>
            <span class="hero-stats__val hero-stats__val--total">{{ row.hpPerSec }}</span>
          </template>
        </span>
      </div>
    </div>
  </section>
</template>
