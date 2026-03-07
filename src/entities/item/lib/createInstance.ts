import type { ItemInstance } from "@/entities/item/model";

/** Генерирует уникальный id экземпляра вещи. */
export function generateInstanceId(): string {
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Создаёт экземпляр вещи по шаблону и уровню.
 */
export function createItemInstance(
  templateId: string,
  itemLevel: number,
  instanceId?: string
): ItemInstance {
  return {
    instanceId: instanceId ?? generateInstanceId(),
    templateId,
    itemLevel,
  };
}
