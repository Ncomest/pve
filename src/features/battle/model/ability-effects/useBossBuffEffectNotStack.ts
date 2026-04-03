import { BossAbility } from "@/entities/boss/model";
import { ActiveEffect } from "@/shared/lib/effects/types";
import { onUnmounted, Ref } from "vue";

export const useBossBuffEffectNotStack = (
  ability: BossAbility,
  bossBuffs: Ref<ActiveEffect[]>,
  pushLog: (text: string) => void,
  isBattleOver: Ref<boolean>,
) => {
  const bossBuffTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  const clearBuffFromBoss = (abilityId: string) => {
    const timeoutId = bossBuffTimeouts.get(abilityId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      bossBuffTimeouts.delete(abilityId);
    }

    if (isBattleOver.value) {
      clearAllBossBuffs();
      return;
    }

    // Удаляем бафф из массива
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== abilityId);
  };

  const clearAllBossBuffs = () => {
    // 1. Очищаем все таймауты из Map и сам Map
    // TODO: откуда идет timeoutId?
    bossBuffTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    bossBuffTimeouts.clear();

    // 2. Очищаем массив баффов/дебаффов на боссе
    bossBuffs.value = [];
  };

  if (!ability.selfBuffDurationMs) return;

  const durationMs = ability.selfBuffDurationMs ?? 10000;
  const endTime = Date.now() + durationMs;

  // Отменяем предыдущий таймаут и удаляем старую запись баффа
  clearBuffFromBoss(ability.id);

  // Добавляем новый бафф в массив
  bossBuffs.value = [
    ...bossBuffs.value,
    {
      id: ability.id,
      name: ability.name,
      icon: ability.icon ?? "IconPowerBoost",
      durationSeconds: durationMs / 1000,
      endTime,
      dispellable: ability.buffRequiresDispellable ?? true,
    },
  ];

  const timeoutId = window.setTimeout(() => {
    clearBuffFromBoss(ability.id);
  }, durationMs);
  bossBuffTimeouts.set(ability.id, timeoutId);

  // Сохраняем идентификатор таймаута
  bossBuffTimeouts.set(ability.id, timeoutId);

  pushLog(`${ability.name}: ${ability.description} на ${durationMs / 1000}с.`);

  onUnmounted(() => {
    clearBuffFromBoss(ability.id);
  });
};
