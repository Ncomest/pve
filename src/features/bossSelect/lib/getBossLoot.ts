import type { Boss, LootItem } from "@/entities/boss/model";

/**
 * Возвращает массив предметов лута босса по карте всех предметов.
 */
export function getBossLootItems(boss: Boss, lootMap: Map<string, LootItem>): LootItem[] {
  return boss.loot.map((id) => lootMap.get(id)).filter(Boolean) as LootItem[];
}
