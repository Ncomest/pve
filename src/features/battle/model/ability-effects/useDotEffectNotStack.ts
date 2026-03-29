import { BossAbility } from "@/entities/boss/model";
import { ActiveEffect } from "@/shared/lib/effects/types";
import { DamageNumberType } from "@/shared/ui/DamageNumbers/useDamageNumbers";
import { onUnmounted, type Ref } from "vue";
import { BattleLogEntryType } from "../useBattle";

export const useDotEffectNotStack = (
  ability: BossAbility,
  playerDebuffs: Ref<ActiveEffect[]>,
  isBattleOver: Ref<boolean>,
  applyDamageFromBoss: (damage: number) => void,
  spawnPlayerDmg: (
    value: number | string,
    type: DamageNumberType,
    isCrit?: boolean,
  ) => void,
  pushLog: (text: string, type: BattleLogEntryType) => void,
) => {
  const playerDebuffDotTimers = new Map<
    string,
    {
      timeout?: ReturnType<typeof setTimeout>;
      interval?: ReturnType<typeof setInterval>;
    }
  >();

  const clearPlayerDebuffTimeout = (abilityId: string) => {
    const timer = playerDebuffDotTimers.get(abilityId);
    if (timer !== undefined) {
      if (timer.timeout !== undefined) {
        clearTimeout(timer.timeout);
      }
      if (timer.interval !== undefined) {
        clearInterval(timer.interval);
      }
      playerDebuffDotTimers.delete(abilityId);
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== abilityId);
  };

  const dotEffectNotStack = () => {
    const durationMs = ability.dotDurationMs ?? 10000;
    const tickMs = ability.dotTickIntervalMs ?? 2000;
    const damagePerTick = ability.dotDamagePerTick ?? 10;
    const endTime = Date.now() + durationMs;

    clearPlayerDebuffTimeout(ability.id);

    playerDebuffs.value = [
      ...playerDebuffs.value.filter((e) => e.id !== ability.id),
      {
        id: ability.id,
        name: ability.name,
        icon: ability.icon ?? "IconBleed",
        durationSeconds: durationMs / 1000,
        endTime,
        debuffType: "curse",
      },
    ];

    const timeoutId = window.setTimeout(() => {
      clearPlayerDebuffTimeout(ability.id);
    }, durationMs);

    const intervalId = window.setInterval(() => {
      if (isBattleOver.value) {
        clearPlayerDebuffTimeout(ability.id);
        return;
      }
      const debuffActive = playerDebuffs.value.some((e) => e.id === ability.id);

      if (!debuffActive || Date.now() >= endTime) {
        clearPlayerDebuffTimeout(ability.id);
        return;
      }

      applyDamageFromBoss(damagePerTick);
      spawnPlayerDmg(damagePerTick, "player-damage");

      pushLog(
        `Переодический урон (${ability.name}): −${damagePerTick} HP у героя.`,
        "boss-damage",
      );
    }, tickMs);

    playerDebuffDotTimers.set(ability.id, {
      timeout: timeoutId,
      interval: intervalId,
    });
  };

  onUnmounted(() => {
    for (const [abilityId] of playerDebuffDotTimers) {
      clearPlayerDebuffTimeout(abilityId);
    }
  });

  return {
    clearPlayerDebuffTimeout,
    dotEffectNotStack,
    playerDebuffDotTimers,
  };
};
