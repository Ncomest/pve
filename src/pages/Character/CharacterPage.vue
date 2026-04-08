<script setup lang="ts">
  import { computed, onUnmounted, ref } from "vue";
  import type { Stats } from "@/entities/boss/model";
  import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
  import { useHeroAvatar } from "@/features/inventory/model/useHeroAvatar";
  import { CLASSES } from "@/features/abilities/model/classes/classes";
  import { RACES } from "@/features/character/model/race";
  import "./CharacterPage.scss";

  const { level, xp, xpToNext, percentToNext } = usePlayerProgress();
  const { avatars, selectedAvatarId, selectedSrc, selectAvatar } = useHeroAvatar();

  const HERO_CLASS_STORAGE_KEY = "hero-class";
  const HERO_RACE_STORAGE_KEY = "hero-race";
  const HERO_NAME_STORAGE_KEY = "hero-name";

  const savedClassId = localStorage.getItem(HERO_CLASS_STORAGE_KEY) ?? "";
  const savedRaceId = localStorage.getItem(HERO_RACE_STORAGE_KEY) ?? "";
  const savedHeroName = localStorage.getItem(HERO_NAME_STORAGE_KEY) ?? "";

  const classOptions = CLASSES;
  const raceOptions = RACES;
  const selectedClassId = ref<string>(
    classOptions.some((item) => item.id === savedClassId) ? savedClassId : "",
  );
  const selectedRaceId = ref<string>(
    raceOptions.some((item) => item.id === savedRaceId) ? savedRaceId : "",
  );
  const heroName = ref<string>(savedHeroName);
  const heroNameDraft = ref<string>(savedHeroName);
  const isApplyModalOpen = ref(false);
  let applyModalTimer: ReturnType<typeof setTimeout> | null = null;

  function selectClass(classId: string) {
    selectedClassId.value = classId;
    if (classId) {
      localStorage.setItem(HERO_CLASS_STORAGE_KEY, classId);
    } else {
      localStorage.removeItem(HERO_CLASS_STORAGE_KEY);
    }
  }

  function selectRace(raceId: string) {
    selectedRaceId.value = raceId;
    if (raceId) {
      localStorage.setItem(HERO_RACE_STORAGE_KEY, raceId);
    } else {
      localStorage.removeItem(HERO_RACE_STORAGE_KEY);
    }
  }

  function applyHeroName() {
    const trimmedName = heroNameDraft.value.trim();
    heroName.value = trimmedName;
    if (trimmedName) {
      localStorage.setItem(HERO_NAME_STORAGE_KEY, trimmedName);
    } else {
      localStorage.removeItem(HERO_NAME_STORAGE_KEY);
    }
  }

  function applyCharacterSettings() {
    applyHeroName();
    isApplyModalOpen.value = true;

    if (applyModalTimer) {
      clearTimeout(applyModalTimer);
    }

    applyModalTimer = setTimeout(() => {
      isApplyModalOpen.value = false;
      applyModalTimer = null;
    }, 1800);
  }

  const currentAvatarSrc = computed(() => selectedSrc());
  const selectedClass = computed(
    () => classOptions.find((item) => item.id === selectedClassId.value) ?? null,
  );
  const selectedRace = computed(
    () => raceOptions.find((item) => item.id === selectedRaceId.value) ?? null,
  );

  const statLabelMap: Record<keyof Stats, string> = {
    hp: "HP",
    maxHp: "Макс. HP",
    power: "Сила атаки",
    chanceCrit: "Шанс крита",
    evasion: "Уклонение",
    speed: "Скорость",
    armor: "Броня",
    accuracy: "Меткость",
    critDefense: "Защита от крита",
    lifesteal: "Самоисцеление",
  };
  const percentStats: (keyof Stats)[] = [
    "chanceCrit",
    "evasion",
    "speed",
    "accuracy",
    "critDefense",
    "lifesteal",
  ];
  const raceBonusRows = computed(() => {
    const bonus = selectedRace.value?.bonus;
    if (!bonus) return [];
    return Object.entries(bonus).map(([key, value]) => {
      const statKey = key as keyof Stats;
      const numericValue = typeof value === "number" ? value : 0;
      const isPercent = percentStats.includes(statKey);
      const formattedValue = isPercent
        ? `+${Math.round(numericValue * 100)}%`
        : `+${numericValue}`;
      return {
        key,
        label: statLabelMap[statKey] ?? key,
        value: formattedValue,
      };
    });
  });

  onUnmounted(() => {
    if (applyModalTimer) {
      clearTimeout(applyModalTimer);
      applyModalTimer = null;
    }
  });
</script>

<template>
  <section class="character-page">
    <h1 class="character-page__title">Персонаж</h1>

    <div class="character-page__layout">
      <div class="character-page__left character-page__card">
        <div class="character-page__controls">
          <div class="character-page__name-row">
            <input
              v-model="heroNameDraft"
              type="text"
              class="character-page__name-input"
              placeholder="Введите имя героя"
              maxlength="24"
            />
          </div>

          <select
            class="character-page__select"
            :value="selectedAvatarId"
            @change="selectAvatar(($event.target as HTMLSelectElement).value)"
          >
            <option value="">— Без аватара —</option>
            <option v-for="avatar in avatars" :key="avatar.id" :value="avatar.id">
              {{ avatar.label }}
            </option>
          </select>

          <select
            class="character-page__select"
            :value="selectedRaceId"
            @change="selectRace(($event.target as HTMLSelectElement).value)"
          >
            <option value="">— Выберите расу —</option>
            <option
              v-for="heroRace in raceOptions"
              :key="heroRace.id"
              :value="heroRace.id"
            >
              {{ heroRace.name }}
            </option>
          </select>

          <select
            class="character-page__select"
            :value="selectedClassId"
            @change="selectClass(($event.target as HTMLSelectElement).value)"
          >
            <option value="">— Выберите класс —</option>
            <option
              v-for="heroClass in classOptions"
              :key="heroClass.id"
              :value="heroClass.id"
            >
              {{ heroClass.name }}
            </option>
          </select>

          <div class="character-page__meta">
            <p class="character-page__meta-title">Класс</p>
            <p v-if="selectedClass" class="character-page__meta-text">
              {{ selectedClass.description }}
            </p>
            <p v-else class="character-page__meta-empty">
              Выберите класс, чтобы увидеть описание.
            </p>
          </div>

          <div class="character-page__meta">
            <p class="character-page__meta-title">Раса</p>
            <p v-if="selectedRace" class="character-page__meta-text">
              {{ selectedRace.description }}
            </p>
            <p v-else class="character-page__meta-empty">
              Выберите расу, чтобы увидеть описание и бонусы.
            </p>
            <ul v-if="raceBonusRows.length" class="character-page__bonus-list">
              <li
                v-for="bonusRow in raceBonusRows"
                :key="bonusRow.key"
                class="character-page__bonus-item"
              >
                <span>{{ bonusRow.label }}</span>
                <strong>{{ bonusRow.value }}</strong>
              </li>
            </ul>
          </div>
        </div>

        <button class="character-page__confirm-btn" type="button" @click="applyCharacterSettings">
          Подтвердить
        </button>
      </div>

      <div class="character-page__right character-page__card">
        <div class="character-page__avatar-column">
          <div class="character-page__avatar">
            <img
              v-if="currentAvatarSrc"
              :src="currentAvatarSrc"
              alt="Аватар героя"
              class="character-page__avatar-img"
              width="90"
              height="90"
              loading="lazy"
              decoding="async"
            />
            <svg
              v-else
              class="character-page__avatar-svg"
              viewBox="0 0 64 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Герой"
            >
              <circle
                cx="32"
                cy="18"
                r="12"
                stroke="currentColor"
                stroke-width="2.5"
                fill="rgba(99,102,241,0.15)"
              />
              <path
                d="M10 68c0-12 9-22 22-22s22 10 22 22"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                fill="none"
              />
              <line
                x1="32"
                y1="46"
                x2="32"
                y2="58"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
              <line
                x1="32"
                y1="52"
                x2="22"
                y2="62"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
              <line
                x1="32"
                y1="52"
                x2="42"
                y2="62"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </div>

          <div class="character-page__bars">
            <div class="character-page__level">{{ level }}</div>
            <div class="character-page__bars-tracks">
              <div class="character-page__bar-row">
                <span class="character-page__bar-label character-page__bar-label--xp">
                  {{ xp }} / {{ xpToNext }}
                </span>
                <div class="character-page__bar-wrap">
                  <div
                    class="character-page__bar character-page__bar--xp"
                    :style="{ width: `${percentToNext}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isApplyModalOpen"
      class="character-page__modal-backdrop"
      role="status"
      aria-live="polite"
    >
      <div class="character-page__modal">
        <div class="character-page__modal-check">✓</div>
        <p class="character-page__modal-text">Изменения применены</p>
      </div>
    </div>
  </section>
</template>
