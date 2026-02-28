import { defineStore } from "pinia";

export const PANELS_COUNT = 2;
export const SLOTS_PER_PANEL = 10;

export interface SkillSlot {
  abilityId: string | null;
  hotkey: string;
}

export type SkillBar = SkillSlot[];

function createEmptyBar(): SkillBar {
  return Array.from({ length: SLOTS_PER_PANEL }, () => ({
    abilityId: null,
    hotkey: "",
  }));
}

interface SkillsState {
  /** Две панели, в каждой по 10 слотов */
  panels: [SkillBar, SkillBar];
}

export const useSkillsStore = defineStore("skills", {
  state: (): SkillsState => ({
    panels: [createEmptyBar(), createEmptyBar()],
  }),

  getters: {
    /** Все слоты подряд: сначала панель 0, потом панель 1 */
    allSlots(state): SkillSlot[] {
      return [...state.panels[0], ...state.panels[1]];
    },

    /** Слот по индексу панели и слоту */
    getSlot:
      (state) =>
      (panelIndex: 0 | 1, slotIndex: number): SkillSlot => {
        return state.panels[panelIndex][slotIndex];
      },
  },

  actions: {
    setAbility(panelIndex: 0 | 1, slotIndex: number, abilityId: string | null) {
      if (slotIndex < 0 || slotIndex >= SLOTS_PER_PANEL) return;
      this.panels[panelIndex][slotIndex].abilityId = abilityId;
    },

    setHotkey(panelIndex: 0 | 1, slotIndex: number, hotkey: string) {
      if (slotIndex < 0 || slotIndex >= SLOTS_PER_PANEL) return;
      // Один символ или комбинация вида "Shift+1"
      this.panels[panelIndex][slotIndex].hotkey = hotkey.trim().slice(0, 20);
    },

    /** Очистить слот */
    clearSlot(panelIndex: 0 | 1, slotIndex: number) {
      this.setAbility(panelIndex, slotIndex, null);
      this.setHotkey(panelIndex, slotIndex, "");
    },
  },

  persist: {
    key: "pve-skills-v1",
    storage: localStorage,
  },
});
