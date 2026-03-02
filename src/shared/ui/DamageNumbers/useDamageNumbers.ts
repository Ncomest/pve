import { ref } from "vue";

export type DamageNumberType = "damage" | "player-damage" | "dodge" | "heal";

export interface DamageNumber {
  id: number;
  value: number | string;
  type: DamageNumberType;
  isCrit?: boolean;
}

let _nextId = 0;

export function useDamageNumbers() {
  const numbers = ref<DamageNumber[]>([]);

  const spawnNumber = (value: number | string, type: DamageNumberType, isCrit = false) => {
    const id = _nextId++;
    numbers.value = [...numbers.value, { id, value, type, isCrit }];
    // Удаляем после завершения анимации (1.2с)
    setTimeout(() => {
      numbers.value = numbers.value.filter((n) => n.id !== id);
    }, 1200);
  };

  return { numbers, spawnNumber };
}
