import type { Ability, AbilityRole } from "@/features/abilities/model/types";

export function abilityTypeLabel(type: Ability["type"]): string {
  const map: Record<Ability["type"], string> = {
    damage: "Урон",
    heal: "Лечение",
    buff: "Усиление",
  };
  return map[type];
}

export function abilityRoleLabel(role: AbilityRole | undefined): string {
  if (!role) return "";
  const map: Record<AbilityRole, string> = {
    generator: "Генератор",
    finisher: "Финишер",
    defense: "Защита",
    control: "Контроль",
    mobility: "Мобильность",
  };
  return map[role];
}

export function comboText(ability: Ability): string {
  if (ability.comboGain !== undefined) return `+${ability.comboGain} комбо`;
  if (ability.comboCostMin !== undefined && ability.comboCostMax !== undefined)
    return `${ability.comboCostMin}–${ability.comboCostMax} комбо`;
  return "";
}
