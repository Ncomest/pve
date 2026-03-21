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
  generatedOverride?: ItemStats,
): ItemStats {
  const source = generatedOverride && Object.keys(generatedOverride).length > 0 ? generatedOverride : baseStats;
  const mult = getStatMultiplier(itemLevel);
  const result: ItemStats = {};

  if (source.hp != null) {
    const base = source.hp * mult;
    const factor = rolls?.hp ?? 1;
    result.hp = Math.round(base * factor);
  }
  if (source.power != null) {
    const base = source.power * mult;
    const factor = rolls?.power ?? 1;
    result.power = Math.round(base * factor);
  }
  if (source.speed != null) {
    const base = source.speed * mult;
    const factor = rolls?.speed ?? 1;
    result.speed = Math.round(base * factor);
  }
  if (source.armor != null) {
    const base = source.armor * mult;
    const factor = rolls?.armor ?? 1;
    result.armor = Math.round(base * factor);
  }

  if (source.chanceCrit != null) {
    const base = source.chanceCrit * mult;
    const factor = rolls?.chanceCrit ?? 1;
    result.chanceCrit = Math.round(base * factor);
  }
  if (source.evasion != null) {
    const base = source.evasion * mult;
    const factor = rolls?.evasion ?? 1;
    result.evasion = Math.round(base * factor);
  }
  if (source.accuracy != null) {
    const base = source.accuracy * mult;
    const factor = rolls?.accuracy ?? 1;
    result.accuracy = Math.round(base * factor);
  }
  if (source.critDefense != null) {
    const base = source.critDefense * mult;
    const factor = rolls?.critDefense ?? 1;
    result.critDefense = Math.round(base * factor);
  }
  if (source.spirit != null) {
    const base = source.spirit * mult;
    const factor = rolls?.spirit ?? 1;
    result.spirit = Math.round(base * factor);
  }
  if (source.lifesteal != null) {
    const base = source.lifesteal * mult;
    const factor = rolls?.lifesteal ?? 1;
    result.lifesteal = Math.round(base * factor);
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

  const stats = getEffectiveStats(
    template.baseStats,
    instance.itemLevel,
    instance.rolls,
    instance.generatedBaseStats,
  );
  return {
    id: instance.instanceId,
    name: template.name,
    slot: template.slot,
    rarity: instance.rarityOverride ?? template.rarity,
    stats,
    itemLevel: instance.itemLevel,
  };
}
