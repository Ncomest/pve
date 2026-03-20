import { defineStore } from "pinia";

export const PANELS_COUNT = 3;
export const SLOTS_PER_PANEL = 7;

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
  /** 3 панели, в каждой по 7 слотов */
  panels: SkillBar[];
}

export const useSkillsStore = defineStore("skills", {
  state: (): SkillsState => ({
    panels: Array.from({ length: PANELS_COUNT }, () => createEmptyBar()),
  }),

  getters: {
    /** Все слоты подряд: сначала панель 0, потом панель 1 */
    allSlots(state): SkillSlot[] {
      return state.panels.flat();
    },

    /** Слот по индексу панели и слоту */
    getSlot:
      (state) =>
      (panelIndex: number, slotIndex: number): SkillSlot => {
        const panel = state.panels[panelIndex];
        return panel?.[slotIndex] ?? { abilityId: null, hotkey: "" };
      },
  },

  actions: {
    setAbility(panelIndex: number, slotIndex: number, abilityId: string | null) {
      if (panelIndex < 0 || panelIndex >= this.panels.length) return;
      if (slotIndex < 0 || slotIndex >= SLOTS_PER_PANEL) return;
      this.panels[panelIndex][slotIndex].abilityId = abilityId;
    },

    setHotkey(panelIndex: number, slotIndex: number, hotkey: string) {
      if (panelIndex < 0 || panelIndex >= this.panels.length) return;
      if (slotIndex < 0 || slotIndex >= SLOTS_PER_PANEL) return;
      // Один символ или комбинация вида "Shift+1"
      this.panels[panelIndex][slotIndex].hotkey = hotkey.trim().slice(0, 20);
    },

    /** Очистить слот */
    clearSlot(panelIndex: number, slotIndex: number) {
      this.setAbility(panelIndex, slotIndex, null);
      this.setHotkey(panelIndex, slotIndex, "");
    },
  },

  persist: {
    key: "pve-skills-v2",
    storage: localStorage,
  },
});
