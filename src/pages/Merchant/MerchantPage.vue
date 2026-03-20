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
import ConsumablesGrid from "@/features/inventory/ui/ConsumablesGrid.vue";
import { ELIXIRS, getElixirDefinition } from "@/features/elixirs/model/elixirs";
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import "./MerchantPage.scss";

const characterStore = useCharacterStore();
const elixirsStore = useElixirsStore();
const selectedIndex = ref<number | null>(null);
const message = ref<string | null>(null);
let messageTimer: ReturnType<typeof setTimeout> | null = null;

type MerchantTab = "equipment" | "consumables";
const activeTab = ref<MerchantTab>("equipment");

const gold = computed(() => characterStore.gold ?? 0);
const inventoryItems = computed(() => characterStore.inventoryItems);
const consumableItems = computed(() => characterStore.consumableItems);

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
  return displayItem ? getItemSellPrice(displayItem) : 0;
});

const selectedElixirDescription = computed(() => {
  const def = selectedElixirDef.value;
  if (!def) return "";
  const base = `Бафф: 5 минут.\nНе стакается: выпивание сбивает предыдущий.`;
  switch (def.kind) {
    case "heal_flat":
      return `Восстанавливает 200 HP мгновенно.\n${base}`;
    case "regen_elixir":
      return `Восстановление вне боя: 1 → 4 HP каждые 10с (плюс 3 HP/10с).\n${base}`;
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
  if (item.stats.chanceCrit != null) lines.push(`Крит: +${item.stats.chanceCrit} крита`);
  if (item.stats.evasion != null) lines.push(`Уклонение: +${item.stats.evasion} уклонения`);
  if (item.stats.speed != null) lines.push(`Скорость: +${item.stats.speed}`);
  if (item.stats.armor != null) lines.push(`Броня: +${item.stats.armor}`);
  lines.push(`Цена торговца: ${offer.price} зол.`);
  return lines.join("\n");
}

function getElixirOfferTooltip(elixir: (typeof ELIXIRS)[number]): string {
  const base = `Цена торговца: ${elixir.price} зол.\n`;
  const def = elixir;
  const lines: string[] = [];
  lines.push(base.trimEnd());
  switch (def.kind) {
    case "heal_flat":
      lines.push("Восстанавливает 200 HP мгновенно.");
      break;
    case "regen_elixir":
      lines.push("Реген вне боя: 1 → 4 HP/10с (плюс 3 HP/10с).");
      break;
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
  lines.push("Бафф: 5 минут. Не стакается.");
  return lines.join("\n");
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

function buyElixir(elixirId: string) {
  const res = elixirsStore.buyElixir(elixirId);
  if (!res.ok) {
    showMessage(res.reason ?? "Не удалось купить эликсир.");
    return;
  }
  const def = ELIXIRS.find((e) => e.id === elixirId);
  showMessage(`${def?.name ?? "Эликсир"} куплен.`);
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
          <div class="merchant-page__inventory-left">
            <InventoryGrid
              :items="inventoryItems"
              :selected-index="selectedIndex"
              @select="selectSlot"
            />
            <h3 class="merchant-page__consumables-title">Зелья и эликсиры</h3>
            <ConsumablesGrid
              :items="consumableItems"
              :selected-index="selectedConsumableIndex"
              @select="selectConsumableSlot"
            />
          </div>
          <div v-if="selectedDisplayItem" class="merchant-page__sell-card">
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
          <div v-else-if="selectedElixirDef" class="merchant-page__sell-card">
            <h3 class="merchant-page__item-name">{{ selectedElixirDef.name }}</h3>
            <div class="merchant-page__elixir-description">{{ selectedElixirDescription }}</div>
            <div class="merchant-page__sell-price">
              <img
                src="/images/currencies/coin.png"
                alt="Золото"
                class="merchant-page__coin"
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
          <div class="merchant-page__stock-list">
            <div
              v-for="offer in MERCHANT_STOCK"
              :key="offer.itemId"
              class="merchant-page__offer"
              :title="getEquipmentOfferTooltip(offer)"
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
        </template>

        <template v-else>
          <h2 class="merchant-page__section-title">Эликсиры</h2>

          <div class="merchant-page__stock-list">
            <div
              v-for="elixir in ELIXIRS"
              :key="elixir.id"
              class="merchant-page__offer merchant-page__offer--elixir"
              :title="getElixirOfferTooltip(elixir)"
            >
              <div class="merchant-page__offer-icon merchant-page__offer-icon--elixir">
                <img :src="elixir.icon" :alt="elixir.name" class="merchant-page__offer-icon-img" />
              </div>
              <div class="merchant-page__offer-info">
                <span class="merchant-page__offer-name">{{ elixir.name }}</span>
                <span class="merchant-page__offer-price">
                  <img src="/images/currencies/coin.png" alt="Золото" class="merchant-page__coin" />
                  {{ elixir.price }}
                </span>
              </div>
              <button
                type="button"
                class="merchant-page__btn merchant-page__btn--buy"
                :disabled="gold < elixir.price"
                @click="buyElixir(elixir.id)"
              >
                Купить
              </button>
            </div>
          </div>

          
        </template>
      </section>
    </div>
  </div>
</template>
