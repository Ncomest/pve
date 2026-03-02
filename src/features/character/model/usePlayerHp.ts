import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";

/** 1 HP восстанавливается каждые N миллисекунд */
const HP_REGEN_INTERVAL_MS = 10_000;
const STORAGE_KEY = "pve_player_hp_v1";

interface HpSnapshot {
  /** Текущее HP в момент сохранения */
  hp: number;
  /** Максимальное HP в момент сохранения */
  maxHp: number;
  /** Unix-timestamp (ms) момента сохранения */
  savedAt: number;
}

const calcRegenerated = (snapshot: HpSnapshot, now: number): number => {
  const elapsedMs = Math.max(0, now - snapshot.savedAt);
  const regenAmount = Math.floor(elapsedMs / HP_REGEN_INTERVAL_MS);
  return Math.min(snapshot.maxHp, snapshot.hp + regenAmount);
};

const loadHp = (maxHp: number): number => {
  if (typeof window === "undefined") return maxHp;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return maxHp;

    const snapshot = JSON.parse(raw) as Partial<HpSnapshot>;
    if (
      typeof snapshot.hp !== "number" ||
      typeof snapshot.maxHp !== "number" ||
      typeof snapshot.savedAt !== "number"
    ) {
      return maxHp;
    }

    return calcRegenerated(snapshot as HpSnapshot, Date.now());
  } catch {
    return maxHp;
  }
};

const saveHp = (hp: number, maxHp: number) => {
  if (typeof window === "undefined") return;
  const snapshot: HpSnapshot = { hp, maxHp, savedAt: Date.now() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
};

interface HpState {
  hp: number;
  maxHp: number;
}

const state = reactive<HpState>({ hp: 0, maxHp: 0 });
let isWatchAttached = false;

/**
 * Читает снимок из localStorage и возвращает HP с учётом регенерации
 * за прошедшее время. Не требует инициализации через init().
 */
export const readHpFromStorage = (): HpSnapshot | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as Partial<HpSnapshot>;
    if (
      typeof snapshot.hp !== "number" ||
      typeof snapshot.maxHp !== "number" ||
      typeof snapshot.savedAt !== "number"
    ) {
      return null;
    }
    return snapshot as HpSnapshot;
  } catch {
    return null;
  }
};

export const calcCurrentHp = (snapshot: HpSnapshot, now = Date.now()): number =>
  calcRegenerated(snapshot, now);

export function usePlayerHp() {
  const init = (maxHp: number) => {
    // Вотч навешиваем только один раз, но HP всегда перечитываем из localStorage,
    // чтобы при повторном входе в бой не получить старое (возможно нулевое) значение
    if (!isWatchAttached) {
      isWatchAttached = true;
      watch(
        () => ({ hp: state.hp, maxHp: state.maxHp }),
        ({ hp, maxHp }) => saveHp(hp, maxHp),
        { deep: true },
      );
    }

    state.maxHp = maxHp;
    state.hp = loadHp(maxHp);
  };

  /** Вызывать при смене уровня / экипировки, чтобы пересчитать maxHp */
  const updateMaxHp = (newMaxHp: number) => {
    if (state.maxHp === newMaxHp) return;
    const ratio = state.maxHp > 0 ? state.hp / state.maxHp : 1;
    state.maxHp = newMaxHp;
    state.hp = Math.min(newMaxHp, Math.round(ratio * newMaxHp));
  };

  const setHp = (value: number) => {
    state.hp = Math.max(0, Math.min(state.maxHp, value));
  };

  const applyDamage = (amount: number) => {
    state.hp = Math.max(0, state.hp - amount);
  };

  const applyHeal = (amount: number) => {
    state.hp = Math.min(state.maxHp, state.hp + amount);
  };

  const hpPercent = computed(() =>
    state.maxHp > 0 ? Math.max(0, Math.round((state.hp / state.maxHp) * 100)) : 0,
  );

  const isDead = computed(() => state.hp <= 0);

  /**
   * Composable для отображения HP с живой регенерацией (для UI вне боя).
   * Принимает геттер актуального maxHp (с учётом уровня и экипировки).
   * Обновляет значение каждую секунду через setInterval.
   */
  const useRealtimeHp = (getMaxHp: () => number) => {
    const currentHp = ref(0);
    const currentMaxHp = ref(0);

    const refresh = () => {
      const actualMaxHp = getMaxHp();
      const snapshot = readHpFromStorage();

      if (!snapshot) {
        currentMaxHp.value = actualMaxHp;
        currentHp.value = actualMaxHp;
        return;
      }

      // Используем актуальный maxHp (из уровня + экипировки), а не из снимка
      currentMaxHp.value = actualMaxHp;
      // HP ограничиваем актуальным maxHp
      currentHp.value = Math.min(actualMaxHp, calcCurrentHp(snapshot));
    };

    let timer: number | null = null;

    onMounted(() => {
      refresh();
      timer = window.setInterval(refresh, 1000);
    });

    onUnmounted(() => {
      if (timer !== null) window.clearInterval(timer);
    });

    const hpPct = computed(() =>
      currentMaxHp.value > 0
        ? Math.max(0, Math.round((currentHp.value / currentMaxHp.value) * 100))
        : 0,
    );

    return { currentHp, currentMaxHp, hpPct };
  };

  return {
    hp: computed(() => state.hp),
    maxHp: computed(() => state.maxHp),
    hpPercent,
    isDead,
    init,
    updateMaxHp,
    setHp,
    applyDamage,
    applyHeal,
    saveHp: () => saveHp(state.hp, state.maxHp),
    useRealtimeHp,
  };
}
