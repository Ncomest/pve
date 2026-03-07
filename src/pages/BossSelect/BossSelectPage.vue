<script setup lang="ts">
import { ref, computed } from "vue";
import { useBossSelect } from "@/features/bossSelect/model/useBossSelect";
import { BossSelectEntry } from "@/features/bossSelect/ui";
import type { Boss } from "@/entities/boss/model";
import bossesData from "@/entities/boss/bosses.json";
import resourcesData from "@/entities/boss/resources.json";
import "./BossSelectPage.scss";

type TabType = "bosses" | "resources";

const activeTab = ref<TabType>("bosses");

const allBosses = bossesData as Boss[];
const allResources = resourcesData as Boss[];

const {
  selectedInfo,
  handleSelectBoss,
  openInfo,
  buffRows,
  debuffRows,
} = useBossSelect();

const bosses = computed(() => {
  return activeTab.value === "bosses" ? allBosses : allResources;
});

</script>

<template>
  <div class="boss-select-page">
    <h1 class="boss-select-page__title">Выбор противника</h1>
    <p class="boss-select-page__subtitle">Выбери вкладку и противника для битвы.</p>

    <div class="boss-select-page__tabs">
      <button
        type="button"
        class="boss-select-page__tab"
        :class="{ 'boss-select-page__tab--active': activeTab === 'bosses' }"
        @click="activeTab = 'bosses'"
      >
        Боссы
      </button>
      <button
        type="button"
        class="boss-select-page__tab"
        :class="{ 'boss-select-page__tab--active': activeTab === 'resources' }"
        @click="activeTab = 'resources'"
      >
        Ресурсы
      </button>
    </div>

    <div class="boss-select-page__list">
      <BossSelectEntry
        v-for="boss in bosses"
        :key="boss.id"
        :boss="boss"
        :is-info-open="selectedInfo?.id === boss.id"
        :buff-rows="buffRows"
        :debuff-rows="debuffRows"
        @select="handleSelectBoss"
        @toggle-info="openInfo"
      />
    </div>

  </div>
</template>
