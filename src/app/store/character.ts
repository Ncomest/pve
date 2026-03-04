import { defineStore } from "pinia";
import type { EquipmentSlot, Item } from "@/entities/item/model";
import { ITEMS_DB } from "@/entities/item/items-db";
import { getItemSellPrice } from "@/shared/lib/merchant/getItemSellPrice";
import { MERCHANT_STOCK } from "@/entities/merchant/model/merchant-stock";

interface CharacterState {
  gold: number;
  inventory: (Item | null)[];
  equipped: Record<EquipmentSlot, Item | null>;
}

const MAX_INVENTORY_SIZE = 30;
const STARTING_GOLD = 100;

export const useCharacterStore = defineStore("character", {
  state: (): CharacterState => ({
    gold: STARTING_GOLD,
    inventory: Array.from({ length: MAX_INVENTORY_SIZE }, () => null),
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
      const stats = { hp: 3000, power: 0, chanceCrit: 0, evasion: 0, speed: 0, accuracy: 0, armor: 0 };
      
      for (const item of Object.values(state.equipped)) {
        if (item?.stats) {
          stats.hp += item.stats.hp ?? 0;
          stats.power += item.stats.power ?? 0;
          stats.chanceCrit += item.stats.chanceCrit ?? 0;
          stats.evasion += item.stats.evasion ?? 0;
          stats.speed += item.stats.speed ?? 0;
          stats.accuracy += item.stats.accuracy ?? 0;
          stats.armor += item.stats.armor ?? 0;
        }
      }
      
      return stats;
    },

    inventoryItems(state) {
      return state.inventory.map((item, index) => ({ item, index }));
    },

    isEquipped: (state) => (itemId: string) => {
      return Object.values(state.equipped).some((item) => item?.id === itemId);
    },

    /** Проверяет, является ли этот экземпляр предмета тем, что сейчас надет (по ссылке) */
    isThisItemEquipped: (state) => (item: Item | null) => {
      if (!item) return false;
      return Object.values(state.equipped).some((eq) => eq === item);
    },
  },

  actions: {
    init() {
      // Выдать стартовое золото, если ещё не задано (новый или старый сейв без gold)
      if (this.gold === undefined || this.gold === null) {
        this.gold = STARTING_GOLD;
      }

      const hasItems = this.inventory.some((item) => item !== null);
      if (hasItems) return;

      this.inventory[0] = ITEMS_DB["weapon-wooden-sword"];
      this.inventory[1] = ITEMS_DB["shield-wooden"];
      this.inventory[2] = ITEMS_DB["ring-copper"];
      this.inventory[3] = ITEMS_DB["belt-leather"];
      this.inventory[4] = ITEMS_DB["pants-leather"];
      this.inventory[5] = ITEMS_DB["boots-leather"];
      this.inventory[6] = ITEMS_DB["necklace-bone"];
    },

    addItemToInventory(item: Item): boolean {
      const emptyIndex = this.inventory.findIndex((slot) => slot === null);
      if (emptyIndex === -1) return false;

      this.inventory[emptyIndex] = item;
      return true;
    },

    removeItemFromInventory(index: number) {
      if (index < 0 || index >= this.inventory.length) return;
      this.inventory[index] = null;
    },

    equipItem(inventoryIndex: number): boolean {
      const item = this.inventory[inventoryIndex];
      if (!item) return false;

      const slot = item.slot;
      const currentlyEquipped = this.equipped[slot];

      this.equipped[slot] = item;
      this.inventory[inventoryIndex] = null;

      if (currentlyEquipped) {
        const emptySlot = this.inventory.findIndex((slot) => slot === null);
        if (emptySlot !== -1) {
          this.inventory[emptySlot] = currentlyEquipped;
        } else {
          this.equipped[slot] = currentlyEquipped;
          this.inventory[inventoryIndex] = item;
          return false;
        }
      }

      return true;
    },

    unequipItem(slot: EquipmentSlot): boolean {
      const item = this.equipped[slot];
      if (!item) return false;

      const emptySlot = this.inventory.findIndex((slot) => slot === null);
      if (emptySlot === -1) return false;

      this.inventory[emptySlot] = item;
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

    /** Продать предмет из инвентаря торговцу. Возвращает полученное золото или 0. */
    sellItemFromInventory(index: number): number {
      const item = this.inventory[index];
      if (!item) return 0;
      // Не блокируем по «надетости»: один и тот же предмет (та же ссылка) может быть и надет, и в инвентаре (дубликат) — продаём тот что в инвентаре

      const amount = getItemSellPrice(item);
      this.gold = (this.gold ?? 0) + amount;
      this.inventory[index] = null;
      return amount;
    },

    /** Купить предмет у торговца. Возвращает true, если покупка прошла. */
    buyFromMerchant(itemId: string): boolean {
      const offer = MERCHANT_STOCK.find((o) => o.itemId === itemId);
      if (!offer) return false;

      const item = ITEMS_DB[offer.itemId];
      if (!item) return false;

      const currentGold = this.gold ?? 0;
      if (currentGold < offer.price) return false;

      const added = this.addItemToInventory(item);
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
