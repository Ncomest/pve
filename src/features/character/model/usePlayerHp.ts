import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";

/** 1 HP восстанавливается каждые N миллисекунд */
const HP_REGEN_INTERVAL_MS = 10_000;
const STORAGE_KEY = "pve_player_hp_v1";
const REGEN_ELIXIR_EXTRA_PER_TICK = 3; // 1 -> 4 HP / 10с

interface HpSnapshot {
  /** Текущее HP в момент сохранения */
  hp: number;
  /** Максимальное HP в момент сохранения */
  maxHp: number;
  /** Unix-timestamp (ms) момента сохранения */
  savedAt: number;
}

export type RegenWindow = { startAt: number; endAt: number };

const countRegenTicksInWindow = (args: {
  snapshotSavedAt: number;
  now: number;
  intervalMs: number;
  regenWindow: RegenWindow;
}): number => {
  const { snapshotSavedAt, now, intervalMs, regenWindow } = args;

  const effectiveWindowStart = Math.max(regenWindow.startAt, snapshotSavedAt);
  const effectiveWindowEnd = Math.min(regenWindow.endAt, now);

  // Тики начинаются с snapshotSavedAt + intervalMs
  // поэтому диапазон по m начинается с m=1.
  if (effectiveWindowEnd <= effectiveWindowStart) return 0;
  const mMin = Math.max(1, Math.ceil((effectiveWindowStart - snapshotSavedAt) / intervalMs));
  const mMaxExclusive = Math.ceil((effectiveWindowEnd - snapshotSavedAt) / intervalMs);
  const count = mMaxExclusive - mMin;
  return Math.max(0, count);
};

/** Базовый реген 1 HP / 10с + 1 HP за каждые 50 очков духа (суммарно за тик). */
export function hpPerTickFromSpirit(spiritPoints: number): number {
  return 1 + Math.floor(Math.max(0, spiritPoints) / 50);
}

const calcRegeneratedWithOptions = (args: {
  snapshot: HpSnapshot;
  now: number;
  maxHpCap: number;
  regenWindow?: RegenWindow | null;
  regenElixirExtraPerTick?: number;
  /** Очки духа с экипировки + база (пассивный реген вне боя). */
  spiritPoints?: number;
}): number => {
  const {
    snapshot,
    now,
    maxHpCap,
    regenWindow = null,
    regenElixirExtraPerTick = REGEN_ELIXIR_EXTRA_PER_TICK,
    spiritPoints = 0,
  } = args;

  const elapsedMs = Math.max(0, now - snapshot.savedAt);
  const baseTicks = Math.floor(elapsedMs / HP_REGEN_INTERVAL_MS);
  let extraTicks = 0;

  if (regenWindow) {
    extraTicks = countRegenTicksInWindow({
      snapshotSavedAt: snapshot.savedAt,
      now,
      intervalMs: HP_REGEN_INTERVAL_MS,
      regenWindow,
    });
  }

  const perTick = hpPerTickFromSpirit(spiritPoints);
  const totalRegen = baseTicks * perTick + extraTicks * regenElixirExtraPerTick;
  return Math.min(maxHpCap, snapshot.hp + totalRegen);
};

const loadHp = (
  maxHp: number,
  regenWindow?: RegenWindow | null,
  spiritPoints: number = 0,
): number => {
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

    return calcRegeneratedWithOptions({
      snapshot: snapshot as HpSnapshot,
      now: Date.now(),
      maxHpCap: maxHp,
      regenWindow: regenWindow ?? null,
      spiritPoints,
    });
  } catch {
    return maxHp;
  }
};

const saveHp = (hp: number, maxHp: number, savedAt: number = Date.now()) => {
  if (typeof window === "undefined") return;
  const snapshot: HpSnapshot = { hp, maxHp, savedAt };
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

export const calcCurrentHp = (
  snapshot: HpSnapshot,
  now: number = Date.now(),
  maxHpCap: number = snapshot.maxHp,
  regenWindow?: RegenWindow | null,
  regenElixirExtraPerTick: number = REGEN_ELIXIR_EXTRA_PER_TICK,
  spiritPoints: number = 0,
): number =>
  calcRegeneratedWithOptions({
    snapshot,
    now,
    maxHpCap,
    regenWindow: regenWindow ?? null,
    regenElixirExtraPerTick,
    spiritPoints,
  });

export const saveHpSnapshot = (hp: number, maxHp: number, savedAt: number = Date.now()) => {
  saveHp(hp, maxHp, savedAt);
};

export function usePlayerHp() {
  const init = (maxHp: number, regenWindow?: RegenWindow | null, spiritPoints: number = 0) => {
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
    state.hp = loadHp(maxHp, regenWindow ?? null, spiritPoints);
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
  const useRealtimeHp = (
    getMaxHp: () => number,
    getRegenWindow?: () => RegenWindow | null,
    getSpiritPoints?: () => number,
  ) => {
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
      const regenWindow = getRegenWindow ? getRegenWindow() : null;
      const spirit = getSpiritPoints ? getSpiritPoints() : 0;
      currentHp.value = calcCurrentHp(snapshot, Date.now(), actualMaxHp, regenWindow, REGEN_ELIXIR_EXTRA_PER_TICK, spirit);
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
