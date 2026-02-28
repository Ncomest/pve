import { computed, reactive, watch } from "vue";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import { expNeededForLevel } from "@/shared/lib/experience/experience";

interface PlayerProgressState {
  level: number;
  xp: number;
  xpToNext: number;
}

const STORAGE_KEY = "pve_player_progress_v1";

const loadInitialState = (): PlayerProgressState => {
  const fallback: PlayerProgressState = {
    level: PLAYER_CHARACTER.level,
    xp: PLAYER_CHARACTER.xp,
    xpToNext: expNeededForLevel(PLAYER_CHARACTER.level),
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PlayerProgressState>;
    const level =
      typeof parsed.level === "number" && parsed.level > 0
        ? parsed.level
        : fallback.level;
    const xp =
      typeof parsed.xp === "number" && parsed.xp >= 0 ? parsed.xp : fallback.xp;

    return {
      level,
      xp,
      xpToNext: expNeededForLevel(level),
    };
  } catch {
    return fallback;
  }
};

const state = reactive<PlayerProgressState>(loadInitialState());

let isWatchAttached = false;

export function usePlayerProgress() {
  if (!isWatchAttached) {
    isWatchAttached = true;
    watch(
      () => ({ level: state.level, xp: state.xp, xpToNext: state.xpToNext }),
      (value) => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      },
      { deep: true, immediate: true },
    );
  }

  const percentToNext = computed(() =>
    state.xpToNext > 0
      ? Math.max(0, Math.min(100, Math.round((state.xp / state.xpToNext) * 100)))
      : 0,
  );

  const addXp = (amount: number) => {
    if (amount <= 0) return;
    state.xp += amount;

    while (state.xp >= state.xpToNext && state.xpToNext > 0) {
      state.xp -= state.xpToNext;
      state.level += 1;
      state.xpToNext = expNeededForLevel(state.level);
    }
  };

  return {
    state,
    level: computed(() => state.level),
    xp: computed(() => state.xp),
    xpToNext: computed(() => state.xpToNext),
    percentToNext,
    addXp,
  };
}

