import { defineStore } from "pinia";
import type { EquipmentSlot, ItemInstance } from "@/entities/item/model";
import { getEffectiveStats } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { getDisplayItem } from "@/entities/item/model";
import { critPointsToFraction, evasionPointsToFraction } from "@/entities/item/lib/statPoints";
import { getItemSellPrice } from "@/shared/lib/merchant/getItemSellPrice";
import type { MerchantOffer } from "@/entities/merchant/model/merchant-stock";
import { generateInstanceId } from "@/entities/item/lib/createInstance";

interface CharacterState {
  gold: number;
  inventory: (ItemInstance | null)[];
  /** Раздельный инвентарь под расходники (зелья/эликсиры). */
  consumables: (ItemInstance | null)[];
  equipped: Record<EquipmentSlot, ItemInstance | null>;
}

const MAX_INVENTORY_SIZE = 30;
const MAX_CONSUMABLES_SIZE = 10;
// Максимальный размер стака для расходников/эликсиров.
const MAX_CONSUMABLE_STACK_SIZE = 99;
const STARTING_GOLD = 100;

/** Проверяет, что объект — старый формат вещи (Item с stats без templateId). */
function isOldFormatItem(value: unknown): value is { id: string; stats?: unknown } {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return "stats" in o && !("templateId" in o) && typeof o.id === "string";
}

/** Мигрирует один слот: старый Item → ItemInstance. */
function migrateSlot(value: unknown): ItemInstance | null {
  if (value === null) return null;
  if (!isOldFormatItem(value)) return value as ItemInstance;
  return {
    instanceId: generateInstanceId(),
    templateId: value.id,
    itemLevel: 1,
  };
}

export const useCharacterStore = defineStore("character", {
  state: (): CharacterState => ({
    gold: STARTING_GOLD,
    inventory: Array.from({ length: MAX_INVENTORY_SIZE }, () => null),
    consumables: Array.from({ length: MAX_CONSUMABLES_SIZE }, () => null),
    equipped: {
      helmet: null,
      chest: null,
      earring: null,
      ring: null,
      weapon: null,
      shield: null,
      belt: null,
      pants: null,
      boots: null,
      necklace: null,
    },
  }),

  getters: {
    equipmentStats(state) {
      const stats = { hp: 0, power: 0, chanceCrit: 0, evasion: 0, speed: 0, armor: 0 };
      let critPoints = 0;
      let evasionPoints = 0;
      for (const instance of Object.values(state.equipped)) {
        if (!instance) continue;
        const template = getTemplate(instance.templateId);
        if (!template) continue;
        const effective = getEffectiveStats(template.baseStats, instance.itemLevel, instance.rolls);
        stats.hp += effective.hp ?? 0;
        stats.power += effective.power ?? 0;
        critPoints += effective.chanceCrit ?? 0;
        evasionPoints += effective.evasion ?? 0;
        stats.speed += effective.speed ?? 0;
        stats.armor += effective.armor ?? 0;
      }
      stats.chanceCrit = critPointsToFraction(critPoints);
      stats.evasion = evasionPointsToFraction(evasionPoints);
      return stats;
    },

    inventoryItems(state) {
      return state.inventory.map((item, index) => ({ item, index }));
    },

    consumableItems(state) {
      return state.consumables.map((item, index) => ({ item, index }));
    },

    isEquipped: (state) => (instanceId: string) => {
      return Object.values(state.equipped).some(
        (inst) => inst?.instanceId === instanceId
      );
    },

    isThisItemEquipped: (state) => (item: ItemInstance | null) => {
      if (!item) return false;
      return Object.values(state.equipped).some((eq) => eq === item);
    },
  },

  actions: {
    /** Миграция старых сохранений и выдача стартового снаряжения при необходимости. */
    init() {
      if (this.gold === undefined || this.gold === null) {
        this.gold = STARTING_GOLD;
      }

      // Убедимся, что новое поле `consumables` присутствует при старых сохранениях
      // (pinia-plugin-persistedstate может подставлять только то, что было раньше).
      if (!this.consumables || this.consumables.length !== MAX_CONSUMABLES_SIZE) {
        this.consumables = Array.from({ length: MAX_CONSUMABLES_SIZE }, () => null);
      }

      // Миграция инвентаря:
      // если в старом сохранении эликсиры лежали в основном `inventory`, переносим их в `consumables`.
      for (let i = 0; i < this.inventory.length; i++) {
        this.inventory[i] = migrateSlot(this.inventory[i]);
      }

      for (let i = 0; i < this.inventory.length; i++) {
        const inst = this.inventory[i];
        if (!inst) continue;
        if (!inst.templateId.startsWith("elixir-")) continue;
        const emptyIndex = this.consumables.findIndex((s) => s === null);
        if (emptyIndex === -1) continue; // если нет места — оставляем в inventory (мягкая деградация)
        this.consumables[emptyIndex] = inst;
        this.inventory[i] = null;
      }

      // Миграция экипировки
      for (const slot of Object.keys(this.equipped) as EquipmentSlot[]) {
        this.equipped[slot] = migrateSlot(this.equipped[slot]);
      }
    },

    addItemToInventory(instance: ItemInstance): boolean {
      const emptyIndex = this.inventory.findIndex((slot) => slot === null);
      if (emptyIndex === -1) return false;
      this.inventory[emptyIndex] = instance;
      return true;
    },

    addItemToConsumables(instance: ItemInstance): boolean {
      const templateId = instance.templateId;
      const initialCount = Math.max(0, instance.count ?? 1);
      if (!templateId || initialCount <= 0) return false;

      let remainingToAdd = initialCount;

      // 1) Сначала заполняем существующие стаки.
      while (remainingToAdd > 0) {
        const existingIndex = this.consumables.findIndex(
          (slot) =>
            slot != null &&
            slot.templateId === templateId &&
            (slot.count ?? 1) < MAX_CONSUMABLE_STACK_SIZE,
        );

        if (existingIndex !== -1) {
          const existing = this.consumables[existingIndex];
          if (!existing) break;

          const existingCount = existing.count ?? 1;
          const canAdd = Math.min(MAX_CONSUMABLE_STACK_SIZE - existingCount, remainingToAdd);
          existing.count = existingCount + canAdd;
          remainingToAdd -= canAdd;
          continue;
        }

        // 2) Если подходящих стакoв нет — пробуем создать новый.
        const emptyIndex = this.consumables.findIndex((slot) => slot === null);
        if (emptyIndex === -1) return false;

        const addCount = Math.min(MAX_CONSUMABLE_STACK_SIZE, remainingToAdd);
        this.consumables[emptyIndex] = {
          ...instance,
          instanceId: generateInstanceId(),
          count: addCount,
        };
        remainingToAdd -= addCount;
      }

      return true;
    },

    removeItemFromInventory(index: number) {
      if (index < 0 || index >= this.inventory.length) return;
      this.inventory[index] = null;
    },

    removeItemFromConsumables(index: number) {
      if (index < 0 || index >= this.consumables.length) return;
      this.consumables[index] = null;
    },

    /**
     * Уменьшает количество предмета в ячейке.
     * Если осталось 0 — освобождает слот.
     */
    consumeItemFromConsumables(index: number, amount: number = 1): boolean {
      if (index < 0 || index >= this.consumables.length) return false;
      const inst = this.consumables[index];
      if (!inst) return false;

      const safeAmount = Math.max(1, amount);
      const current = inst.count ?? 1;
      const next = current - safeAmount;

      if (next > 0) {
        inst.count = next;
      } else {
        this.consumables[index] = null;
      }

      return true;
    },

    equipItem(inventoryIndex: number): boolean {
      const instance = this.inventory[inventoryIndex];
      if (!instance) return false;
      const template = getTemplate(instance.templateId);
      if (!template) return false;
      const slot = template.slot;
      const currentlyEquipped = this.equipped[slot];

      this.equipped[slot] = instance;
      this.inventory[inventoryIndex] = null;

      if (currentlyEquipped) {
        const emptySlot = this.inventory.findIndex((s) => s === null);
        if (emptySlot !== -1) {
          this.inventory[emptySlot] = currentlyEquipped;
        } else {
          this.equipped[slot] = currentlyEquipped;
          this.inventory[inventoryIndex] = instance;
          return false;
        }
      }
      return true;
    },

    unequipItem(slot: EquipmentSlot): boolean {
      const instance = this.equipped[slot];
      if (!instance) return false;
      const emptySlot = this.inventory.findIndex((s) => s === null);
      if (emptySlot === -1) return false;
      this.inventory[emptySlot] = instance;
      this.equipped[slot] = null;
      return true;
    },

    moveItem(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= this.inventory.length) return;
      if (toIndex < 0 || toIndex >= this.inventory.length) return;
      const temp = this.inventory[fromIndex];
      this.inventory[fromIndex] = this.inventory[toIndex];
      this.inventory[toIndex] = temp;
    },

    sellItemFromInventory(index: number): number {
      const instance = this.inventory[index];
      if (!instance) return 0;
      const displayItem = getDisplayItem(instance, getTemplate);
      if (!displayItem) return 0;
      const amount = getItemSellPrice(displayItem);
      this.gold = (this.gold ?? 0) + amount;
      this.inventory[index] = null;
      return amount;
    },

    sellItemFromConsumables(index: number): number {
      const instance = this.consumables[index];
      if (!instance) return 0;
      const displayItem = getDisplayItem(instance, getTemplate);
      if (!displayItem) return 0;

      const count = instance.count ?? 1;
      const amountPer = getItemSellPrice(displayItem);
      const amount = amountPer * count;
      this.gold = (this.gold ?? 0) + amount;
      this.consumables[index] = null;
      return amount;
    },

    buyFromMerchant(offer: MerchantOffer): boolean {
      if (offer.isSold) return false;
      const templateId = offer.itemInstance.templateId;
      if (!getTemplate(templateId)) return false;

      const currentGold = this.gold ?? 0;
      if (currentGold < offer.price) return false;

      const added = this.addItemToInventory(offer.itemInstance);
      if (!added) return false;

      this.gold = currentGold - offer.price;
      return true;
    },
  },

  persist: {
    key: "pve-character-v1",
    storage: localStorage,
  },
});
