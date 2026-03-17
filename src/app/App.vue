<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from "vue-router";
import { computed } from "vue";
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { usePlayerHp } from "@/features/character/model/usePlayerHp";
import { useCharacterStore } from "@/app/store/character";
import { PLAYER_CHARACTER } from "@/entities/character/model";

const { level, xp, xpToNext, percentToNext } = usePlayerProgress();
const characterStore = useCharacterStore();
characterStore.init();

const getMaxHp = () => {
  const bonusHp = (level.value - 1) * 20;
  return PLAYER_CHARACTER.stats.maxHp + bonusHp + characterStore.equipmentStats.hp;
};

const { useRealtimeHp } = usePlayerHp();
const { currentHp, currentMaxHp, hpPct } = useRealtimeHp(getMaxHp);

const isFullHp = computed(() => currentHp.value >= currentMaxHp.value);
const gold = computed(() => characterStore.gold ?? 0);

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
</script>

<template>
  <div class="app-root">
    <header v-if="!isBattlePage" class="app-header">
      <!-- Статус персонажа вместо логотипа -->
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
              <span v-if="!isFullHp" class="char-status__regen">+1/10с</span>
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

      <div class="app-header__gold">
        <img
          src="/images/currencies/coin.png"
          alt="Золото"
          class="app-header__gold-icon"
        />
        <span class="app-header__gold-value">{{ gold }}</span>
      </div>

      <nav class="app-nav">
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
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 20L10 14M7 7L10 4L20 14L17 17M4 10L7 7M14 20H20M17 17V20"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
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
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-root {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 32px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
}

.app-header__gold {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.25);
}

.app-header__gold-icon {
  width: 18px;
  height: 18px;
  color: #facc15;
}

.app-header__gold-value {
  font-size: 15px;
  font-weight: 600;
  color: #facc15;
}

/* ── Статус персонажа ── */
.char-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.char-status__level {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1.5px solid rgba(250, 204, 21, 0.5);
  border-radius: 6px;
  background: rgba(250, 204, 21, 0.07);
  flex-shrink: 0;
}

.char-status__level-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(250, 204, 21, 0.6);
  line-height: 1;
}

.char-status__level-value {
  font-size: 17px;
  font-weight: 700;
  color: #facc15;
  line-height: 1;
}

.char-status__bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.char-status__bar-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.char-status__bar-track {
  width: 160px;
  height: 7px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.char-status__bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.char-status__bar--hp {
  transition: width 0.3s ease-out, background 0.4s ease-out;
}

.char-status__bar--xp {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.char-status__bar-text {
  font-size: 11px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.65);
}

.char-status__bar-text--hp {
  color: rgba(252, 165, 165, 0.9);
}

.char-status__bar-text--xp {
  color: rgba(147, 197, 253, 0.85);
}

.char-status__regen {
  margin-left: 3px;
  font-size: 10px;
  color: rgba(134, 239, 172, 0.8);
}

/* ── Навигация ── */
.app-nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 40px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.04);
  transition: color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
  text-decoration: none;
}

.nav-link__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.22);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

/* Активная ссылка */
.nav-link.router-link-active {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

/* Битва — акцентный цвет при наведении */
.nav-link--battle:hover {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.08);
  box-shadow: 0 2px 14px rgba(251, 191, 36, 0.15);
}

.nav-link--battle.router-link-active {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.07);
}

/* Персонаж — синеватый акцент */
.nav-link--character:hover {
  color: #93c5fd;
  border-color: rgba(147, 197, 253, 0.35);
  background: rgba(147, 197, 253, 0.07);
  box-shadow: 0 2px 14px rgba(147, 197, 253, 0.12);
}

.nav-link--character.router-link-active {
  color: #93c5fd;
  border-color: rgba(147, 197, 253, 0.3);
  background: rgba(147, 197, 253, 0.06);
}

/* Навыки — фиолетовый акцент */
.nav-link--skills:hover {
  color: #c4b5fd;
  border-color: rgba(196, 181, 253, 0.35);
  background: rgba(196, 181, 253, 0.07);
  box-shadow: 0 2px 14px rgba(196, 181, 253, 0.12);
}

.nav-link--skills.router-link-active {
  color: #c4b5fd;
  border-color: rgba(196, 181, 253, 0.3);
  background: rgba(196, 181, 253, 0.06);
}

/* Крафт — бирюзовый акцент */
.nav-link--craft:hover {
  color: #5eead4;
  border-color: rgba(45, 212, 191, 0.4);
  background: rgba(45, 212, 191, 0.08);
  box-shadow: 0 2px 14px rgba(45, 212, 191, 0.15);
}

.nav-link--craft.router-link-active {
  color: #5eead4;
  border-color: rgba(45, 212, 191, 0.35);
  background: rgba(45, 212, 191, 0.07);
}

/* Торговец — золотой акцент */
.nav-link--merchant:hover {
  color: #facc15;
  border-color: rgba(250, 204, 21, 0.4);
  background: rgba(250, 204, 21, 0.08);
  box-shadow: 0 2px 14px rgba(250, 204, 21, 0.15);
}

.nav-link--merchant.router-link-active {
  color: #facc15;
  border-color: rgba(250, 204, 21, 0.35);
  background: rgba(250, 204, 21, 0.07);
}

.app-main {
  flex: 1;
  display: flex;
}
</style>
