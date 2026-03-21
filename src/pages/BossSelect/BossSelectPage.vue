<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  watchEffect,
} from "vue";
import { useBossSelect } from "@/features/bossSelect/model/useBossSelect";
import { BossSelectEntry } from "@/features/bossSelect/ui";
import type { Boss } from "@/entities/boss/model";
import bossesData from "@/entities/boss/bosses.json";
import resourcesData from "@/entities/boss/resources.json";
import "./BossSelectPage.scss";

type TabType = "bosses" | "resources";

/** Совпадает с мобильным брейкпоинтом в BossSelectPage.scss */
const MOBILE_MAX_WIDTH = "640px";
const PAGE_SIZE = 6;

const activeTab = ref<TabType>("bosses");

const allBosses = bossesData as Boss[];
const allResources = resourcesData as Boss[];

const isMobile = ref(false);
let mobileMql: MediaQueryList | null = null;

function syncMobile() {
  isMobile.value = window.matchMedia(
    `(max-width: ${MOBILE_MAX_WIDTH})`,
  ).matches;
}

const visibleCount = ref(PAGE_SIZE);

const {
  selectedInfo,
  handleSelectBoss,
  openInfo,
} = useBossSelect();

const fullListForTab = computed(() =>
  activeTab.value === "bosses" ? allBosses : allResources,
);

const bosses = computed(() => {
  const list = fullListForTab.value;
  if (!isMobile.value) {
    return list;
  }
  return list.slice(0, visibleCount.value);
});

const hasMoreBosses = computed(() => {
  if (!isMobile.value) {
    return false;
  }
  return visibleCount.value < fullListForTab.value.length;
});

const loadingMore = ref(false);

function loadMore() {
  if (!isMobile.value || loadingMore.value) {
    return;
  }
  const list = fullListForTab.value;
  if (visibleCount.value >= list.length) {
    return;
  }
  loadingMore.value = true;
  visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, list.length);
  void nextTick(() => {
    loadingMore.value = false;
  });
}

watch(activeTab, () => {
  visibleCount.value = PAGE_SIZE;
});

watch(isMobile, (mobile) => {
  if (mobile) {
    visibleCount.value = PAGE_SIZE;
  }
});

const loadMoreSentinel = ref<HTMLElement | null>(null);

watchEffect((onCleanup) => {
  if (!isMobile.value || !hasMoreBosses.value) {
    return;
  }
  const el = loadMoreSentinel.value;
  if (!el) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore();
      }
    },
    { root: null, rootMargin: "320px", threshold: 0 },
  );
  observer.observe(el);
  onCleanup(() => observer.disconnect());
});

onMounted(() => {
  syncMobile();
  mobileMql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH})`);
  mobileMql.addEventListener("change", syncMobile);
});

onUnmounted(() => {
  mobileMql?.removeEventListener("change", syncMobile);
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
        @select="handleSelectBoss"
        @toggle-info="openInfo"
      />
      <div
        v-if="hasMoreBosses"
        ref="loadMoreSentinel"
        class="boss-select-page__load-more-sentinel"
        aria-hidden="true"
      />
    </div>

  </div>
</template>
