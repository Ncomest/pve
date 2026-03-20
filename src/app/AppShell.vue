<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from "vue-router";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { usePlayerHp } from "@/features/character/model/usePlayerHp";
import { useCharacterStore } from "@/app/store/character";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import { getElixirDefinition } from "@/features/elixirs/model/elixirs";

const { level, xp, xpToNext, percentToNext } = usePlayerProgress();
const characterStore = useCharacterStore();
characterStore.init();

const elixirsStore = useElixirsStore();

const getMaxHp = () => {
  const bonusHp = (level.value - 1) * 20;
  return (
    PLAYER_CHARACTER.stats.maxHp +
    bonusHp +
    characterStore.equipmentStats.hp +
    elixirsStore.activeHealthPercentBonusApplied
  );
};

const { useRealtimeHp } = usePlayerHp();
const { currentHp, currentMaxHp, hpPct } = useRealtimeHp(
  getMaxHp,
  () => elixirsStore.activeRegenWindow,
);
const isFullHp = computed(() => currentHp.value >= currentMaxHp.value);

// Оставшееся время считается от `Date.now()`. Чтобы UI всегда пересчитывался,
// делаем `nowMs` реактивным и обновляем раз в секунду.
const nowMs = ref(Date.now());
let nowTickerId: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  nowTickerId = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  if (nowTickerId !== null) window.clearInterval(nowTickerId);
});

const regenHintText = computed(() => {
  // Делаем вычисление зависимым от тика, чтобы оно обновлялось.
  nowMs.value;
  const isRegenActive = elixirsStore.activeRegenWindow != null;

  // Если HP полностью, убираем подсказку базового регена.
  // Но при активном “эликсире восстановления” показываем, чтобы было видно усиление.
  if (!isRegenActive && isFullHp.value) return "";

  const regenPer10s = isRegenActive ? 4 : 1;
  return `+${regenPer10s} ед / 10с`;
});

const formatRemainingTime = (msLeft: number) => {
  if (msLeft <= 0) return "0с";
  const totalSeconds = Math.ceil(msLeft / 1000);
  if (totalSeconds < 60) return `${totalSeconds}с`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const activeElixirDef = computed(() => {
  const id = elixirsStore.activeElixirId;
  if (!id) return null;
  return getElixirDefinition(id);
});

const elixirEndAt = computed(() => elixirsStore.activeElixirEndAt);
const elixirRemainingMs = computed(() => {
  const endAt = elixirEndAt.value;
  if (!endAt) return 0;
  // `Math.max` чтобы избежать отрицательных значений при округлениях.
  return Math.max(0, endAt - nowMs.value);
});
const elixirRemainingText = computed(() => formatRemainingTime(elixirRemainingMs.value));
const elixirShown = computed(() => {
  const endAt = elixirEndAt.value;
  if (!elixirsStore.activeElixirId || !endAt) return false;
  return nowMs.value < endAt;
});

function lerpColor(
  [r1, g1, b1]: [number, number, number],
  [r2, g2, b2]: [number, number, number],
  t: number,
): string {
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

const RED: [number, number, number] = [239, 68, 68];
const YELLOW: [number, number, number] = [234, 179, 8];
const GREEN: [number, number, number] = [34, 197, 94];

const hpBarStyle = computed(() => {
  const pct = Math.max(0, Math.min(100, hpPct.value));
  let color: string;
  if (pct <= 50) {
    color = lerpColor(RED, YELLOW, pct / 50);
  } else {
    color = lerpColor(YELLOW, GREEN, (pct - 50) / 50);
  }
  return {
    width: `${pct}%`,
    background: color,
  };
});

const route = useRoute();
const isBattlePage = computed(() => route.name === "battle");

const menuId = "app-burger-menu";
const isMenuOpen = ref(false);

watch(
  () => route.fullPath,
  () => {
    isMenuOpen.value = false;
  },
);
</script>

<template>
  <div class="app-root">
    <header v-if="!isBattlePage" class="app-header">
      <!-- Статус персонажа вместо логотипа -->
      <div class="char-status-column">
        <div class="char-status">
          <div class="char-status__level">
            <span class="char-status__level-value">{{ level }}</span>
            <span class="char-status__level-label">Ур.</span>
          </div>
          <div class="char-status__bars">
            <div class="char-status__bar-row">
              <div class="char-status__bar-track">
                <div class="char-status__bar char-status__bar--hp" :style="hpBarStyle" />
              </div>
              <span class="char-status__bar-text char-status__bar-text--hp">
                {{ currentHp }}&thinsp;/&thinsp;{{ currentMaxHp }}
                <span v-if="regenHintText" class="char-status__regen">{{ regenHintText }}</span>
              </span>
            </div>
            <div class="char-status__bar-row">
              <div class="char-status__bar-track">
                <div class="char-status__bar char-status__bar--xp" :style="{ width: percentToNext + '%' }" />
              </div>
              <span class="char-status__bar-text char-status__bar-text--xp">
                {{ xp }}&thinsp;/&thinsp;{{ xpToNext }} XP
              </span>
            </div>
          </div>
        </div>

        <div v-if="elixirShown" class="char-status__elixir char-status__elixir--below">
          <img
            :src="activeElixirDef?.icon ?? undefined"
            alt="Бафф"
            class="char-status__elixir-icon"
          />
          <span class="char-status__elixir-text">
            {{ activeElixirDef?.name }}: {{ elixirRemainingText }}
          </span>
        </div>
      </div>

      <nav class="app-nav app-nav--desktop">
        <!-- Кнопка Битва — квадратная с иконкой мечей -->
        <RouterLink to="/" class="nav-link nav-link--battle">
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M10 14 L19 5 L22 2 L21 5 L18 6 L14 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="21" y1="21" x2="14" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M14 14 L5 5 L2 2 L5 3 L6 6 L10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Битва</span>
        </RouterLink>

        <!-- Кнопка Торговец с иконкой -->
        <RouterLink to="/merchant" class="nav-link nav-link--merchant">
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/>
            <path d="M12 6v12M9 9h6M9 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Торговец</span>
        </RouterLink>

        <!-- Кнопка Крафт -->
        <RouterLink to="/craft" class="nav-link nav-link--craft">
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M4 20L10 14M7 7L10 4L20 14L17 17M4 10L7 7M14 20H20M17 17V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Крафт</span>
        </RouterLink>

        <!-- Кнопка Персонаж с иконкой -->
        <RouterLink to="/character" class="nav-link nav-link--character">
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="7" r="3.5" stroke="currentColor" stroke-width="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M17 12l1.5-1.5M19 10l1-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <span>Персонаж</span>
        </RouterLink>

        <!-- Кнопка Навыки -->
        <RouterLink to="/skills" class="nav-link nav-link--skills">
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 2L9 8l-6 1 4.5 4.5L6 19l6-3 6 3-1.5-5.5L21 9l-6-1-3-6z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Навыки</span>
        </RouterLink>

        <!-- Кнопка Обновление -->
        <RouterLink to="/update" class="nav-link nav-link--update">
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 3v6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Обновление</span>
        </RouterLink>
      </nav>

      <button
        type="button"
        class="app-burger"
        :aria-expanded="isMenuOpen"
        :aria-controls="menuId"
        @click="isMenuOpen = !isMenuOpen"
      >
        <svg class="app-burger__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 7h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path d="M4 12h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path d="M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>

      <div v-if="isMenuOpen" :id="menuId" class="app-burger-panel">
        <div v-if="elixirShown" class="app-burger-elixir">
          <img
            :src="activeElixirDef?.icon ?? undefined"
            alt="Бафф"
            class="app-burger-elixir__icon"
          />
          <div class="app-burger-elixir__text">
            <div class="app-burger-elixir__title">Бафф: {{ activeElixirDef?.name ?? "" }}</div>
            <div class="app-burger-elixir__time">{{ elixirRemainingText }}</div>
          </div>
        </div>

        <RouterLink
          to="/"
          class="nav-link nav-link--battle app-burger-panel__link"
          @click="isMenuOpen = false"
        >
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M10 14 L19 5 L22 2 L21 5 L18 6 L14 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="21" y1="21" x2="14" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M14 14 L5 5 L2 2 L5 3 L6 6 L10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Битва</span>
        </RouterLink>

        <RouterLink
          to="/merchant"
          class="nav-link nav-link--merchant app-burger-panel__link"
          @click="isMenuOpen = false"
        >
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/>
            <path d="M12 6v12M9 9h6M9 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Торговец</span>
        </RouterLink>

        <RouterLink
          to="/craft"
          class="nav-link nav-link--craft app-burger-panel__link"
          @click="isMenuOpen = false"
        >
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M4 20L10 14M7 7L10 4L20 14L17 17M4 10L7 7M14 20H20M17 17V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Крафт</span>
        </RouterLink>

        <RouterLink
          to="/character"
          class="nav-link nav-link--character app-burger-panel__link"
          @click="isMenuOpen = false"
        >
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="7" r="3.5" stroke="currentColor" stroke-width="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M17 12l1.5-1.5M19 10l1-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <span>Персонаж</span>
        </RouterLink>

        <RouterLink
          to="/skills"
          class="nav-link nav-link--skills app-burger-panel__link"
          @click="isMenuOpen = false"
        >
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 2L9 8l-6 1 4.5 4.5L6 19l6-3 6 3-1.5-5.5L21 9l-6-1-3-6z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Навыки</span>
        </RouterLink>

        <RouterLink
          to="/update"
          class="nav-link nav-link--update app-burger-panel__link"
          @click="isMenuOpen = false"
        >
          <svg class="nav-link__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 3v6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Обновление</span>
        </RouterLink>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss" scoped src="./AppShell.scss"></style>

