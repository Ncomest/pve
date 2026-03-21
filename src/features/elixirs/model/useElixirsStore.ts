import { defineStore } from "pinia";
import { useCharacterStore } from "@/app/store/character";
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import { LEVEL_HP_PER_LEVEL } from "@/entities/character/lib/playerStatAggregation";
import { calcCurrentHp, readHpFromStorage, saveHpSnapshot } from "@/features/character/model/usePlayerHp";
import { createItemInstance } from "@/entities/item/lib/createInstance";
import type { ElixirDefinition, ElixirKind } from "./elixirs";
import {
  DEFAULT_HEAL_FLAT_HP,
  getElixirDefinition,
  SPIRIT_ELIXIR_BONUS_POINTS,
} from "./elixirs";

type RegenWindow = { startAt: number; endAt: number };

const ELIXIR_STORAGE_KEY = "pve_elixirs_v1";

interface ElixirsState {
  activeElixirId: string | null;
  activeElixirStartAt: number | null;
  activeElixirEndAt: number | null;
  /** Для health_percent: сколько HP добавлено к maxHp. */
  activeHealthPercentBonusHp: number;
}

const getWorldBaseMaxHp = () => {
  // Базовый maxHp: уровень + экипировка. Баф эликсира не добавляем.
  const characterStore = useCharacterStore();
  const playerProgress = usePlayerProgress();

  const bonusHp = Math.max(0, playerProgress.level.value - 1) * LEVEL_HP_PER_LEVEL;
  return PLAYER_CHARACTER.stats.maxHp + bonusHp + characterStore.equipmentStats.hp;
};

const getWorldBaseSpirit = () => {
  const characterStore = useCharacterStore();
  return (PLAYER_CHARACTER.stats.spirit ?? 0) + (characterStore.equipmentStats.spirit ?? 0);
};

function getActiveRegenWindow(kind: ElixirKind, startAt: number | null, endAt: number | null): RegenWindow | null {
  if (kind !== "spirit_elixir") return null;
  if (startAt == null || endAt == null) return null;
  const now = Date.now();
  if (now >= endAt) return null;
  return { startAt, endAt };
}

export const useElixirsStore = defineStore("elixirs", {
  state: (): ElixirsState => ({
    activeElixirId: null,
    activeElixirStartAt: null,
    activeElixirEndAt: null,
    activeHealthPercentBonusHp: 0,
  }),

  getters: {
    activeElixirDef(state): ElixirDefinition | null {
      if (!state.activeElixirId) return null;
      const endAt = state.activeElixirEndAt;
      if (endAt != null && Date.now() >= endAt) return null;
      return getElixirDefinition(state.activeElixirId);
    },

    activeElixirDurationSeconds(state): number {
      if (!state.activeElixirStartAt || !state.activeElixirEndAt) return 0;
      const now = Date.now();
      const msLeft = Math.max(0, state.activeElixirEndAt - now);
      return msLeft / 1000;
    },

    activeElixirRemainingMs(state): number {
      if (!state.activeElixirEndAt) return 0;
      return Math.max(0, state.activeElixirEndAt - Date.now());
    },

    activeRegenWindow(state): RegenWindow | null {
      const def = this.activeElixirDef;
      if (!def) return null;
      return getActiveRegenWindow(def.kind, state.activeElixirStartAt, state.activeElixirEndAt);
    },

    /** Бонус духа от активного эликсира духа (0, если бафа нет). */
    activeSpiritElixirBonus(): number {
      const def = this.activeElixirDef;
      if (!def || def.kind !== "spirit_elixir") return 0;
      return def.spiritBonus ?? SPIRIT_ELIXIR_BONUS_POINTS;
    },

    activeHealthPercentBonusApplied(state): number {
      if (!state.activeElixirId || state.activeElixirEndAt == null) return 0;
      if (Date.now() >= state.activeElixirEndAt) return 0;
      const def = getElixirDefinition(state.activeElixirId);
      if (!def || def.kind !== "health_percent") return 0;
      return state.activeHealthPercentBonusHp;
    },

    activeElixirIcon(): string | null {
      const def = this.activeElixirDef;
      return def?.icon ?? null;
    },
    activeElixirName(): string | null {
      const def = this.activeElixirDef;
      return def?.name ?? null;
    },

    isActive: (state): boolean => {
      if (!state.activeElixirId || !state.activeElixirEndAt) return false;
      return Date.now() < state.activeElixirEndAt;
    },
  },

  actions: {
    /**
     * Геттеры с `Date.now()` в Pinia не пересчитываются со временем (время не реактивно).
     * Сбрасываем истёкший эликсир в state, чтобы UI и расчёт HP совпадали с реальностью.
     */
    clearExpiredElixirIfNeeded(): void {
      if (this.activeElixirEndAt == null) return;
      if (Date.now() < this.activeElixirEndAt) return;
      this.clear();
    },

    buyElixir(elixirId: string): { ok: boolean; reason?: string } {
      const def = getElixirDefinition(elixirId);
      if (!def) return { ok: false, reason: "Неизвестный эликсир." };

      const characterStore = useCharacterStore();
      const currentGold = characterStore.gold ?? 0;
      if (currentGold < def.price) return { ok: false, reason: "Недостаточно золота." };

      // В инвентаре элликсиры лежат как ItemInstance, slot не важен.
      const instance = createItemInstance(def.id, 1);

      const added = characterStore.addItemToConsumables(instance);
      if (!added) return { ok: false, reason: "Инвентарь заполнен." };

      characterStore.gold = currentGold - def.price;
      return { ok: true };
    },

    drinkElixir(elixirId: string): { ok: boolean; reason?: string } {
      this.clearExpiredElixirIfNeeded();

      const characterStore = useCharacterStore();
      const def = getElixirDefinition(elixirId);
      if (!def) return { ok: false, reason: "Неизвестный эликсир." };

      // Ищем один экземпляр эликсира в инвентаре.
      const idx = characterStore.consumables.findIndex(
        (inst) => inst?.templateId === def.id,
      );
      if (idx === -1) return { ok: false, reason: "Эликсир отсутствует в инвентаре." };

      // Считаем HP "прямо сейчас" до применения нового бафа.
      // Это нужно, например, для здоровья +15% к текущему HP.
      const now = Date.now();
      const baseMaxHp = getWorldBaseMaxHp();

      const oldEndAt = this.activeElixirEndAt ?? null;
      const oldActive = oldEndAt != null && now < oldEndAt;

      const activeIdBefore = this.activeElixirId;
      const defBefore = activeIdBefore && oldActive ? getElixirDefinition(activeIdBefore) : null;

      const isHealthPercentBefore = defBefore?.kind === "health_percent";
      const isSpiritElixirBefore = defBefore?.kind === "spirit_elixir";

      const currentMaxHpBefore = isHealthPercentBefore
        ? baseMaxHp + this.activeHealthPercentBonusHp
        : baseMaxHp;

      const regenWindowBefore: RegenWindow | null = isSpiritElixirBefore
        ? { startAt: this.activeElixirStartAt ?? now, endAt: this.activeElixirEndAt ?? now }
        : null;

      const baseSpiritBefore = getWorldBaseSpirit();
      const spiritElixirBonusBefore =
        isSpiritElixirBefore && defBefore
          ? defBefore.spiritBonus ?? SPIRIT_ELIXIR_BONUS_POINTS
          : 0;

      const snapshot = readHpFromStorage();
      const snapBase = snapshot ?? {
        hp: currentMaxHpBefore,
        maxHp: currentMaxHpBefore,
        savedAt: now,
      };

      const currentHpBefore = calcCurrentHp(
        snapBase,
        now,
        currentMaxHpBefore,
        regenWindowBefore,
        baseSpiritBefore,
        spiritElixirBonusBefore,
      );

      // "Зелье" (heal_flat) должно только лечить и не сбивать/заменять активные бафф-эликсиры.
      if (def.kind === "heal_flat") {
        const healAmount = def.healFlatHp ?? DEFAULT_HEAL_FLAT_HP;
        const nextHp = Math.min(currentMaxHpBefore, currentHpBefore + healAmount);

        // Выпиваем 1 шт из стака.
        characterStore.consumeItemFromConsumables(idx, 1);

        // Синхронизируем HP/MaxHP в localStorage на момент выпивания.
        saveHpSnapshot(nextHp, currentMaxHpBefore, now);

        return { ok: true };
      }

      // Применяем мгновенный эффект (если есть) и обновляем localStorage.
      const durationMs = def.durationMs;
      const nextStartAt = now;
      const nextEndAt = now + durationMs;

      const nextHealthPercentBonusHp =
        def.kind === "health_percent" ? Math.max(0, Math.round(currentHpBefore * 0.15)) : 0;

      const nextMaxHp = baseMaxHp + nextHealthPercentBonusHp;
      const nextHp =
        def.kind === "health_percent"
          ? Math.min(nextMaxHp, currentHpBefore + nextHealthPercentBonusHp)
          : currentHpBefore;

      // Удаляем эликсир из инвентаря.
      characterStore.consumeItemFromConsumables(idx, 1);

      // Обновляем баф-таймеры + параметры.
      this.activeElixirId = def.id;
      this.activeElixirStartAt = nextStartAt;
      this.activeElixirEndAt = nextEndAt;
      this.activeHealthPercentBonusHp = nextHealthPercentBonusHp;

      // Синхронизируем HP/MaxHP в localStorage на момент выпивания.
      saveHpSnapshot(nextHp, nextMaxHp, now);

      return { ok: true };
    },

    /** На случай ручного сброса (например, при дебаге). */
    clear(): void {
      this.activeElixirId = null;
      this.activeElixirStartAt = null;
      this.activeElixirEndAt = null;
      this.activeHealthPercentBonusHp = 0;
    },
  },

  persist: {
    key: ELIXIR_STORAGE_KEY,
    storage: localStorage,
  },
});

