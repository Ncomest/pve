import { SPIRIT_ELIXIR_BONUS_POINTS, type ElixirDefinition } from "@/features/elixirs/model/elixirs";

export function getElixirDescription(def: ElixirDefinition): string {
  const durationMinutes = Math.max(1, Math.round(def.durationMs / 60_000));
  const base = `Бафф: ${durationMinutes} минут.\nНе стакается: выпивание сбивает предыдущий.`;

  switch (def.kind) {
    case "heal_flat":
      return `Восстанавливает 200 HP мгновенно.\nАктивные эликсиры/баффы не сбиваются.`;
    case "spirit_elixir": {
      const bonus = def.spiritBonus ?? SPIRIT_ELIXIR_BONUS_POINTS;
      return `Временно +${bonus} к духу (сильнее восстановление HP вне боя по формуле духа).\n${base}`;
    }
    case "power":
      return `Увеличивает атаку: +${def.powerDelta ?? 5}.\n${base}`;
    case "armor_percent":
      return `Увеличивает броню: +${Math.round((def.armorPercentBonus ?? 0) * 100)}%.\n${base}`;
    case "crit_percent":
      return `Увеличивает крит: +${Math.round((def.critPercentBonus ?? 0) * 100)}%.\n${base}`;
    case "speed_percent":
      return `Увеличивает скорость: +${Math.round((def.speedPercentBonus ?? 0) * 100)}%.\n${base}`;
    case "health_percent":
      return `Увеличивает максимальное здоровье: +15% к текущему HP (увеличивает maxHp).\n${base}`;
    case "evasion_percent":
      return `Увеличивает уклонение: +${Math.round((def.evasionPercentBonus ?? 0) * 100)}%.\n${base}`;
    default:
      return base;
  }
}

