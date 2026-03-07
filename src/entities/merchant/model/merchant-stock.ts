import type { Item } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { getDisplayItem } from "@/entities/item/model";
import { createItemInstance } from "@/entities/item/lib/createInstance";

export interface MerchantOffer {
  itemId: string; // templateId
  price: number; // золотые монеты
}

/** Товары торговца: 5 позиций с фиксированными ценами (шаблоны из items-db). */
export const MERCHANT_STOCK: MerchantOffer[] = [
  { itemId: "weapon-2", price: 80 },
  { itemId: "shield-2", price: 65 },
  { itemId: "ring-2", price: 55 },
  { itemId: "belt-2", price: 50 },
  { itemId: "earring-2", price: 70 },
];

/** Возвращает отображаемый вид товара (уровень 1) для витрины. */
export function getMerchantItem(offer: MerchantOffer): Item | null {
  const template = getTemplate(offer.itemId);
  if (!template) return null;
  const instance = createItemInstance(offer.itemId, 1);
  return getDisplayItem(instance, getTemplate);
}
