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
  SPEED_POINTS_TO_FRACTION,
  ARMOR_POINTS_TO_FRACTION,
} from "@/entities/item/lib/statPoints";
import { hpPerTickFromSpirit } from "@/features/character/model/usePlayerHp";
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import "./HeroStats.scss";

const { level, xp, xpToNext, percentToNext } = usePlayerProgress();
const characterStore = useCharacterStore();
const elixirsStore = useElixirsStore();

const base = PLAYER_CHARACTER.stats;
const eq = computed(() => characterStore.equipmentStats);

interface StatRow {
  label: string;
  base: number;
  bonus: number;
  fmt: (v: number) => string;
}

const statRows = computed<StatRow[]>(() => {
  const hpBonusFromLevel = (level.value - 1) * 20;
  const hpBonusTotal = hpBonusFromLevel + eq.value.hp + elixirsStore.activeHealthPercentBonusApplied;

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
  const equipAccuracy = eq.value.accuracy ?? 0;
  const equipCritDef = eq.value.critDefense ?? 0;
  const equipSpirit = eq.value.spirit ?? 0;
  const equipLifesteal = eq.value.lifesteal ?? 0;

  const powerBonusFromElixir = elixirPowerDelta;

  const critBeforeElixir = (base.chanceCrit ?? 0) + equipCrit;
  const critAfterElixir = Math.min(1, critBeforeElixir + elixirCritPercentBonus);
  const critDeltaFromElixir = critAfterElixir - critBeforeElixir;

  const evasionBeforeElixir = (base.evasion ?? 0) + equipEvasion;
  const evasionAfterElixir = Math.min(1, evasionBeforeElixir + elixirEvasionPercentBonus);
  const evasionDeltaFromElixir = evasionAfterElixir - evasionBeforeElixir;

  // В бою скорость переводится в долю (speedPointsToFraction) по формуле:
  // speedPoints = speed - 2, поэтому работаем в "очках скорости" (speedPoints).
  const baseSpeedPoints = Math.max(0, (base.speed ?? 2) - 2);
  const speedBeforePoints = baseSpeedPoints + equipSpeed;
  const speedBeforeFraction = speedPointsToFraction(speedBeforePoints);
  const speedAfterFraction = Math.min(1, speedBeforeFraction + elixirSpeedPercentBonus);
  const speedAfterPoints = speedAfterFraction / SPEED_POINTS_TO_FRACTION;
  const speedDeltaFromElixir = speedAfterPoints - speedBeforePoints;

  // В бою `armor_percent` применяется как прибавка к "доле снижения урона" (armorPointsToFraction),
  // затем снова переводится в очки брони с округлением.
  const armorBeforePoints = (base.armor ?? 0) + equipArmor;
  const armorBeforeFraction = armorPointsToFraction(armorBeforePoints);
  const armorAfterFraction = Math.min(0.9, armorBeforeFraction + elixirArmorPercentBonus);
  const armorAfterPoints = Math.round(armorAfterFraction / ARMOR_POINTS_TO_FRACTION);
  const armorDeltaFromElixir = armorAfterPoints - armorBeforePoints;

  return [
    {
      label: "Атака",
      base: base.power,
      bonus: equipPower + powerBonusFromElixir,
      fmt: (v) => String(v),
    },
    {
      label: "Здоровье",
      base: base.maxHp,
      bonus: hpBonusTotal,
      fmt: (v) => String(v),
    },
    {
      label: "Скорость",
      base: baseSpeedPoints,
      bonus: equipSpeed + speedDeltaFromElixir,
      fmt: (v) => (speedPointsToFraction(v) * 100).toFixed(2) + "%",
    },
    {
      label: "Крит",
      base: base.chanceCrit,
      bonus: equipCrit + critDeltaFromElixir,
      fmt: (v) => (v * 100).toFixed(2) + "%",
    },
    {
      label: "Броня",
      base: base.armor,
      // В `bonus` включаем и экипировку, и прирост от активного эликсира.
      bonus: equipArmor + armorDeltaFromElixir,
      fmt: (v) => (armorPointsToFraction(v) * 100).toFixed(2) + "%",
    },
    {
      label: "Уклонение",
      base: base.evasion,
      bonus: equipEvasion + evasionDeltaFromElixir,
      fmt: (v) => (v * 100).toFixed(2) + "%",
    },
    {
      label: "Меткость",
      base: base.accuracy ?? 0,
      bonus: equipAccuracy,
      fmt: (v) => (v * 100).toFixed(2) + "%",
    },
    {
      label: "Защита от крита",
      base: base.critDefense ?? 0,
      bonus: equipCritDef,
      fmt: (v) => (v * 100).toFixed(2) + "%",
    },
    {
      label: "Дух",
      base: base.spirit ?? 0,
      bonus: equipSpirit,
      fmt: (v) => String(Math.round(v)),
    },
    {
      label: "Самоисцеление",
      base: base.lifesteal ?? 0,
      bonus: equipLifesteal,
      fmt: (v) => (v * 100).toFixed(2) + "%",
    },
  ];
});

const getMaxHp = () => {
  const bonusHp = (level.value - 1) * 20;
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
          <span class="hero-stats__val hero-stats__val--base">{{ row.fmt(row.base) }}</span>
          <span v-if="row.bonus !== 0" class="hero-stats__val hero-stats__val--bonus">
            +{{ row.fmt(row.bonus) }}
          </span>
          <span class="hero-stats__val hero-stats__val--total">{{ row.fmt(row.base + row.bonus) }}</span>
        </span>
      </div>
    </div>
  </section>
</template>
