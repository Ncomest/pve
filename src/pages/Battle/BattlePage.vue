<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useBattle } from "@/features/battle/model/useBattle";
import { useSkillsStore } from "@/app/store/skills";
import { ALL_ABILITIES } from "@/features/abilities/model/abilities";
import { buildHotkeyString } from "@/shared/lib/hotkey/buildHotkeyString";
import { CharacterCard } from "@/entities/character/ui";
import { BossCard } from "@/entities/boss/ui";
import {
  BattleAbilityBars,
  BattleLog,
  BattleResult,
  LootPanel,
} from "@/features/battle/ui";
import IconFlee from "@/shared/ui/icons/IconFlee.vue";
import DamageNumbers from "@/shared/ui/DamageNumbers/DamageNumbers.vue";
import "./BattlePage.scss";

const props = defineProps<{
  bossId?: string;
}>();

const router = useRouter();
const skillsStore = useSkillsStore();

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
  currentBossAbility,
  bossCastState,
  bossCastTimeLeftMs,
  bossCastTotalMs,
} = useBattle(() => props.bossId);

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
      <button type="button" class="battle-page__flee-btn" title="Сбежать с боя" @click="handleFlee">
        <IconFlee class="battle-page__flee-icon" />
        <span>Побег</span>
      </button>
    </header>

    <div class="battle-page__timer">{{ battleTimeFormatted }}</div>

    <div class="battle-page__arena">
      <div class="battle-page__card-wrap">
        <CharacterCard
          :name="player.name"
          :hp="player.stats.hp"
          :max-hp="player.stats.maxHp"
          :hp-percent="playerHpPercent"
          :power="playerPower"
          :chance-crit="player.stats.chanceCrit"
          :evasion="player.stats.evasion"
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
        />
        <DamageNumbers :numbers="bossDamageNumbers" />
      </div>
    </div>

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

    <BattleResult
      v-if="isBattleOver"
      :winner-text="winnerText"
      @replay="resetBattle"
      @go-to-boss-select="handleFlee"
    />

    <LootPanel
      v-if="showLoot && loot.length"
      :items="loot"
      @take-item="takeLootItem"
    />

    <BattleLog :lines="battleLog" />
  </div>
</template>
