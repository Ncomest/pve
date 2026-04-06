import type { ItemInstance, ItemStats } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import {
  generateBaseStatsForRarity,
  rollItemRarity,
} from "@/entities/item/lib/itemGeneration";

/** Генерирует уникальный id экземпляра вещи. */
export function generateInstanceId(): string {
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Создаёт экземпляр вещи по шаблону и уровню.
 * Экипировка: случайная редкость и процедурные статы; эликсиры/ресурсы — без генерации.
 */
export function createItemInstance(
  templateId: string,
  itemLevel: number,
  instanceId?: string,
): ItemInstance {
  const template = getTemplate(templateId);
  if (!template) {
    return {
      instanceId: instanceId ?? generateInstanceId(),
      templateId,
      itemLevel,
    };
  }

  if (templateId.startsWith("elixir-")) {
    // const rolls = rollStatsForTemplate(templateId);
    return {
      instanceId: instanceId ?? generateInstanceId(),
      templateId,
      itemLevel,
      // rolls,
    };
  }

  if (template.slot === "resource") {
    return {
      instanceId: instanceId ?? generateInstanceId(),
      templateId,
      itemLevel,
      count: 1,
    };
  }

  const rarity = rollItemRarity();
  const generatedBaseStats = generateBaseStatsForRarity(rarity);

  // ========== СРОЧНАЯ ОТЛАДКА ==========
  console.log("═══════════════════════════════════════");
  console.log("🔍 createItemInstance ОТЛАДКА:");
  console.log("  templateId:", templateId);
  console.log("  itemLevel:", itemLevel);
  console.log("  rarity:", rarity);
  console.log(
    "  generatedBaseStats ВСЕ:",
    JSON.stringify(generatedBaseStats, null, 2),
  );
  console.log("  generatedBaseStats.accuracy:", generatedBaseStats.accuracy);
  console.log(
    "  generatedBaseStats.chanceCrit:",
    generatedBaseStats.chanceCrit,
  );
  console.log("═══════════════════════════════════════");
  // =====================================

  return {
    instanceId: instanceId ?? generateInstanceId(),
    templateId,
    itemLevel,
    rarityOverride: rarity,
    generatedBaseStats,
  };
}

/** Диапазоны роллов (множители) для статов: min/max применяются к base * level. */
// const STAT_ROLL_RANGES: Partial<Record<keyof ItemStats, { min: number; max: number }>> = {
//   hp: { min: 0.8, max: 1.2 },
//   power: { min: 0.8, max: 1.2 },
//   speed: { min: 0.8, max: 1.2 },
//   armor: { min: 0.4, max: 1.2 }, // пример: при базе 50 это примерно 20–60
//   chanceCrit: { min: 0.8, max: 1.2 },
//   evasion: { min: 0.8, max: 1.2 },
// };

// function rollStatsForTemplate(templateId: string): ItemInstance["rolls"] | undefined {
//   const template = getTemplate(templateId);
//   if (!template) return undefined;

//   const rolls: ItemInstance["rolls"] = {};
//   const baseStats = template.baseStats;

//   for (const key of Object.keys(baseStats) as (keyof ItemStats)[]) {
//     const range = STAT_ROLL_RANGES[key];
//     if (!range) continue;
//     const factor = range.min + Math.random() * (range.max - range.min);
//     rolls[key] = factor;
//   }

//   return Object.keys(rolls).length > 0 ? rolls : undefined;
// }
