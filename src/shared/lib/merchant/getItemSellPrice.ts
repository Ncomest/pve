import type { Item } from "@/entities/item/model";

/** Базовая цена продажи по редкости (для вещи уровня 1). */
const SELL_PRICE_BY_RARITY: Record<Item["rarity"], number> = {
  common: 15,
  rare: 45,
  epic: 120,
  legendary: 300,
};

/**
 * Возвращает сумму в золотых монетах, которую даст торговец за предмет.
 * Учитывает редкость и уровень вещи (чем выше itemLevel, тем выше цена).
 */
export function getItemSellPrice(item: Item): number {
  const base = SELL_PRICE_BY_RARITY[item.rarity] ?? SELL_PRICE_BY_RARITY.common;
  const level = item.itemLevel ?? 1;
  const factor = 1 + (level - 1) * 0.2;
  return Math.max(1, Math.round(base * factor));
}
