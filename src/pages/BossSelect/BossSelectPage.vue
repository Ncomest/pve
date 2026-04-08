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
import { loadBossCatalog } from "@/entities/boss/lib/loadBossCatalog";
import "./BossSelectPage.scss";

type TabType = "bosses" | "resources";

/** Совпадает с мобильным брейкпоинтом в BossSelectPage.scss */
const MOBILE_MAX_WIDTH = "640px";
const PAGE_SIZE = 6;

const activeTab = ref<TabType>("bosses");

const allBosses = ref<Boss[]>([]);
const allResources = ref<Boss[]>([]);
const catalogLoading = ref(true);

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
  inventoryWarningOpen,
  handleSelectBoss,
  openInfo,
  closeInventoryWarning,
} = useBossSelect();

const fullListForTab = computed(() =>
  activeTab.value === "bosses" ? allBosses.value : allResources.value,
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
  void loadBossCatalog().then((cat) => {
    allBosses.value = cat.bosses;
    allResources.value = cat.resources;
    catalogLoading.value = false;
  });
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

    <div
      v-if="catalogLoading"
      class="boss-select-page__catalog-loading"
      role="status"
    >
      Загрузка списка…
    </div>

    <div v-else class="boss-select-page__list">
      <BossSelectEntry
        v-for="boss in bosses"
        :key="boss.id"
        :boss="boss"
        :is-resource-boss="activeTab === 'resources'"
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

    <Teleport to="body">
      <div
        v-if="inventoryWarningOpen"
        class="boss-select-page__inventory-warning-overlay"
        @click.self="closeInventoryWarning"
      >
        <div class="boss-select-page__inventory-warning-modal">
          <div class="boss-select-page__inventory-warning-icon">⚠️</div>
          <h3 class="boss-select-page__inventory-warning-title">
            Недостаточно места в инвентаре
          </h3>
          <p class="boss-select-page__inventory-warning-text">
            Освободите хотя бы один слот в инвентаре, чтобы начать бой.
          </p>
          <button
            type="button"
            class="boss-select-page__inventory-warning-btn"
            @click="closeInventoryWarning"
          >
            Понятно
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
