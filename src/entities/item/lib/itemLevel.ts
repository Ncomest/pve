import type { ItemStats, ItemTemplate, ItemInstance, Item } from "@/entities/item/model";

/**
 * Множитель статов от уровня вещи.
 * Менять коэффициент 0.1 здесь, если нужно усилить/ослабить рост статов от уровня.
 * Формула: 1 + (itemLevel - 1) * 0.1 (например itemLevel 5 → 1.4).
 * См. docs/balance-items.md.
 */
export function getStatMultiplier(itemLevel: number): number {
  return 1 + (itemLevel - 1) * 0.1;
}

/**
 * Эффективные статы вещи: базовые статы шаблона × множитель уровня.
 * Для hp, power, speed, armor — округление. Для chanceCrit, evasion — очки (округлённые), перевод в % делается в store при подсчёте статов персонажа.
 */
export function getEffectiveStats(
  baseStats: ItemStats,
  itemLevel: number
): ItemStats {
  const mult = getStatMultiplier(itemLevel);
  const result: ItemStats = {};

  if (baseStats.hp != null) result.hp = Math.round(baseStats.hp * mult);
  if (baseStats.power != null) result.power = Math.round(baseStats.power * mult);
  if (baseStats.speed != null) result.speed = Math.round(baseStats.speed * mult);
  if (baseStats.armor != null) result.armor = Math.round(baseStats.armor * mult);

  if (baseStats.chanceCrit != null) {
    result.chanceCrit = Math.round(baseStats.chanceCrit * mult);
  }
  if (baseStats.evasion != null) {
    result.evasion = Math.round(baseStats.evasion * mult);
  }

  return result;
}

/**
 * По экземпляру и карте шаблонов возвращает «отображаемый» Item
 * (id = instanceId, name/slot/rarity из шаблона, stats — эффективные, itemLevel).
 */
export function getDisplayItem(
  instance: ItemInstance,
  getTemplate: (templateId: string) => ItemTemplate | null
): Item | null {
  const template = getTemplate(instance.templateId);
  if (!template) return null;

  const stats = getEffectiveStats(template.baseStats, instance.itemLevel);
  return {
    id: instance.instanceId,
    name: template.name,
    slot: template.slot,
    rarity: template.rarity,
    stats,
    itemLevel: instance.itemLevel,
  };
}
