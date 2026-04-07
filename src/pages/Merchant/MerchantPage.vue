<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useCharacterStore } from "@/app/store/character";
import { getItemSellPrice } from "@/shared/lib/merchant/getItemSellPrice";
import {
  generateMerchantOffers,
  getMerchantItem,
  type MerchantOffer,
} from "@/entities/merchant/model/merchant-stock";
import { getDisplayItem } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import { SLOT_NAMES, type ItemSlot } from "@/entities/item/model";
import InventoryGrid from "@/features/inventory/ui/InventoryGrid.vue";
import ConsumablesGrid from "@/features/inventory/ui/ConsumablesGrid.vue";
import {
  // DEFAULT_HEAL_FLAT_HP,
  ELIXIRS,
  getElixirDefinition,
} from "@/features/elixirs/model/elixirs";
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import "./MerchantPage.scss";

const characterStore = useCharacterStore();
const elixirsStore = useElixirsStore();
const playerProgress = usePlayerProgress();

const OFFER_COUNT = 5;
const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const MANUAL_REFRESH_COST_GOLD = 1000;
const MERCHANT_OFFERS_STORAGE_KEY = "pve_merchant_offers_v1";

const selectedIndex = ref<number | null>(null);
const message = ref<string | null>(null);
let messageTimer: ReturnType<typeof setTimeout> | null = null;
const expandedEquipmentOfferId = ref<string | null>(null);
const expandedElixirId = ref<string | null>(null);

type MerchantTab = "equipment" | "consumables";
const activeTab = ref<MerchantTab>("equipment");

const gold = computed(() => characterStore.gold ?? 0);
const inventoryItems = computed(() => characterStore.inventoryItems);
const consumableItems = computed(() => characterStore.consumableItems);

const merchantOffers = ref<MerchantOffer[]>([]);
const heroLevelAtGeneration = ref<number>(playerProgress.level.value);
const nextRefreshAt = ref<number>(0);
let autoRefreshTimer: ReturnType<typeof setTimeout> | null = null;
/** Текущее время для реактивного отображения оставшегося до автообновления интервала */
const nowForCountdown = ref<number>(Date.now());
let countdownIntervalId: ReturnType<typeof setInterval> | null = null;

const offersWithDisplay = computed(() =>
  merchantOffers.value.map((offer) => ({
    offer,
    displayItem: getMerchantItem(offer),
  })),
);

const selectedItem = computed(() => {
  const idx = selectedIndex.value;
  if (idx === null) return null;
  const entry = characterStore.inventoryItems[idx];
  return entry?.item ?? null;
});

const selectedConsumableIndex = ref<number | null>(null);
const selectedConsumableItem = computed(() => {
  if (selectedConsumableIndex.value === null) return null;
  const entry = characterStore.consumableItems[selectedConsumableIndex.value];
  return entry?.item ?? null;
});

const selectedElixirDef = computed(() => {
  if (!selectedConsumableItem.value) return null;
  return getElixirDefinition(selectedConsumableItem.value.templateId);
});
const isElixirTemplateId = (templateId?: string | null) =>
  !!templateId && templateId.startsWith("elixir-");

const selectedDisplayItem = computed(() => {
  if (!selectedItem.value) return null;
  if (isElixirTemplateId(selectedItem.value.templateId)) return null; // MVP: эликсиры не продаём в табе “Экипировка”
  return getDisplayItem(selectedItem.value, getTemplate);
});
const selectedSellPrice = computed(() =>
  selectedDisplayItem.value ? getItemSellPrice(selectedDisplayItem.value) : 0
);

const selectedElixirSellPrice = computed(() => {
  if (!selectedConsumableItem.value) return 0;
  const displayItem = getDisplayItem(selectedConsumableItem.value, getTemplate);
  const count = selectedConsumableItem.value.count ?? 1;
  return displayItem ? getItemSellPrice(displayItem) * count : 0;
});

const selectedElixirDescription = computed(() => {
  const def = selectedElixirDef.value;
  if (!def) return "";
  const base = `Бафф: 5 минут.\nНе стакается: выпивание сбивает предыдущий.`;
  switch (def.kind) {
    case "power":
      return `Увеличивает атаку: +${def.powerDelta ?? 5}.\n${base}`;
    case "armor_percent":
      return `Увеличивает броню: +${Math.round((def.armorPercentBonus ?? 0) * 100)}%.\n${base}`;
    case "crit_percent":
      return `Увеличивает крит: +${Math.round((def.critPercentBonus ?? 0) * 100)}%.\n${base}`;
    case "speed_percent":
      return `Увеличивает скорость: +${Math.round((def.speedPercentBonus ?? 0) * 100)}%.\n${base}`;
    case "health_percent":
      return `Увеличивает максимальное здоровье: +15% к текущему HP при выпивании.\n${base}`;
    case "evasion_percent":
      return `Увеличивает уклонение: +${Math.round((def.evasionPercentBonus ?? 0) * 100)}%.\n${base}`;
    default:
      return base;
  }
});

function showMessage(text: string) {
  message.value = text;
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    message.value = null;
    messageTimer = null;
  }, 2500);
}

interface MerchantOffersStorageState {
  heroLevelAtGeneration: number;
  nextRefreshAt: number;
  offers: MerchantOffer[];
}

function selectSlot(_item: import("@/entities/item/model").ItemInstance | null, index: number) {
  selectedIndex.value = selectedIndex.value === index ? null : index;
  selectedConsumableIndex.value = null;
}

function sellSelected() {
  if (selectedIndex.value === null || !selectedItem.value) return;
  if (isElixirTemplateId(selectedItem.value.templateId)) {
    showMessage("Эликсиры нельзя продавать в режиме “Экипировка”.");
    return;
  }
  const earned = characterStore.sellItemFromInventory(selectedIndex.value);
  if (earned > 0) {
    showMessage(`Продано за ${earned} золотых.`);
    selectedIndex.value = null;
  }
}

function selectConsumableSlot(_item: import("@/entities/item/model").ItemInstance | null, index: number) {
  selectedConsumableIndex.value = selectedConsumableIndex.value === index ? null : index;
  selectedIndex.value = null;
}

function drinkSelectedElixir() {
  const def = selectedElixirDef.value;
  if (!def) return;
  const res = elixirsStore.drinkElixir(def.id);
  if (!res.ok) {
    showMessage(res.reason ?? "Не удалось выпить эликсир.");
    return;
  }
  selectedConsumableIndex.value = null;
  showMessage(`${def.name} выпит.`);
}

function sellSelectedElixir() {
  if (selectedConsumableIndex.value === null || !selectedConsumableItem.value) return;
  const earned = characterStore.sellItemFromConsumables(selectedConsumableIndex.value);
  if (earned > 0) {
    showMessage(`Продано за ${earned} золотых.`);
    selectedConsumableIndex.value = null;
  }
}

function getEquipmentOfferTooltip(offer: MerchantOffer): string {
  const item = getMerchantItem(offer);
  if (!item) return "";
  const lines: string[] = [];
  lines.push(`${item.name}`);
  lines.push(`Ур. вещи: ${item.itemLevel ?? 1}`);
  lines.push(`Слот: ${SLOT_NAMES[item.slot]}`);
  if (item.stats.hp != null) lines.push(`HP: +${item.stats.hp}`);
  if (item.stats.power != null) lines.push(`Атака: +${item.stats.power}`);
  if (item.stats.chanceCrit != null) lines.push(`Крит: +${item.stats.chanceCrit}`);
  if (item.stats.evasion != null) lines.push(`Уклонение: +${item.stats.evasion}`);
  if (item.stats.speed != null) lines.push(`Скорость: +${item.stats.speed}`);
  if (item.stats.armor != null) lines.push(`Броня: +${item.stats.armor}`);
  if (item.stats.accuracy != null) lines.push(`Меткость: +${item.stats.accuracy}`);
  if (item.stats.critDefense != null) lines.push(`Защита от крита: +${item.stats.critDefense}`);
  if (item.stats.lifesteal != null) lines.push(`Самоисцеление: +${item.stats.lifesteal}`);
  lines.push(`Цена торговца: ${offer.price} зол.`);
  return lines.join("\n");
}

function getEquipmentOfferStatsLines(offer: MerchantOffer): string[] {
  const item = getMerchantItem(offer);
  if (!item) return [];
  const lines: string[] = [];
  if (item.stats.hp != null) lines.push(`HP: +${item.stats.hp}`);
  if (item.stats.power != null) lines.push(`Атака: +${item.stats.power}`);
  if (item.stats.chanceCrit != null) lines.push(`Крит: +${item.stats.chanceCrit}`);
  if (item.stats.evasion != null) lines.push(`Уклонение: +${item.stats.evasion}`);
  if (item.stats.speed != null) lines.push(`Скорость: +${item.stats.speed}`);
  if (item.stats.armor != null) lines.push(`Броня: +${item.stats.armor}`);
  if (item.stats.accuracy != null) lines.push(`Меткость: +${item.stats.accuracy}`);
  if (item.stats.critDefense != null) lines.push(`Защита от крита: +${item.stats.critDefense}`);
  if (item.stats.lifesteal != null) lines.push(`Самоисцеление: +${item.stats.lifesteal}`);
  return lines;
}

function getElixirOfferTooltip(elixir: (typeof ELIXIRS)[number]): string {
  const base = `Цена торговца: ${elixir.price} зол.\n`;
  const def = elixir;
  const lines: string[] = [];
  lines.push(base.trimEnd());
  switch (def.kind) {
    case "power":
      lines.push(`Атака +${def.powerDelta ?? 5}.`);
      break;
    case "armor_percent":
      lines.push(`Броня +${Math.round((def.armorPercentBonus ?? 0) * 100)}%.`);
      break;
    case "crit_percent":
      lines.push(`Крит +${Math.round((def.critPercentBonus ?? 0) * 100)}%.`);
      break;
    case "speed_percent":
      lines.push(`Скорость +${Math.round((def.speedPercentBonus ?? 0) * 100)}%.`);
      break;
    case "health_percent":
      lines.push("Здоровье +15% к текущему HP (увеличивает maxHP).");
      break;
    case "evasion_percent":
      lines.push(`Уклонение +${Math.round((def.evasionPercentBonus ?? 0) * 100)}%.`);
      break;
    default:
      break;
  }
  // if (def.kind === "heal_flat") {
  //   lines.push("Баффы эликсиров не сбиваются.");
  // } else {
    lines.push("Бафф: 5 минут. Не стакается.");
  // }
  return lines.join("\n");
}

function getElixirOfferDescriptionLines(elixir: (typeof ELIXIRS)[number]): string[] {
  const text = getElixirOfferTooltip(elixir);
  return text.split("\n").filter(Boolean);
}

function toggleEquipmentOffer(offerId: string) {
  expandedEquipmentOfferId.value = expandedEquipmentOfferId.value === offerId ? null : offerId;
}

function toggleElixirOffer(elixirId: string) {
  expandedElixirId.value = expandedElixirId.value === elixirId ? null : elixirId;
}

function buyItem(offer: MerchantOffer) {
  if (offer.isSold) {
    showMessage("Уже куплено.");
    return;
  }

  const currentGold = characterStore.gold ?? 0;
  if (currentGold < offer.price) {
    showMessage("Недостаточно золота.");
    return;
  }

  const display = getMerchantItem(offer);
  const ok = characterStore.buyFromMerchant(offer);
  if (ok) {
    offer.isSold = true;
    saveOffersToStorage();
    showMessage(`${display?.name ?? "Предмет"} куплен за ${offer.price} золотых.`);
  } else {
    showMessage("Инвентарь заполнен.");
  }
}

function buyElixir(elixirId: string) {
  const res = elixirsStore.buyElixir(elixirId);
  if (!res.ok) {
    showMessage(res.reason ?? "Не удалось купить эликсир.");
    return;
  }
  const def = ELIXIRS.find((e) => e.id === elixirId);
  showMessage(`${def?.name ?? "Эликсир"} куплен.`);
}

const SLOT_ICON_FILES: Record<ItemSlot, string> = {
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
  resource: "trinket",
};

function getSlotIconSrc(slot: ItemSlot) {
  const file = SLOT_ICON_FILES[slot];
  return `/images/equipment/${file}.png`;
}

function saveOffersToStorage() {
  if (typeof window === "undefined") return;
  const state: MerchantOffersStorageState = {
    heroLevelAtGeneration: heroLevelAtGeneration.value,
    nextRefreshAt: nextRefreshAt.value,
    offers: merchantOffers.value,
  };
  window.localStorage.setItem(MERCHANT_OFFERS_STORAGE_KEY, JSON.stringify(state));
}

function scheduleAutoRefresh() {
  if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
  const delay = Math.max(0, nextRefreshAt.value - Date.now());
  autoRefreshTimer = setTimeout(() => {
    regenerateOffers();
  }, delay);
}

function regenerateOffers() {
  const heroLevel = playerProgress.level.value;
  heroLevelAtGeneration.value = heroLevel;
  merchantOffers.value = generateMerchantOffers(heroLevel, OFFER_COUNT);
  nextRefreshAt.value = Date.now() + AUTO_REFRESH_INTERVAL_MS;
  saveOffersToStorage();
  scheduleAutoRefresh();
}

function loadOrRegenerateOffers() {
  if (typeof window === "undefined") return;
  const currentHeroLevel = playerProgress.level.value;
  const now = Date.now();

  try {
    const raw = window.localStorage.getItem(MERCHANT_OFFERS_STORAGE_KEY);
    if (!raw) {
      regenerateOffers();
      return;
    }

    const parsed = JSON.parse(raw) as Partial<MerchantOffersStorageState>;
    const storedHeroLevel =
      typeof parsed.heroLevelAtGeneration === "number" ? parsed.heroLevelAtGeneration : -1;
    const storedNextRefreshAt =
      typeof parsed.nextRefreshAt === "number" ? parsed.nextRefreshAt : 0;
    const storedOffers = Array.isArray(parsed.offers) ? (parsed.offers as MerchantOffer[]) : [];

    if (
      storedHeroLevel !== currentHeroLevel ||
      storedOffers.length !== OFFER_COUNT ||
      storedNextRefreshAt <= now
    ) {
      regenerateOffers();
      return;
    }

    merchantOffers.value = storedOffers;
    heroLevelAtGeneration.value = storedHeroLevel;
    nextRefreshAt.value = storedNextRefreshAt;
  } catch {
    regenerateOffers();
  }
}

function refreshManually() {
  const currentGold = characterStore.gold ?? 0;
  if (currentGold < MANUAL_REFRESH_COST_GOLD) {
    showMessage("Недостаточно золота.");
    return;
  }

  characterStore.gold = currentGold - MANUAL_REFRESH_COST_GOLD;
  regenerateOffers();
  showMessage("Товары обновлены.");
}

function formatCountdownMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec >= 3600) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const nextRefreshLabel = computed(() => {
  if (!nextRefreshAt.value) return "";
  const left = nextRefreshAt.value - nowForCountdown.value;
  return `До обновления: ${formatCountdownMs(left)}`;
});

onMounted(() => {
  loadOrRegenerateOffers();
  // if (nextRefreshAt.value) scheduleAutoRefresh();
  // nowForCountdown.value = Date.now();
  // countdownIntervalId = setInterval(() => {
  //   nowForCountdown.value = Date.now();
  // }, 1000);
});

onUnmounted(() => {
  if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
  autoRefreshTimer = null;
  if (countdownIntervalId) clearInterval(countdownIntervalId);
  countdownIntervalId = null;
});
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
        width="24"
        height="24"
        decoding="async"
      />
      <span class="merchant-page__gold-value">{{ gold }}</span>
      <span class="merchant-page__gold-label">золотых</span>
    </div>

    <div
      class="merchant-page__toast"
      :class="{ 'merchant-page__toast--visible': !!message }"
      role="status"
      aria-live="polite"
    >
      {{ message || "\u00A0" }}
    </div>

    <div class="merchant-page__content">
      <section class="merchant-page__section merchant-page__section--inventory">
        <h2 class="merchant-page__section-title">Мой инвентарь</h2>
        <p class="merchant-page__section-hint">
          Выберите предмет и нажмите «Продать», чтобы получить золото.
        </p>
        <div class="merchant-page__inventory-body">
          <div v-if="selectedDisplayItem" class="merchant-page__sell-card merchant-page__inventory-panel--sell-equipment">
            <h3
              class="merchant-page__item-name"
              :style="{ color: rarityColor(selectedDisplayItem.rarity) }"
            >
              {{ selectedDisplayItem.name }}
            </h3>
            <div class="merchant-page__item-slot">
              {{ SLOT_NAMES[selectedDisplayItem.slot] }}
            </div>
            <div v-if="selectedDisplayItem.itemLevel != null" class="merchant-page__item-level">
              Ур. вещи: {{ selectedDisplayItem.itemLevel }}
            </div>
            <div class="merchant-page__item-stats">
              <div v-if="selectedDisplayItem.stats.hp != null" class="merchant-page__item-stat">
                HP: +{{ selectedDisplayItem.stats.hp }}
              </div>
              <div v-if="selectedDisplayItem.stats.power != null" class="merchant-page__item-stat">
                Атака: +{{ selectedDisplayItem.stats.power }}
              </div>
              <div v-if="selectedDisplayItem.stats.chanceCrit != null" class="merchant-page__item-stat">
                Крит: +{{ selectedDisplayItem.stats.chanceCrit }}
              </div>
              <div v-if="selectedDisplayItem.stats.evasion != null" class="merchant-page__item-stat">
                Уклонение: +{{ selectedDisplayItem.stats.evasion }}
              </div>
              <div v-if="selectedDisplayItem.stats.speed != null" class="merchant-page__item-stat">
                Скорость: +{{ selectedDisplayItem.stats.speed }}
              </div>
              <div v-if="selectedDisplayItem.stats.armor != null" class="merchant-page__item-stat">
                Броня: +{{ selectedDisplayItem.stats.armor }}
              </div>
              <div v-if="selectedDisplayItem.stats.accuracy != null" class="merchant-page__item-stat">
                Меткость: +{{ selectedDisplayItem.stats.accuracy }}
              </div>
              <div v-if="selectedDisplayItem.stats.critDefense != null" class="merchant-page__item-stat">
                Защита от крита: +{{ selectedDisplayItem.stats.critDefense }}
              </div>
              <div v-if="selectedDisplayItem.stats.lifesteal != null" class="merchant-page__item-stat">
                Самоисцеление: +{{ selectedDisplayItem.stats.lifesteal }}
              </div>
            </div>
            <div class="merchant-page__sell-price">
              <img
                src="/images/currencies/coin.png"
                alt="Золото"
                class="merchant-page__coin"
                width="18"
                height="18"
                decoding="async"
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
          <div class="merchant-page__inventory-panel--equipment-grid">
            <InventoryGrid
              :items="inventoryItems"
              :selected-index="selectedIndex"
              @select="selectSlot"
            />
          </div>
          <div v-if="selectedElixirDef" class="merchant-page__sell-card merchant-page__inventory-panel--sell-elixir">
            <h3 class="merchant-page__item-name">{{ selectedElixirDef.name }}</h3>
            <div class="merchant-page__elixir-description">{{ selectedElixirDescription }}</div>
            <div class="merchant-page__sell-price">
              <img
                src="/images/currencies/coin.png"
                alt="Золото"
                class="merchant-page__coin"
                width="18"
                height="18"
                decoding="async"
              />
              {{ selectedElixirSellPrice }} золотых
            </div>
            <div class="merchant-page__elixir-actions">
              <button
                type="button"
                class="merchant-page__btn merchant-page__btn--drink"
                @click="drinkSelectedElixir"
              >
                Выпить
              </button>
              <button
                type="button"
                class="merchant-page__btn merchant-page__btn--sell"
                @click="sellSelectedElixir"
              >
                Продать
              </button>
            </div>
          </div>
          <div class="merchant-page__inventory-panel--consumables">
            <h3 class="merchant-page__consumables-title">Зелья и эликсиры</h3>
            <ConsumablesGrid
              :items="consumableItems"
              :selected-index="selectedConsumableIndex"
              @select="selectConsumableSlot"
            />
          </div>
        </div>
      </section>

      <section class="merchant-page__section merchant-page__section--stock">
        <div class="merchant-page__tabs">
          <button
            type="button"
            class="merchant-page__tab-btn"
            :class="{ 'merchant-page__tab-btn--active': activeTab === 'equipment' }"
            @click="activeTab = 'equipment'"
          >
            Экипировка
          </button>
          <button
            type="button"
            class="merchant-page__tab-btn"
            :class="{ 'merchant-page__tab-btn--active': activeTab === 'consumables' }"
            @click="activeTab = 'consumables'"
          >
            Расходники
          </button>
        </div>

        <template v-if="activeTab === 'equipment'">
          <h2 class="merchant-page__section-title">Товары торговца</h2>
          <div class="merchant-page__stock-actions">
            <button
              type="button"
              class="merchant-page__btn merchant-page__btn--refresh"
              :disabled="gold < MANUAL_REFRESH_COST_GOLD"
              @click="refreshManually"
            >
              <span class="merchant-page__refresh-button-content">
                <svg
                  class="merchant-page__refresh-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-3.1-6.7" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
                <span class="merchant-page__refresh-cost">
                  <img
                    src="/images/currencies/coin.png"
                    alt="Золото"
                    class="merchant-page__coin merchant-page__refresh-coin"
                    width="18"
                    height="18"
                    decoding="async"
                  />
                  {{ MANUAL_REFRESH_COST_GOLD }}
                </span>
              </span>
            </button>
            <div v-if="nextRefreshLabel" class="merchant-page__refresh-label">{{ nextRefreshLabel }}</div>
          </div>
          <div class="merchant-page__stock-list">
            <div
              v-for="row in offersWithDisplay"
              :key="row.offer.id"
              class="merchant-page__offer"
              :title="getEquipmentOfferTooltip(row.offer)"
              :class="{ 'merchant-page__offer--expanded': expandedEquipmentOfferId === row.offer.id }"
            >
              <template v-if="row.displayItem">
                <div
                  class="merchant-page__offer-icon"
                  :style="{ color: rarityColor(row.displayItem.rarity) }"
                >
                  <img
                    :src="getSlotIconSrc(row.displayItem.slot)"
                    :alt="SLOT_NAMES[row.displayItem.slot]"
                    class="merchant-page__offer-icon-img"
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div class="merchant-page__offer-info">
                  <span
                    class="merchant-page__offer-name"
                    :style="{ color: rarityColor(row.displayItem.rarity) }"
                  >
                    {{ row.displayItem.name }}
                  </span>
                  <span class="merchant-page__offer-level">Ур. {{ row.displayItem.itemLevel ?? 1 }}</span>
                  <span class="merchant-page__offer-price">
                    <img
                      src="/images/currencies/coin.png"
                      alt="Золото"
                      class="merchant-page__coin"
                      width="18"
                      height="18"
                      decoding="async"
                    />
                    {{ row.offer.price }}
                  </span>
                </div>
                <button
                  type="button"
                  class="merchant-page__offer-expand"
                  @click="toggleEquipmentOffer(row.offer.id)"
                >
                  {{ expandedEquipmentOfferId === row.offer.id ? "Скрыть" : "Подробнее" }}
                </button>
                <button
                  type="button"
                  class="merchant-page__btn merchant-page__btn--buy"
                  :disabled="row.offer.isSold || gold < row.offer.price"
                  @click="buyItem(row.offer)"
                >
                  {{ row.offer.isSold ? "Куплено" : "Купить" }}
                </button>
                <div
                  v-if="expandedEquipmentOfferId === row.offer.id"
                  class="merchant-page__offer-accordion"
                >
                  <div class="merchant-page__offer-slot">
                    Слот: {{ SLOT_NAMES[row.displayItem.slot] }}
                  </div>
                  <div
                    v-for="line in getEquipmentOfferStatsLines(row.offer)"
                    :key="`${row.offer.id}-${line}`"
                    class="merchant-page__offer-stat"
                  >
                    {{ line }}
                  </div>
                  <button
                    type="button"
                    class="merchant-page__btn merchant-page__btn--buy merchant-page__btn--buy-accordion"
                    :disabled="row.offer.isSold || gold < row.offer.price"
                    @click="buyItem(row.offer)"
                  >
                    {{ row.offer.isSold ? "Куплено" : "Купить" }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </template>

        <template v-else>
          <h2 class="merchant-page__section-title">Эликсиры</h2>

          <div class="merchant-page__stock-list">
            <div
              v-for="elixir in ELIXIRS"
              :key="elixir.id"
              class="merchant-page__offer merchant-page__offer--elixir"
              :title="getElixirOfferTooltip(elixir)"
              :class="{ 'merchant-page__offer--expanded': expandedElixirId === elixir.id }"
            >
              <div class="merchant-page__offer-icon merchant-page__offer-icon--elixir">
                <img
                  :src="elixir.icon"
                  :alt="elixir.name"
                  class="merchant-page__offer-icon-img"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div class="merchant-page__offer-info">
                <span class="merchant-page__offer-name">{{ elixir.name }}</span>
                <span class="merchant-page__offer-price">
                  <img
                    src="/images/currencies/coin.png"
                    alt="Золото"
                    class="merchant-page__coin"
                    width="18"
                    height="18"
                    decoding="async"
                  />
                  {{ elixir.price }}
                </span>
              </div>
              <button
                type="button"
                class="merchant-page__offer-expand"
                @click="toggleElixirOffer(elixir.id)"
              >
                {{ expandedElixirId === elixir.id ? "Скрыть" : "Подробнее" }}
              </button>
              <button
                type="button"
                class="merchant-page__btn merchant-page__btn--buy"
                :disabled="gold < elixir.price"
                @click="buyElixir(elixir.id)"
              >
                Купить
              </button>
              <div
                v-if="expandedElixirId === elixir.id"
                class="merchant-page__offer-accordion"
              >
                <div
                  v-for="line in getElixirOfferDescriptionLines(elixir)"
                  :key="`${elixir.id}-${line}`"
                  class="merchant-page__offer-stat"
                >
                  {{ line }}
                </div>
                <button
                  type="button"
                  class="merchant-page__btn merchant-page__btn--buy merchant-page__btn--buy-accordion"
                  :disabled="gold < elixir.price"
                  @click="buyElixir(elixir.id)"
                >
                  Купить
                </button>
              </div>
            </div>
          </div>

          
        </template>
      </section>
    </div>
  </div>
</template>
