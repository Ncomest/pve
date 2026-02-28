import type { Item } from "@/entities/item/model";

/** Цена продажи предмета торговцу (золотые монеты) по редкости */
const SELL_PRICE_BY_RARITY: Record<Item["rarity"], number> = {
  common: 15,
  rare: 45,
  epic: 120,
  legendary: 300,
};

/**
 * Возвращает сумму в золотых монетах, которую даст торговец за предмет.
 */
export function getItemSellPrice(item: Item): number {
  return SELL_PRICE_BY_RARITY[item.rarity] ?? SELL_PRICE_BY_RARITY.common;
}
