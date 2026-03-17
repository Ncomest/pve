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
 * Эффективные статы вещи: базовые статы шаблона × множитель уровня × индивидуальный ролл.
 * Для hp, power, speed, armor — округление. Для chanceCrit, evasion — очки (округлённые),
 * перевод в % делается в store при подсчёте статов персонажа.
 *
 * rolls — объект с множителями (например, 0.8–1.2) для конкретного экземпляра вещи.
 */
export function getEffectiveStats(
  baseStats: ItemStats,
  itemLevel: number,
  rolls?: ItemInstance["rolls"],
): ItemStats {
  const mult = getStatMultiplier(itemLevel);
  const result: ItemStats = {};

  if (baseStats.hp != null) {
    const base = baseStats.hp * mult;
    const factor = rolls?.hp ?? 1;
    result.hp = Math.round(base * factor);
  }
  if (baseStats.power != null) {
    const base = baseStats.power * mult;
    const factor = rolls?.power ?? 1;
    result.power = Math.round(base * factor);
  }
  if (baseStats.speed != null) {
    const base = baseStats.speed * mult;
    const factor = rolls?.speed ?? 1;
    result.speed = Math.round(base * factor);
  }
  if (baseStats.armor != null) {
    const base = baseStats.armor * mult;
    const factor = rolls?.armor ?? 1;
    result.armor = Math.round(base * factor);
  }

  if (baseStats.chanceCrit != null) {
    const base = baseStats.chanceCrit * mult;
    const factor = rolls?.chanceCrit ?? 1;
    result.chanceCrit = Math.round(base * factor);
  }
  if (baseStats.evasion != null) {
    const base = baseStats.evasion * mult;
    const factor = rolls?.evasion ?? 1;
    result.evasion = Math.round(base * factor);
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

  const stats = getEffectiveStats(template.baseStats, instance.itemLevel, instance.rolls);
  return {
    id: instance.instanceId,
    name: template.name,
    slot: template.slot,
    rarity: template.rarity,
    stats,
    itemLevel: instance.itemLevel,
  };
}
