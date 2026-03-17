<script setup lang="ts">
import { ref, computed } from "vue";
import { useCharacterStore } from "@/app/store/character";
import { getItemSellPrice } from "@/shared/lib/merchant/getItemSellPrice";
import {
  MERCHANT_STOCK,
  getMerchantItem,
  type MerchantOffer,
} from "@/entities/merchant/model/merchant-stock";
import { getDisplayItem } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import { SLOT_NAMES, type EquipmentSlot } from "@/entities/item/model";
import InventoryGrid from "@/features/inventory/ui/InventoryGrid.vue";
import "./MerchantPage.scss";

const characterStore = useCharacterStore();
const selectedIndex = ref<number | null>(null);
const message = ref<string | null>(null);
let messageTimer: ReturnType<typeof setTimeout> | null = null;

const gold = computed(() => characterStore.gold ?? 0);
const inventoryItems = computed(() => characterStore.inventoryItems);
const selectedItem = computed(() => {
  const idx = selectedIndex.value;
  if (idx === null) return null;
  const entry = characterStore.inventoryItems[idx];
  return entry?.item ?? null;
});
const selectedDisplayItem = computed(() =>
  selectedItem.value ? getDisplayItem(selectedItem.value, getTemplate) : null
);
const selectedSellPrice = computed(() =>
  selectedDisplayItem.value ? getItemSellPrice(selectedDisplayItem.value) : 0
);

function showMessage(text: string) {
  message.value = text;
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    message.value = null;
    messageTimer = null;
  }, 2500);
}

function selectSlot(_item: import("@/entities/item/model").ItemInstance | null, index: number) {
  selectedIndex.value = selectedIndex.value === index ? null : index;
}

function sellSelected() {
  if (selectedIndex.value === null || !selectedItem.value) return;
  const earned = characterStore.sellItemFromInventory(selectedIndex.value);
  if (earned > 0) {
    showMessage(`Продано за ${earned} золотых.`);
    selectedIndex.value = null;
  }
}

function buyItem(offer: MerchantOffer) {
  const item = getMerchantItem(offer);
  if (!item) return;
  if (characterStore.gold < offer.price) {
    showMessage("Недостаточно золота.");
    return;
  }
  const ok = characterStore.buyFromMerchant(offer.itemId);
  if (ok) showMessage(`${item.name} куплен за ${offer.price} золотых.`);
  else showMessage("Инвентарь заполнен.");
}

const SLOT_ICON_FILES: Record<EquipmentSlot, string> = {
  helmet: "helmet",
  chest: "chest",
  belt: "belt",
  pants: "pants",
  boots: "boots",
  necklace: "neck",
  ring: "ring",
  earring: "trinket",
  weapon: "sword",
  shield: "shield",
};

function getSlotIconSrc(slot: EquipmentSlot) {
  const file = SLOT_ICON_FILES[slot];
  return `/images/equipment/${file}.png`;
}
</script>

<template>
  <div class="merchant-page">
    <h1 class="merchant-page__title">Торговец</h1>
    <p class="merchant-page__subtitle">
      Продавайте лут за золотые монеты и покупайте новые предметы.
    </p>

    <div class="merchant-page__gold">
      <img
        src="/images/currencies/coin.png"
        alt="Золото"
        class="merchant-page__gold-icon"
      />
      <span class="merchant-page__gold-value">{{ gold }}</span>
      <span class="merchant-page__gold-label">золотых</span>
    </div>

    <div v-if="message" class="merchant-page__toast">{{ message }}</div>

    <div class="merchant-page__content">
      <section class="merchant-page__section merchant-page__section--inventory">
        <h2 class="merchant-page__section-title">Мой инвентарь</h2>
        <p class="merchant-page__section-hint">
          Выберите предмет и нажмите «Продать», чтобы получить золото.
        </p>
        <div class="merchant-page__inventory-body">
          <InventoryGrid
            :items="inventoryItems"
            :selected-index="selectedIndex"
            @select="selectSlot"
          />
          <div v-if="selectedDisplayItem" class="merchant-page__sell-card">
            <h3
              class="merchant-page__item-name"
              :style="{ color: rarityColor(selectedDisplayItem.rarity) }"
            >
              {{ selectedDisplayItem.name }}
            </h3>
            <div class="merchant-page__item-slot">{{ SLOT_NAMES[selectedDisplayItem.slot] }}</div>
            <div v-if="selectedDisplayItem.itemLevel != null" class="merchant-page__item-level">
              Ур. вещи: {{ selectedDisplayItem.itemLevel }}
            </div>
            <div class="merchant-page__sell-price">
              <img
                src="/images/currencies/coin.png"
                alt="Золото"
                class="merchant-page__coin"
              />
              {{ selectedSellPrice }} золотых
            </div>
            <button
              type="button"
              class="merchant-page__btn merchant-page__btn--sell"
              @click="sellSelected"
            >
              Продать
            </button>
          </div>
        </div>
      </section>

      <section class="merchant-page__section merchant-page__section--stock">
        <h2 class="merchant-page__section-title">Товары торговца</h2>
        <div class="merchant-page__stock-list">
          <div
            v-for="offer in MERCHANT_STOCK"
            :key="offer.itemId"
            class="merchant-page__offer"
          >
            <template v-if="getMerchantItem(offer)">
              <div
                class="merchant-page__offer-icon"
                :style="{ color: rarityColor(getMerchantItem(offer)!.rarity) }"
              >
                <img
                  :src="getSlotIconSrc(getMerchantItem(offer)!.slot)"
                  :alt="SLOT_NAMES[getMerchantItem(offer)!.slot]"
                  class="merchant-page__offer-icon-img"
                />
              </div>
              <div class="merchant-page__offer-info">
                <span
                  class="merchant-page__offer-name"
                  :style="{ color: rarityColor(getMerchantItem(offer)!.rarity) }"
                >
                  {{ getMerchantItem(offer)!.name }}
                </span>
                <span class="merchant-page__offer-price">
                  <img
                    src="/images/currencies/coin.png"
                    alt="Золото"
                    class="merchant-page__coin"
                  />
                  {{ offer.price }}
                </span>
              </div>
              <button
                type="button"
                class="merchant-page__btn merchant-page__btn--buy"
                :disabled="gold < offer.price"
                @click="buyItem(offer)"
              >
                Купить
              </button>
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
