<script setup lang="ts">
  import { RouterLink, RouterView, useRoute } from "vue-router";
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
  import { useCharacterStore } from "@/app/store/character";
  import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
  import { getElixirDefinition } from "@/features/elixirs/model/elixirs";
  import { useHeroAvatar } from "@/features/inventory/model/useHeroAvatar";

  const { level } = usePlayerProgress();
  const characterStore = useCharacterStore();
  characterStore.init();

  const elixirsStore = useElixirsStore();

  const { selectedSrc } = useHeroAvatar();
  const currentAvatarSrc = computed(() => selectedSrc());

  // Оставшееся время считается от `Date.now()`. Чтобы UI всегда пересчитывался,
  // делаем `nowMs` реактивным и обновляем раз в секунду.
  const nowMs = ref(Date.now());
  let nowTickerId: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    elixirsStore.clearExpiredElixirIfNeeded();
    nowTickerId = window.setInterval(() => {
      nowMs.value = Date.now();
      elixirsStore.clearExpiredElixirIfNeeded();
    }, 1000);
  });

  onBeforeUnmount(() => {
    if (nowTickerId !== null) window.clearInterval(nowTickerId);
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
  const elixirRemainingText = computed(() =>
    formatRemainingTime(elixirRemainingMs.value),
  );
  const elixirShown = computed(() => {
    const endAt = elixirEndAt.value;
    if (!elixirsStore.activeElixirId || !endAt) return false;
    return nowMs.value < endAt;
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
          <div class="char-status__avatar">
            <img
              v-if="currentAvatarSrc"
              :src="currentAvatarSrc"
              alt="Аватар героя"
              class="char-status__avatar-img"
              loading="lazy"
              decoding="async"
            />
            <div class="char-status__level">
              <span class="char-status__level-value">{{ level }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="elixirShown"
          class="char-status__elixir char-status__elixir--below"
        >
          <img
            :src="activeElixirDef?.icon ?? undefined"
            alt="Бафф"
            class="char-status__elixir-icon"
            width="18"
            height="18"
            decoding="async"
          />
          <span class="char-status__elixir-text">
            {{ activeElixirDef?.name }}: {{ elixirRemainingText }}
          </span>
        </div>
      </div>

      <nav class="app-nav app-nav--desktop">
        <!-- Кнопка Битва — квадратная с иконкой мечей -->
        <RouterLink to="/boss-select" class="nav-link nav-link--battle">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <line
              x1="3"
              y1="21"
              x2="10"
              y2="14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M10 14 L19 5 L22 2 L21 5 L18 6 L14 10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <line
              x1="21"
              y1="21"
              x2="14"
              y2="14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M14 14 L5 5 L2 2 L5 3 L6 6 L10 10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Битва</span>
        </RouterLink>

        <!-- Кнопка Торговец с иконкой -->
        <RouterLink to="/merchant" class="nav-link nav-link--merchant">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              stroke-width="1.8"
              fill="none"
            />
            <path
              d="M12 6v12M9 9h6M9 15h6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
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
        <RouterLink to="/" class="nav-link nav-link--character">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="7"
              r="3.5"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M17 12l1.5-1.5M19 10l1-1"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
          <span>Персонаж</span>
        </RouterLink>

        <!-- Кнопка Навыки -->
        <RouterLink to="/skills" class="nav-link nav-link--skills">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2L9 8l-6 1 4.5 4.5L6 19l6-3 6 3-1.5-5.5L21 9l-6-1-3-6z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Навыки</span>
        </RouterLink>

        <!-- Кнопка Обновление -->
        <RouterLink to="/update" class="nav-link nav-link--update">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21 12a9 9 0 1 1-2.64-6.36"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M21 3v6h-6"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Обновление</span>
        </RouterLink>

        <!-- Справка -->
        <RouterLink to="/info" class="nav-link nav-link--info">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M9.5 9.5a2.5 2.5 0 0 1 4.2-1.7c.6.6.8 1.3.8 2.2 0 1.5-1 2-2 2.5-.4.2-.5.5-.5 1V15"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="12" cy="17.5" r="0.9" fill="currentColor" />
          </svg>
          <span>Информация</span>
        </RouterLink>
      </nav>

      <button
        type="button"
        class="app-burger"
        :aria-expanded="isMenuOpen"
        :aria-controls="menuId"
        @click="isMenuOpen = !isMenuOpen"
      >
        <svg
          class="app-burger__icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 7h16"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M4 12h16"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M4 17h16"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <div v-if="isMenuOpen" :id="menuId" class="app-burger-panel">
        <p v-if="!elixirShown" class="app-burger-elixir--not-active">
          Нет активных эликсиров
        </p>
        <div v-if="elixirShown" class="app-burger-elixir">
          <img
            :src="activeElixirDef?.icon ?? undefined"
            alt="Бафф"
            class="app-burger-elixir__icon"
            width="34"
            height="34"
            decoding="async"
          />
          <div class="app-burger-elixir__text">
            <div class="app-burger-elixir__title">
              Бафф: {{ activeElixirDef?.name ?? "" }}
            </div>
            <div class="app-burger-elixir__time">{{ elixirRemainingText }}</div>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer v-if="!isBattlePage" class="app-footer">
      <nav class="app-slider">
        <!-- Кнопка Битва — квадратная с иконкой мечей -->
        <RouterLink to="/boss-select" class="nav-link nav-link--battle">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <line
              x1="3"
              y1="21"
              x2="10"
              y2="14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M10 14 L19 5 L22 2 L21 5 L18 6 L14 10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <line
              x1="21"
              y1="21"
              x2="14"
              y2="14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M14 14 L5 5 L2 2 L5 3 L6 6 L10 10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </RouterLink>

        <!-- Кнопка Торговец с иконкой -->
        <RouterLink to="/merchant" class="nav-link nav-link--merchant">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              stroke-width="1.8"
              fill="none"
            />
            <path
              d="M12 6v12M9 9h6M9 15h6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
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
        </RouterLink>

        <!-- Кнопка Персонаж с иконкой -->
        <RouterLink to="/" class="nav-link nav-link--character">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="7"
              r="3.5"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M17 12l1.5-1.5M19 10l1-1"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </RouterLink>

        <!-- Кнопка Навыки -->
        <RouterLink to="/skills" class="nav-link nav-link--skills">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2L9 8l-6 1 4.5 4.5L6 19l6-3 6 3-1.5-5.5L21 9l-6-1-3-6z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </RouterLink>

        <!-- Кнопка Обновление -->
        <RouterLink to="/update" class="nav-link nav-link--update">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21 12a9 9 0 1 1-2.64-6.36"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M21 3v6h-6"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </RouterLink>

        <!-- Справка -->
        <RouterLink to="/info" class="nav-link nav-link--info">
          <svg
            class="nav-link__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M9.5 9.5a2.5 2.5 0 0 1 4.2-1.7c.6.6.8 1.3.8 2.2 0 1.5-1 2-2 2.5-.4.2-.5.5-.5 1V15"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="12" cy="17.5" r="0.9" fill="currentColor" />
          </svg>
        </RouterLink>
      </nav>
    </footer>
  </div>
</template>

<style lang="scss" scoped src="./AppShell.scss"></style>
