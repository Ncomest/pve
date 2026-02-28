import { computed } from "vue";
import type { LootItem } from "@/entities/boss/model";
import lootData from "@/entities/loot/loot.json";

const allLoot = lootData as LootItem[];

export function useBossLoot() {
  const lootMap = computed<Map<string, LootItem>>(() => {
    const map = new Map<string, LootItem>();
    allLoot.forEach((item) => map.set(item.id, item));
    return map;
  });

  return { lootMap };
}
