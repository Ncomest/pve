<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useBattle } from "@/features/battle/model/useBattle";
import { useSkillsStore } from "@/app/store/skills";
import { useCharacterStore } from "@/app/store/character";
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import {
  buildBossStatRows,
  buildHeroStatRows,
} from "@/entities/character/lib/combatStatDisplayRows";
import { ALL_ABILITIES } from "@/features/abilities/model/abilities";
import { buildHotkeyString } from "@/shared/lib/hotkey/buildHotkeyString";
import { CharacterCard } from "@/entities/character/ui";
import { BossCard } from "@/entities/boss/ui";
import {
  BattleAbilityBars,
  BattleLog,
  BattleResult,
} from "@/features/battle/ui";
import IconFlee from "@/shared/ui/icons/IconFlee.vue";
import DamageNumbers from "@/shared/ui/DamageNumbers/DamageNumbers.vue";
import "./BattlePage.scss";

const props = defineProps<{
  bossId?: string;
}>();

const router = useRouter();
const skillsStore = useSkillsStore();
const characterStore = useCharacterStore();
const playerProgress = usePlayerProgress();
const elixirsStore = useElixirsStore();

const {
  player,
  boss,
  battleLog,
  isBattleOver,
  winnerText,
  playerHpPercent,
  bossHpPercent,
  isAbilityReady,
  abilityCooldownText,
  cooldownLeftMs,
  ownCooldownLeftMs,
  effectiveMaxCooldownMs,
  handleAbility,
  resetBattle,
  powerBoostLeftMs,
  powerBoostValue,
  playerPower,
  playerEffectiveCrit,
  playerEffectiveEvasion,
  playerEffectiveSpeed,
  playerArmor,
  bossEffectiveArmor,
  loot,
  showLoot,
  takeLootItem,
  playerBuffs,
  playerDebuffs,
  bossBuffs,
  bossDebuffs,
  comboPoints,
  bossDamageNumbers,
  playerDamageNumbers,
  bossAttackCooldownLeft,
  bossAttackCooldownMax,
  battleTimeFormatted,
  playerDps,
  incomingDps,
  currentBossAbility,
  bossCastState,
  bossCastTimeLeftMs,
  bossCastTotalMs,
  selectedBoss,
} = useBattle(() => props.bossId);

const playerStatRows = computed(() =>
  buildHeroStatRows(
    {
      base: PLAYER_CHARACTER.stats,
      level: playerProgress.level.value,
      equipment: characterStore.equipmentStats,
      raw: characterStore.equipmentRawPoints,
      elixirDef: elixirsStore.activeElixirDef,
      healthPercentBonusHp: elixirsStore.activeHealthPercentBonusApplied,
    },
    {
      attackTotal: playerPower.value,
      maxHpTotal: player.stats.maxHp,
      critFraction: playerEffectiveCrit.value,
      evasionFraction: playerEffectiveEvasion.value,
      speedStatTotal: playerEffectiveSpeed.value,
      armorPoints: playerArmor.value,
      accuracyFraction: player.stats.accuracy ?? 0,
      critDefenseFraction: player.stats.critDefense ?? 0,
      lifestealFraction: player.stats.lifesteal ?? 0,
    },
  ),
);

const bossStatRows = computed(() =>
  buildBossStatRows(
    selectedBoss.value?.stats ?? boss.stats,
    boss.stats,
    bossEffectiveArmor.value,
  ),
);

const powerBoostText = computed(() => {
  if (powerBoostLeftMs.value <= 0) return "";
  return `+${powerBoostValue.value} (${(powerBoostLeftMs.value / 1000).toFixed(1)}с)`;
});

const currentBossAbilityName = computed(() =>
  bossCastState.value === "casting" && currentBossAbility.value
    ? currentBossAbility.value.name
    : undefined,
);

const currentBossAbilityIcon = computed(() =>
  bossCastState.value === "casting" && currentBossAbility.value
    ? currentBossAbility.value.icon
    : undefined,
);

const currentBossAbilityCategory = computed(() =>
  bossCastState.value === "casting" && currentBossAbility.value
    ? currentBossAbility.value.category
    : undefined,
);

const currentBossAbilityCanBeInterrupted = computed(() =>
  bossCastState.value === "casting" && currentBossAbility.value
    ? currentBossAbility.value.canBeInterrupted
    : undefined,
);

const currentBossAbilityRequiredTag = computed(() =>
  bossCastState.value === "casting" && currentBossAbility.value
    ? currentBossAbility.value.requiredDefensiveTag
    : undefined,
);

const currentBossAbilityDebuffType = computed(() =>
  bossCastState.value === "casting" && currentBossAbility.value
    ? currentBossAbility.value.debuffType
    : undefined,
);

const isVictory = computed(
  () => isBattleOver.value && boss.stats.hp <= 0 && player.stats.hp > 0,
);

const handleFlee = () => router.push({ name: "boss-select" });

function onKeyDown(event: KeyboardEvent) {
  if (isBattleOver.value) return;
  // Игнорируем, если фокус в инпуте/текстовом поле
  const target = event.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

  const hotkey = buildHotkeyString(event);
  for (const panel of skillsStore.panels) {
    for (const slot of panel) {
      if (slot.abilityId && slot.hotkey && slot.hotkey.toLowerCase() === hotkey.toLowerCase()) {
        const ability = ALL_ABILITIES.find((a) => a.id === slot.abilityId);
        if (ability && isAbilityReady(slot.abilityId)) {
          event.preventDefault();
          handleAbility(ability);
        }
        return;
      }
    }
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <div class="battle-page">
    <header class="battle-page__header">
      <h1 class="battle-page__title">Битва</h1>
      <div class="battle-page__timer">{{ battleTimeFormatted }}</div>
      <button type="button" class="battle-page__flee-btn" title="Сбежать с боя" @click="handleFlee">
        <IconFlee class="battle-page__flee-icon" />
        <span>Побег</span>
      </button>
    </header>

    <div class="battle-page__dps">
      <div class="battle-page__dps-item">
        <span class="battle-page__dps-label">Урон по боссу</span>
        <span class="battle-page__dps-value">{{ playerDps.toFixed(1) }}/с</span>
      </div>
      <div class="battle-page__dps-item">
        <span class="battle-page__dps-label">Урон от босса</span>
        <span class="battle-page__dps-value">{{ incomingDps.toFixed(1) }}/с</span>
      </div>
    </div>


    <div class="battle-page__arena">
      <div class="battle-page__card-wrap">
        <CharacterCard
          :name="player.name"
          :hp="player.stats.hp"
          :max-hp="player.stats.maxHp"
          :hp-percent="playerHpPercent"
          :power="playerPower"
          :chance-crit="playerEffectiveCrit"
          :evasion="playerEffectiveEvasion"
          :power-boost-text="powerBoostText"
          :buffs="playerBuffs"
          :debuffs="playerDebuffs"
          :combo-points="comboPoints"
        />
        <DamageNumbers :numbers="playerDamageNumbers" />
      </div>
      <div class="battle-page__card-wrap">
        <BossCard
          :name="boss.name"
          :level="boss.level"
          :hp="boss.stats.hp"
          :max-hp="boss.stats.maxHp"
          :hp-percent="bossHpPercent"
          :power="boss.stats.power"
          :chance-crit="boss.stats.chanceCrit"
          :evasion="boss.stats.evasion"
          :image="boss.image"
          :buffs="bossBuffs"
          :debuffs="bossDebuffs"
          :attack-cooldown-left="bossAttackCooldownLeft"
          :attack-cooldown-max="bossAttackCooldownMax"
          :current-ability-name="currentBossAbilityName"
          :current-ability-icon="currentBossAbilityIcon"
          :cast-time-left-ms="bossCastState === 'casting' ? bossCastTimeLeftMs : 0"
          :cast-total-ms="bossCastState === 'casting' ? bossCastTotalMs : 0"
          :cast-category="currentBossAbilityCategory"
          :cast-can-be-interrupted="currentBossAbilityCanBeInterrupted"
          :cast-required-tag="currentBossAbilityRequiredTag"
          :cast-debuff-type="currentBossAbilityDebuffType"
        />
        <DamageNumbers :numbers="bossDamageNumbers" />
      </div>
    </div>

    <div class="battle-page__abilities-row">
      <div class="battle-page__stats-panel battle-page__stats-panel--character">
        <h3 class="battle-page__stats-title">Герой</h3>
        <dl class="battle-page__stats-list">
          <div
            v-for="row in playerStatRows"
            :key="'hero-' + row.label"
            class="battle-page__stats-row"
          >
            <dt>{{ row.label }}</dt>
            <dd class="battle-page__stats-dd">
              <template v-if="row.kind === 'pair'">
                <span class="battle-page__stats-muted">{{ row.fromGear }}</span>
                <span class="battle-page__stats-strong">{{ Math.round(row.total) }}</span>
              </template>
              <template v-else-if="row.kind === 'percent'">
                <span class="battle-page__stats-muted">{{ row.gearPoints }}</span>
                <span class="battle-page__stats-strong">{{ row.pct }}</span>
              </template>
            </dd>
          </div>
        </dl>
      </div>
      <div class="battle-page__abilities-center">
        <BattleAbilityBars
          :panels="skillsStore.panels"
          :is-battle-over="isBattleOver"
          :is-ability-ready="isAbilityReady"
          :ability-cooldown-text="abilityCooldownText"
          :cooldown-left-ms="cooldownLeftMs"
          :own-cooldown-left-ms="ownCooldownLeftMs"
          :effective-max-cooldown-ms="effectiveMaxCooldownMs"
          @use-ability="handleAbility"
        />
      </div>
      <div class="battle-page__stats-panel battle-page__stats-panel--boss">
        <h3 class="battle-page__stats-title">{{ boss.name }}</h3>
        <dl class="battle-page__stats-list">
          <div
            v-for="row in bossStatRows"
            :key="'boss-' + row.label"
            class="battle-page__stats-row"
          >
            <dt>{{ row.label }}</dt>
            <dd class="battle-page__stats-dd">
              <template v-if="row.kind === 'pair'">
                <span class="battle-page__stats-muted">{{ row.fromGear }}</span>
                <span class="battle-page__stats-strong">{{ Math.round(row.total) }}</span>
              </template>
              <template v-else-if="row.kind === 'percent'">
                <span class="battle-page__stats-muted">{{ row.gearPoints }}</span>
                <span class="battle-page__stats-strong">{{ row.pct }}</span>
              </template>
            </dd>
          </div>
        </dl>
      </div>
    </div>
    <details class="battle-page__stats-mobile">
      <summary class="battle-page__stats-mobile-summary">Характеристики</summary>
      <div class="battle-page__stats-mobile-content">
        <div class="battle-page__stats-panel battle-page__stats-panel--character">
          <h3 class="battle-page__stats-title">Герой</h3>
          <dl class="battle-page__stats-list">
            <div
              v-for="row in playerStatRows"
              :key="'m-hero-' + row.label"
              class="battle-page__stats-row"
            >
              <dt>{{ row.label }}</dt>
              <dd class="battle-page__stats-dd">
                <template v-if="row.kind === 'pair'">
                  <span class="battle-page__stats-muted">{{ row.fromGear }}</span>
                  <span class="battle-page__stats-strong">{{ Math.round(row.total) }}</span>
                </template>
                <template v-else-if="row.kind === 'percent'">
                  <span class="battle-page__stats-muted">{{ row.gearPoints }}</span>
                  <span class="battle-page__stats-strong">{{ row.pct }}</span>
                </template>
              </dd>
            </div>
          </dl>
        </div>
        <div class="battle-page__stats-panel battle-page__stats-panel--boss">
          <h3 class="battle-page__stats-title">{{ boss.name }}</h3>
          <dl class="battle-page__stats-list">
            <div
              v-for="row in bossStatRows"
              :key="'m-boss-' + row.label"
              class="battle-page__stats-row"
            >
              <dt>{{ row.label }}</dt>
              <dd class="battle-page__stats-dd">
                <template v-if="row.kind === 'pair'">
                  <span class="battle-page__stats-muted">{{ row.fromGear }}</span>
                  <span class="battle-page__stats-strong">{{ Math.round(row.total) }}</span>
                </template>
                <template v-else-if="row.kind === 'percent'">
                  <span class="battle-page__stats-muted">{{ row.gearPoints }}</span>
                  <span class="battle-page__stats-strong">{{ row.pct }}</span>
                </template>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </details>

    <BattleResult
      v-if="isBattleOver"
      :winner-text="winnerText"
      :is-victory="isVictory"
      :loot="loot"
      :show-loot="showLoot"
      @take-item="takeLootItem"
      @replay="resetBattle"
      @go-to-boss-select="handleFlee"
      @continue="handleFlee"
    />

    <BattleLog :lines="battleLog" />
  </div>
</template>
