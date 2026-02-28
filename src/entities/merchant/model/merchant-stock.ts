import type { Item } from "@/entities/item/model";
import { ITEMS_DB } from "@/entities/item/items-db";

export interface MerchantOffer {
  itemId: string;
  price: number; // золотые монеты
}

/** Товары торговца: 5 позиций с фиксированными ценами */
export const MERCHANT_STOCK: MerchantOffer[] = [
  { itemId: "weapon-iron-sword", price: 80 },
  { itemId: "shield-iron", price: 65 },
  { itemId: "ring-silver", price: 55 },
  { itemId: "belt-iron", price: 50 },
  { itemId: "earring-silver", price: 70 },
];

export function getMerchantItem(offer: MerchantOffer): Item | null {
  return ITEMS_DB[offer.itemId] ?? null;
}
