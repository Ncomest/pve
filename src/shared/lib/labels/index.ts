/**
 * Локализованные подписи для редкости (босс/предмет).
 */
export function rarityLabel(rarity: string): string {
  if (rarity === "rare") return "Редкий";
  if (rarity === "epic") return "Эпический";
  return "Обычный";
}

/**
 * Подписи слотов экипировки.
 */
export function slotLabel(slot: string): string {
  const labels: Record<string, string> = {
    weapon: "Оружие",
    helmet: "Шлем",
    chest: "Нагрудник",
    pants: "Штаны",
    boots: "Сапоги",
    belt: "Пояс",
    ring: "Кольцо",
    necklace: "Ожерелье",
  };
  return labels[slot] ?? slot;
}

/**
 * Подписи статов (броня, атака и т.д.).
 */
export function statLabel(key: string): string {
  const labels: Record<string, string> = {
    armor: "Броня",
    power: "Атака",
    chanceCrit: "Крит",
    evasion: "Уклонение",
    maxHp: "HP",
    speed: "Скорость",
  };
  return labels[key] ?? key;
}

/**
 * Форматирование значения стата для отображения (проценты для крита/уклонения).
 */
export function formatStatValue(key: string, value: number | undefined): string {
  if (value === undefined) return "—";
  if (key === "chanceCrit" || key === "evasion") {
    return `+${Math.round(value * 100)}%`;
  }
  return `+${value}`;
}
