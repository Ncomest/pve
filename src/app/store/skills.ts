import { defineStore } from "pinia";

export const PANELS_COUNT = 2;
export const SLOTS_PER_PANEL = 7;
export const HERO_CLASS_STORAGE_KEY = "hero-class";
const DEFAULT_CLASS_ID = "__none__";

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

function createEmptyPanels(): SkillBar[] {
  return Array.from({ length: PANELS_COUNT }, () => createEmptyBar());
}

interface SkillsState {
  /** Текущий выбранный класс */
  activeClassId: string;
  /** Панели по каждому классу */
  panelsByClass: Record<string, SkillBar[]>;
}

function getInitialClassId(): string {
  if (typeof window === "undefined") return DEFAULT_CLASS_ID;
  return localStorage.getItem(HERO_CLASS_STORAGE_KEY) || DEFAULT_CLASS_ID;
}

export const useSkillsStore = defineStore("skills", {
  state: (): SkillsState => ({
    activeClassId: getInitialClassId(),
    panelsByClass: {},
  }),

  getters: {
    currentClassId(state): string {
      return state.activeClassId || DEFAULT_CLASS_ID;
    },

    panels(state): SkillBar[] {
      const classId = state.activeClassId || DEFAULT_CLASS_ID;
      return state.panelsByClass[classId] ?? createEmptyPanels();
    },

    /** Все слоты подряд: сначала панель 0, потом панель 1 */
    allSlots(state): SkillSlot[] {
      const classId = state.activeClassId || DEFAULT_CLASS_ID;
      const panels = state.panelsByClass[classId] ?? createEmptyPanels();
      return panels.flat();
    },

    /** Слот по индексу панели и слоту */
    getSlot:
      (state) =>
      (panelIndex: number, slotIndex: number): SkillSlot => {
        const classId = state.activeClassId || DEFAULT_CLASS_ID;
        const panels = state.panelsByClass[classId] ?? createEmptyPanels();
        const panel = panels[panelIndex];
        return panel?.[slotIndex] ?? { abilityId: null, hotkey: "" };
      },
  },

  actions: {
    ensureClassPanels(classId: string) {
      const normalizedClassId = classId || DEFAULT_CLASS_ID;
      if (!this.panelsByClass[normalizedClassId]) {
        this.panelsByClass[normalizedClassId] = createEmptyPanels();
      }
      return normalizedClassId;
    },

    setActiveClass(classId: string) {
      const normalizedClassId = this.ensureClassPanels(classId);
      this.activeClassId = normalizedClassId;
    },

    setAbility(
      panelIndex: number,
      slotIndex: number,
      abilityId: string | null,
    ) {
      const classId = this.ensureClassPanels(this.activeClassId);
      const classPanels = this.panelsByClass[classId];
      if (panelIndex < 0 || panelIndex >= classPanels.length) return;
      if (slotIndex < 0 || slotIndex >= SLOTS_PER_PANEL) return;
      classPanels[panelIndex][slotIndex].abilityId = abilityId;
    },

    setHotkey(panelIndex: number, slotIndex: number, hotkey: string) {
      const classId = this.ensureClassPanels(this.activeClassId);
      const classPanels = this.panelsByClass[classId];
      if (panelIndex < 0 || panelIndex >= classPanels.length) return;
      if (slotIndex < 0 || slotIndex >= SLOTS_PER_PANEL) return;
      // Один символ или комбинация вида "Shift+1"
      classPanels[panelIndex][slotIndex].hotkey = hotkey.trim().slice(0, 20);
    },

    /** Очистить слот */
    clearSlot(panelIndex: number, slotIndex: number) {
      this.setAbility(panelIndex, slotIndex, null);
      this.setHotkey(panelIndex, slotIndex, "");
    },
  },

  persist: {
    key: "pve-skills-v3",
    storage: localStorage,
  },
});
