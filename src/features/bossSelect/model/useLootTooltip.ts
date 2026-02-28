import { ref } from "vue";
import type { LootItem } from "@/entities/boss/model";

export function useLootTooltip() {
  const hoveredLoot = ref<{ item: LootItem; x: number; y: number } | null>(null);

  const showLootTooltip = (e: MouseEvent, item: LootItem) => {
    hoveredLoot.value = { item, x: e.clientX, y: e.clientY };
  };

  const moveLootTooltip = (e: MouseEvent) => {
    if (hoveredLoot.value) {
      hoveredLoot.value = { ...hoveredLoot.value, x: e.clientX, y: e.clientY };
    }
  };

  const hideLootTooltip = () => {
    hoveredLoot.value = null;
  };

  return { hoveredLoot, showLootTooltip, moveLootTooltip, hideLootTooltip };
}
