import type { Item, ItemInstance } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { getDisplayItem } from "@/entities/item/model";
import { createItemInstance } from "@/entities/item/lib/createInstance";
import { ALL_TEMPLATE_IDS } from "@/entities/item/items-db";
import { getItemSellPrice } from "@/shared/lib/merchant/getItemSellPrice";

export interface MerchantOffer {
  id: string;
  itemInstance: ItemInstance;
  price: number;
  isSold: boolean;
}

/** Возвращает отображаемый вид товара (эффективные статы + itemLevel). */
export function getMerchantItem(offer: MerchantOffer): Item | null {
  return getDisplayItem(offer.itemInstance, getTemplate);
}

function pickUniqueTemplateIds(count: number): string[] {
  const pool = [...ALL_TEMPLATE_IDS];
  const out: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

/**
 * Генерирует витрину торговца под уровень героя.
 * Уровень вещи торговца совпадает с механикой дропа с босса: `1 + bossLevel * 3`,
 * где bossLevel условно = heroLevel.
 */
export function generateMerchantOffers(heroLevel: number, count: number): MerchantOffer[] {
  const itemLevel = 1 + heroLevel * 3;
  const templateIds = pickUniqueTemplateIds(count);

  return templateIds.map((templateId) => {
    const itemInstance = createItemInstance(templateId, itemLevel);
    const displayItem = getDisplayItem(itemInstance, getTemplate);
    const price = displayItem ? getItemSellPrice(displayItem) * 3 : 0;

    return {
      id: itemInstance.instanceId,
      itemInstance,
      price,
      isSold: false,
    };
  });
}

// Держим экспорт MERCHANT_STOCK только чтобы не сломать импорты в других местах.
// В актуальной логике используется generateMerchantOffers + локальное состояние витрины.
export const MERCHANT_STOCK: MerchantOffer[] = [];
