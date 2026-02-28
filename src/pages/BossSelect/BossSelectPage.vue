<script setup lang="ts">
import { useBossSelect } from "@/features/bossSelect/model/useBossSelect";
import { useBossLoot } from "@/features/bossSelect/model/useBossLoot";
import { useLootTooltip } from "@/features/bossSelect/model/useLootTooltip";
import { getBossLootItems } from "@/features/bossSelect/lib/getBossLoot";
import { BossSelectEntry, LootTooltipPopup } from "@/features/bossSelect/ui";
import "./BossSelectPage.scss";

const {
  bosses,
  selectedInfo,
  handleSelectBoss,
  openInfo,
  buffRows,
  debuffRows,
} = useBossSelect();

const { lootMap } = useBossLoot();
const { hoveredLoot, showLootTooltip, moveLootTooltip, hideLootTooltip } = useLootTooltip();
</script>

<template>
  <div class="boss-select-page">
    <h1 class="boss-select-page__title">Выбор босса</h1>
    <p class="boss-select-page__subtitle">Выбери противника для битвы.</p>

    <div class="boss-select-page__list">
      <BossSelectEntry
        v-for="boss in bosses"
        :key="boss.id"
        :boss="boss"
        :loot-items="getBossLootItems(boss, lootMap)"
        :is-info-open="selectedInfo?.id === boss.id"
        :buff-rows="buffRows"
        :debuff-rows="debuffRows"
        @select="handleSelectBoss"
        @toggle-info="openInfo"
        @loot-enter="(item, e) => showLootTooltip(e, item)"
        @loot-move="moveLootTooltip"
        @loot-leave="hideLootTooltip"
      />
    </div>

    <Teleport to="body">
      <LootTooltipPopup
        v-if="hoveredLoot"
        :item="hoveredLoot.item"
        :x="hoveredLoot.x"
        :y="hoveredLoot.y"
      />
    </Teleport>
  </div>
</template>
